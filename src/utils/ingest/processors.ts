import axios from 'axios'
import sub from 'date-fns/sub'

import { TimeSeriesAggregationType, TimeSeriesDuplicatePolicies } from 'redis'

import { isAxiosError } from '../api'

import redis from '@/redis/client'
import story from '@/redis/om/story'

interface HackerNewsStoryData {
  by?: string
  deleted?: boolean
  descendants?: number
  score?: number
  text?: string
  time: number
  title?: string
  url?: string
}

const HN_API_ENDPOINTS = {
    NEW_STORIES: 'https://hacker-news.firebaseio.com/v0/newstories.json',
    STORY_BY_ID: 'https://hacker-news.firebaseio.com/v0/item/{id}.json'
  },
  HN_SOURCE_DOMAIN = 'news.ycombinator.com',
  HN_STORY_URL = 'https://news.ycombinator.com/item?id={id}'

// TODO: abstract when additional data sources are introduced
// as of 20220814, HN API returns 500 newest story IDs
// benchmark: 250ms
export const processHNNewStoriesIngestData = async (max?: number) => {
  try {
    // get newest story IDs from HN API and trim to max
    const newStoriesById = (
        await axios.get<string[]>(HN_API_ENDPOINTS.NEW_STORIES)
      ).data,
      newStoriesByIdTrimmedToMax = [
        ...newStoriesById.slice(0, max || newStoriesById.length)
      ],
      newStoriesToSaveToDb: string[] = []

    const { client: redisClient } = await redis(),
      { repository: storyRepository, closeRepository: closeStoryRepository } =
        await story()

    // check if any stories exist in the db
    const existingStoriesById = await redisClient.json.mGet(
      newStoriesByIdTrimmedToMax.map((id) => `Story:${id}`),
      '$.id'
    )

    // if stories exists, filter from new stories to save to db
    existingStoriesById.map((foundId, index) => {
      if (!foundId) newStoriesToSaveToDb.push(newStoriesByIdTrimmedToMax[index])
    })

    // save new stories to db
    await Promise.all(
      newStoriesToSaveToDb.map(async (id) => {
        try {
          // get story data and story objects
          const [
            { by, descendants: comment_total, score, text, time, title, url },
            newStory
          ] = await Promise.all([
            (
              await axios.get<HackerNewsStoryData>(
                HN_API_ENDPOINTS.STORY_BY_ID.replace('{id}', id)
              )
            ).data,
            await storyRepository.fetch(id)
          ])

          // map data to object
          newStory.id = id
          newStory.domain = url ? new URL(url).hostname : HN_SOURCE_DOMAIN
          newStory.poster = by ?? null
          newStory.score = score ?? null
          newStory.source = HN_SOURCE_DOMAIN
          newStory.text = text ?? null
          newStory.title = title ?? null
          newStory.comment_total = comment_total ?? null
          newStory.url = url ?? null
          newStory.created = time

          // save
          await storyRepository.save(newStory)
        } catch (error) {
          console.error(error)

          throw (error as Error).message
        }
      })
    )

    await closeStoryRepository()
    await redisClient.disconnect()

    const totalNewStoriesSavedToDb = newStoriesToSaveToDb.length

    // DONE!
    console.info(`Saved ${totalNewStoriesSavedToDb} new stories to DB...`)

    return { success: true, data: { total: totalNewStoriesSavedToDb } }
  } catch (error) {
    console.error(error)

    throw isAxiosError(error) ? error.message : (error as Error).message
  }
}

