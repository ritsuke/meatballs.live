import axios from 'axios'
import millisecondsToSeconds from 'date-fns/millisecondsToSeconds'
import getTime from 'date-fns/getTime'
import sub from 'date-fns/sub'

import { DATA_SOURCE, MEATBALLS_DB_KEY } from '@/types/constants'

import { redisClient } from '@/redis/clients'

import { isAxiosError } from '@/utils/api'

import { SOURCE_REQUEST_HEADERS } from '..'
import {
  getStoryActivityTimeSeriesKey,
  getStoryActivityTimeSeriesSampleValue,
  HackerNewsNativeStoryData
} from '.'
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
  commentWeight,
  falloff
}: {
  start?: number // UNIX time (seconds); default now
  end?: number // UNIX time (seconds); default 5 min ago
  score?: number // default 0
  commentTotal?: number // default 0,
  commentWeight?: number // 1-100x
  falloff?: number // 1-100 percent
}) => {
  const now = Date.now()

  // sanitize our boundaries
  let storiesOlderThan = start ? start : millisecondsToSeconds(now),
    storiesNotOlderThan = end
      ? end
      : millisecondsToSeconds(
          getTime(sub(storiesOlderThan * 1000, { minutes: 60 }))
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

  console.info(
    `[INFO:StoryActivity:${
      DATA_SOURCE.HN
    }] weighted time series params: commentWeight = ${
      commentWeight ? commentWeight + 'x' : 'N/A'
    }, falloff = ${falloff ? falloff + '%' : 'N/A'}`
  )

  let success = false

  try {
    const storiesToUpdate = (
        await redisClient.graph.query(
          `${MEATBALLS_DB_KEY.GRAPH}`,
          `
          MATCH (url:Url)<--(s:Story)-->(u:User)
          WHERE s.created <= ${storiesOlderThan} AND s.created >= ${storiesNotOlderThan} AND s.score >= ${storiesWithScoreOrMore} AND s.comment_total >= ${storiesWithCommentTotalOrMore}
          RETURN s.name, s.deleted, s.locked, s.score, s.comment_total, url.name, u.name
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
        // s.name, s.deleted, s.locked, s.score, s.comment_total, url.name, u.name
        // e.g. ['hn:32502234', 'false', 'false', 1, 0, 'ritsuke.dev','ritsuke']
        storiesToUpdate.map(
          async ([
            storyId,
            priorDeleted,
            priorLocked,
            priorScore,
            priorCommentTotal,
            domainName,
            userName
          ]) => {
            if (typeof storyId !== 'string')
              throw `[ERROR:StoryActivity:${DATA_SOURCE.HN}] missing story ID or type not string...`
            if (typeof priorScore !== 'number')
              throw `[ERROR:StoryActivity:${DATA_SOURCE.HN}] missing prior score or type not number`
            if (typeof priorCommentTotal !== 'number')
              throw `[ERROR:StoryActivity:${DATA_SOURCE.HN}] missing prior commentTotal or type not number`
            if (typeof domainName !== 'string')
              throw `[ERROR:StoryActivity:${DATA_SOURCE.HN}] missing domain name or type not string...`
            if (typeof userName !== 'string')
              throw `[ERROR:StoryActivity:${DATA_SOURCE.HN}] missing user ID or type not string...`

            const nativeSourceStoryId = storyId.replace(
              `${DATA_SOURCE.HN}:`,
              ''
            )

            const { data: nativeSourceStory } =
              await axios.get<HackerNewsNativeStoryData | null>(
                HN_API_ENDPOINTS.STORY_BY_ID_NATIVE(nativeSourceStoryId),
                { headers: { ...SOURCE_REQUEST_HEADERS } }
              )

            if (!nativeSourceStory) {
              throw `[ERROR:StoryActivity:${DATA_SOURCE.HN}] unable to process story activity from native source story "${nativeSourceStoryId}"; story missing...`
            }

            const {
              dead: latestLocked = false,
              deleted: latestDeleted = false,
              score: latestScore = 0,
              descendants: latestCommentTotal = 0
            } = nativeSourceStory

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

              if (latestLocked && priorLocked === 'false') {
                setClause += `SET s.locked = ${true} `
              }

              if (!latestLocked && priorLocked === 'true') {
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

            // let totalStoriesUpdatedWithLatestScore = 0,
            //   totalStoriesUpdatedWithLatestCommentTotal = 0

            const shouldProcessNewComments = !latestLocked && !latestDeleted

            if (!shouldProcessNewComments) {
              console.warn(
                `[WARN:StoryActivity:${DATA_SOURCE.HN}] will not process new comments for story "${nativeSourceStoryId}"; latestLocked: ${latestLocked}, latestDead: ${latestDeleted}`
              )
            }

            await Promise.all([
              redisClient.ts.add(
                `${getStoryActivityTimeSeriesKey(storyId, true)}`,
                now,
                getStoryActivityTimeSeriesSampleValue({
                  score: latestScore,
                  commentTotal: latestCommentTotal,
                  commentWeight,
                  falloff
                })
              ),
              processUserActivity(userName),
              shouldProcessNewComments &&
                processNewComments(nativeSourceStoryId)
            ])
          }
        )
      )

      await storiesToUpdateTransaction.exec()

      console.info(
        `[INFO:StoryActivity:${DATA_SOURCE.HN}] successfully updated ${totalStoriesUpdated} stories...`
      )
    }

    success = true
  } catch (error) {
    let errorMessage = isAxiosError(error)
      ? error.message
      : (error as Error).message

    console.error(
      `[ERROR:StoryActivity:${DATA_SOURCE.HN}] start: ${start}, end: ${end}, score: ${score}, commentTotal: ${commentTotal}, commentWeight: ${commentWeight}, falloff: ${falloff}, error: ${errorMessage}`
    )
    console.error(error)

    throw errorMessage
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
