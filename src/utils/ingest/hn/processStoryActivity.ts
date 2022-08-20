import axios from 'axios'
import millisecondsToSeconds from 'date-fns/millisecondsToSeconds'
import getTime from 'date-fns/getTime'
import sub from 'date-fns/sub'

import { DATA_SOURCE, MEATBALLS_DB_KEY } from '@/types/constants'

import { redisClient } from '@/redis/clients'
import { storyRepository } from '@/redis/om/story'
import { userRepository } from '@/redis/om/user'
import { commentRepository } from '@/redis/om/comment'

import { isAxiosError } from '@/utils/api'

import { SOURCE_REQUEST_HEADERS } from '..'
import type { HackerNewsNativeStoryData } from '.'
import { HN_API_ENDPOINTS } from '.'
import { processUserActivity, processNewComments } from '.'

// param(s) describe boundaries
// e.g. only stories that are 6-12 hours old
// and have a score > 50 and commentTotal > 3
// TODO: support arbitrary query hosted elsewhere
// benchmark: ~5s
const processStoryActivity = async ({
  start,
  end,
  score = 0,
  commentTotal = 0,
  commentWeight = 0,
  falloff = 0
}: {
  start?: number // UNIX time (seconds); default now
  end?: number // UNIX time (seconds); default 5 min ago
  score?: number // default 0
  commentTotal?: number // default 0,
  commentWeight?: number // default 0
  falloff?: number // default 0
}) => {
  // sanitize our boundaries
  let storiesOlderThan = start ? start : millisecondsToSeconds(Date.now()),
    storiesNotOlderThan = end
      ? end
      : millisecondsToSeconds(
          getTime(sub(storiesOlderThan * 1000, { minutes: 120 }))
        ),
    storiesWithScoreOrMore = score,
    storiesWithCommentTotalOrMore = commentTotal

  console.info(
    `[INFO:StoryActivity:${DATA_SOURCE.HN}] preparing to search for stories to update...`
  )
  console.info(`[INFO:StoryActivity:${DATA_SOURCE.HN}] search bounds:`)
  console.table([
    { name: 'start <=', value: storiesOlderThan },
    { name: 'end >=', value: storiesNotOlderThan },
    { name: 'score >=', value: storiesWithScoreOrMore },
    { name: 'commentTotal >=', value: storiesWithCommentTotalOrMore }
  ])

  let success = false

  try {
    const storiesToUpdate = (
        await redisClient.graph.query(
          `${MEATBALLS_DB_KEY.GRAPH}`,
          `
          MATCH (s:Story)-->(u:User)
          WHERE s.created <= ${storiesOlderThan} AND s.created >= ${storiesNotOlderThan} AND s.score >= ${storiesWithScoreOrMore} AND s.comment_total >= ${storiesWithCommentTotalOrMore}
          RETURN s.name, s.deleted, s.locked, s.score, s.comment_total, u.name
          `
        )
      ).data,
      totalStoriesToUpdate = storiesToUpdate.length

    let totalStoriesUpdated = 0

    if (totalStoriesToUpdate === 0) {
      console.info(
        `[INFO:StoryActivity:${DATA_SOURCE.HN}] no stories to update...`
      )
    }

    if (totalStoriesToUpdate > 0) {
      console.info(
        `[INFO:StoryActivity:${DATA_SOURCE.HN}] preparing to update ${totalStoriesToUpdate} stories...`
      )

      const storiesToUpdateTransaction = redisClient.multi()

      await Promise.all(
        // s.name, s.deleted, s.locked, s.score, s.comment_total, u.name
        // e.g. ['hn:32502234', 'false', 'false', 1, 0, 'ritsuke']
        storiesToUpdate.map(
          async ([
            storyId,
            priorDeleted,
            priorLocked,
            priorScore,
            priorCommentTotal,
            sourceUserId
          ]) => {
            if (typeof storyId !== 'string')
              throw `[ERROR:StoryActivity:${DATA_SOURCE.HN}] missing story ID or type not string...`
            if (typeof priorScore !== 'number')
              throw `[ERROR:StoryActivity:${DATA_SOURCE.HN}] missing prior score or type not number`
            if (typeof priorCommentTotal !== 'number')
              throw `[ERROR:StoryActivity:${DATA_SOURCE.HN}] missing prior commentTotal or type not number`
            if (typeof sourceUserId !== 'string')
              throw `[ERROR:StoryActivity:${DATA_SOURCE.HN}] missing user ID or type not string...`

            const sourceStoryId = storyId.replace(`${DATA_SOURCE.HN}:`, '')

            await Promise.all([
              processUserActivity(sourceUserId),
              processNewComments(sourceStoryId)
            ])

            const {
              dead: latestLocked = false,
              deleted: latestDeleted = false,
              score: latestScore = 0,
              descendants: latestCommentTotal = 0
            } = (
              await axios.get<HackerNewsNativeStoryData>(
                HN_API_ENDPOINTS.STORY_BY_ID_NATIVE(sourceStoryId),
                { headers: { ...SOURCE_REQUEST_HEADERS } }
              )
            ).data

            if (
              (latestDeleted && priorDeleted === 'false') ||
              (!latestDeleted && priorDeleted === 'true') ||
              (latestLocked && priorLocked === 'false') ||
              (!latestLocked && priorLocked === 'true') ||
              latestScore !== priorScore ||
              latestCommentTotal !== priorCommentTotal
            ) {
              let setClause = ''

              if (latestDeleted && priorDeleted === 'false') {
                setClause += `SET s.deleted = ${true} `
              }

              if (!latestDeleted && priorDeleted === 'true') {
                setClause += `SET s.deleted = ${false} `
              }

              if (latestLocked && latestLocked === 'false') {
                setClause += `SET s.locked = ${true} `
              }

              if (!latestLocked && latestLocked === 'true') {
                setClause += `SET s.locked = ${false} `
              }

              if (latestScore !== priorScore) {
                setClause += `SET s.score = ${latestScore} `
              }

              if (latestCommentTotal !== priorCommentTotal) {
                setClause += `SET s.comment_total = ${latestCommentTotal} `
              }

              if (setClause) {
                const storyUpdateQuery = `MATCH (s:Story { name: "${storyId}" }) ${setClause.trim()}`

                storiesToUpdateTransaction.graph.query(
                  MEATBALLS_DB_KEY.GRAPH,
                  storyUpdateQuery
                )

                totalStoriesUpdated++

                console.info(
                  `[INFO:StoryActivity:${DATA_SOURCE.HN}] added story update query "${storyUpdateQuery}" to upcoming transaction...`
                )
              }
            }
          }
        )
      )

      await storiesToUpdateTransaction.exec()

      console.info(
        `[INFO:StoryActivity:${DATA_SOURCE.HN}] successfully updated ${totalStoriesUpdated} stories...`
      )

      // console.info(
      //   `[INFO:StoryActivity:${
      //     DATA_SOURCE.HN
      //   }] weighted time series params: commentWeight = ${
      //     commentWeight ? commentWeight + 'x' : 'N/A'
      //   }, falloff = ${falloff ? falloff + '%' : 'N/A'}`
      // )

      // // find stories created within temporal ingest threshold
      // // const storySearch = await redisClient.graph.query
      // const storySearch = await storyRepository
      //     .search()
      //     .where('created')
      //     .onOrAfter(sub(now, { minutes: 1440 })),
      //   stories = await storySearch.return.all()

      // let totalStoriesUpdatedWithLatestScore = 0,
      //   totalStoriesUpdatedWithLatestCommentTotal = 0

      // // https://redis.io/docs/manual/transactions/
      // const ingestStoryActivityTSTransaction = redisClient.multi()

      // // update stories to latest score and total comments
      // // and add time series commands to ingest transaction
      // await Promise.all(
      //   stories.map(async (story) => {
      //     try {
      //       const {
      //         deleted,
      //         score: latestStoryScore,
      //         descendants: latestStoryCommentTotal
      //       } = (
      //         await axios.get<HackerNewsNativeStoryData>(
      //           HN_API_ENDPOINTS.STORY_BY_ID_NATIVE.replace('{id}', story.id),
      //           { headers: { ...SOURCE_REQUEST_HEADERS } }
      //         )
      //       ).data

      //       if (deleted) {
      //         // update graph
      //         story.deleted = true
      //         return
      //       }

      //       // update story with new score and comment total
      //       // if this fails, ts data will not ingest
      //       if (latestStoryScore && latestStoryCommentTotal) {
      //         if (
      //           story.score !== latestStoryScore ||
      //           story.comment_total !== latestStoryCommentTotal
      //         ) {
      //           if (story.score !== latestStoryScore) {
      //             story.score = latestStoryScore
      //             totalStoriesUpdatedWithLatestScore++
      //           }

      //           if (story.comment_total !== latestStoryCommentTotal) {
      //             story.comment_total = latestStoryCommentTotal
      //             totalStoriesUpdatedWithLatestCommentTotal++
      //           }

      //           await storyRepository.save(story)
      //         }

      //         // add time series commands to time series ingest transaction
      //         // https://redis.io/docs/stack/timeseries/quickstart/
      //         // https://youtu.be/9JeAu--liMk?t=1737
      //         const storyActivityKey = `Story:${story.id}:_activity`,
      //           storyActivityTSBaseOptions = {
      //             DUPLICATE_POLICY: TimeSeriesDuplicatePolicies.MAX,
      //             LABELS: {
      //               domain: story.domain || HN_SOURCE_DOMAIN,
      //               poster: story.poster || 'unknown',
      //               url: story.url || HN_STORY_URL.replace('{id}', story.id)
      //             }
      //           }

      //         // redis will skip commands if key already exists
      //         ingestStoryActivityTSTransaction.ts
      //           // will create score activity time series
      //           .create(`${storyActivityKey}:score`, {
      //             DUPLICATE_POLICY: storyActivityTSBaseOptions.DUPLICATE_POLICY,
      //             LABELS: {
      //               ...storyActivityTSBaseOptions.LABELS,
      //               type: 'score'
      //             }
      //           })
      //           // will create score activity time series by day (compacted)
      //           .ts.create(`${storyActivityKey}:score:by_day`, {
      //             LABELS: {
      //               ...storyActivityTSBaseOptions.LABELS,
      //               type: 'score'
      //             }
      //           })
      //           .ts.createRule(
      //             storyActivityKey,
      //             `${storyActivityKey}:score:by_day`,
      //             TimeSeriesAggregationType.SUM,
      //             86400000
      //           )
      //           // will add score activity sample
      //           .ts.add(`${storyActivityKey}:score`, now, latestStoryScore)
      //           // will create comment total activity time series
      //           .ts.create(`${storyActivityKey}:comment_total`, {
      //             DUPLICATE_POLICY: storyActivityTSBaseOptions.DUPLICATE_POLICY,
      //             LABELS: {
      //               ...storyActivityTSBaseOptions.LABELS,
      //               type: 'comment_total'
      //             }
      //           })
      //           // will create comment total activity time series by day (compacted)
      //           .ts.create(`${storyActivityKey}:comment_total:by_day`, {
      //             LABELS: {
      //               ...storyActivityTSBaseOptions.LABELS,
      //               type: 'comment_total'
      //             }
      //           })
      //           // https://redis.io/docs/stack/timeseries/quickstart/#downsampling
      //           .ts.createRule(
      //             storyActivityKey,
      //             `${storyActivityKey}:comment_total:by_day`,
      //             TimeSeriesAggregationType.SUM,
      //             86400000
      //           )
      //           // will add comment total activity sample
      //           .ts.add(
      //             `${storyActivityKey}:comment_total`,
      //             now,
      //             latestStoryCommentTotal
      //           )
      //       }
      //     } catch (error) {
      //       console.error(error)

      //       throw (error as Error).message
      //     }
      //   })
      // )

      // // hold on to your redis
      // await ingestStoryActivityTSTransaction.exec()
    }

    success = true
  } catch (error) {
    console.error(error)

    throw isAxiosError(error) ? error.message : (error as Error).message
  } finally {
    // DONE!
    // console.info(
    //   `${totalStoriesUpdatedWithLatestScore} stories updated with latest score`
    // )
    // console.info(
    //   `${totalStoriesUpdatedWithLatestCommentTotal} stories updated with latest comment total`
    // )

    return {
      success,
      data: {
        totalStoriesUpdatedWithLatestScore: 0,
        totalStoriesUpdatedWithLatestCommentTotal: 0
      }
    }
  }
}

export default processStoryActivity