// 5 min interval = 6000 requests an hour to HN API
// TODO: determine story activity decay/falloff
// e.g. consider a story 'dead' if activity hasn't changed over a
// period of time; get service call interval closer to <=1min
// benchmark: ~5s
export const processHNStoryActivityIngestData = async () => {
  // date used for time series story activity sample
  const now = Date.now()

  try {
    const { client: redisClient } = await redis(),
      { repository: storyRepository, closeRepository: closeStoryRepository } =
        await story()

    // find stories created within temporal ingest threshold
    const storySearch = await storyRepository
        .search()
        .where('created')
        .onOrAfter(sub(now, { minutes: 1440 })),
      stories = await storySearch.return.all()

    let totalStoriesUpdatedWithLatestScore = 0,
      totalStoriesUpdatedWithLatestCommentTotal = 0

    // https://redis.io/docs/manual/transactions/
    const ingestStoryActivityTSTransaction = redisClient.multi()

    // update stories to latest score and total comments
    // and add time series commands to ingest transaction
    await Promise.all(
      stories.map(async (story) => {
        try {
          const {
            deleted,
            score: latestStoryScore,
            descendants: latestStoryCommentTotal
          } = (
            await axios.get<HackerNewsStoryData>(
              HN_API_ENDPOINTS.STORY_BY_ID.replace('{id}', story.id)
            )
          ).data

          if (deleted) {
            story.deleted = true
            return
          }

          // update story with new score and comment total
          // if this fails, ts data will not ingest
          if (latestStoryScore && latestStoryCommentTotal) {
            if (
              story.score !== latestStoryScore ||
              story.comment_total !== latestStoryCommentTotal
            ) {
              if (story.score !== latestStoryScore) {
                story.score = latestStoryScore
                totalStoriesUpdatedWithLatestScore++
              }

              if (story.comment_total !== latestStoryCommentTotal) {
                story.comment_total = latestStoryCommentTotal
                totalStoriesUpdatedWithLatestCommentTotal++
              }

              await storyRepository.save(story)
            }

            // add time series commands to time series ingest transaction
            // https://redis.io/docs/stack/timeseries/quickstart/
            // https://youtu.be/9JeAu--liMk?t=1737
            const storyActivityKey = `Story:${story.id}:_activity`,
              storyActivityTSBaseOptions = {
                DUPLICATE_POLICY: TimeSeriesDuplicatePolicies.MAX,
                LABELS: {
                  domain: story.domain || HN_SOURCE_DOMAIN,
                  poster: story.poster || 'unknown',
                  url: story.url || HN_STORY_URL.replace('{id}', story.id)
                }
              }

            // redis will skip commands if key already exists
            ingestStoryActivityTSTransaction.ts
              // will create score activity time series
              .create(`${storyActivityKey}:score`, {
                DUPLICATE_POLICY: storyActivityTSBaseOptions.DUPLICATE_POLICY,
                LABELS: {
                  ...storyActivityTSBaseOptions.LABELS,
                  type: 'score'
                }
              })
              // will create score activity time series by day (compacted)
              .ts.create(`${storyActivityKey}:score:by_day`, {
                LABELS: {
                  ...storyActivityTSBaseOptions.LABELS,
                  type: 'score'
                }
              })
              .ts.createRule(
                storyActivityKey,
                `${storyActivityKey}:score:by_day`,
                TimeSeriesAggregationType.SUM,
                86400000
              )
              // will add score activity sample
              .ts.add(`${storyActivityKey}:score`, now, latestStoryScore)
              // will create comment total activity time series
              .ts.create(`${storyActivityKey}:comment_total`, {
                DUPLICATE_POLICY: storyActivityTSBaseOptions.DUPLICATE_POLICY,
                LABELS: {
                  ...storyActivityTSBaseOptions.LABELS,
                  type: 'comment_total'
                }
              })
              // will create comment total activity time series by day (compacted)
              .ts.create(`${storyActivityKey}:comment_total:by_day`, {
                LABELS: {
                  ...storyActivityTSBaseOptions.LABELS,
                  type: 'comment_total'
                }
              })
              // https://redis.io/docs/stack/timeseries/quickstart/#downsampling
              .ts.createRule(
                storyActivityKey,
                `${storyActivityKey}:comment_total:by_day`,
                TimeSeriesAggregationType.SUM,
                86400000
              )
              // will add comment total activity sample
              .ts.add(
                `${storyActivityKey}:comment_total`,
                now,
                latestStoryCommentTotal
              )
          }
        } catch (error) {
          console.error(error)

          throw (error as Error).message
        }
      })
    )

    // hold on to your redis
    await ingestStoryActivityTSTransaction.exec()

    await closeStoryRepository()
    await redisClient.disconnect()

    // DONE!
    console.info(
      `${totalStoriesUpdatedWithLatestScore} stories updated with latest score`
    )
    console.info(
      `${totalStoriesUpdatedWithLatestCommentTotal} stories updated with latest comment total`
    )

    return {
      success: true,
      data: {
        totalStoriesUpdatedWithLatestScore,
        totalStoriesUpdatedWithLatestCommentTotal
      }
    }
  } catch (error) {
    console.error(error)

    throw isAxiosError(error) ? error.message : (error as Error).message
  }
}
