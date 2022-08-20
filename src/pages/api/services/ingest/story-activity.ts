import nextConnect from 'next-connect'
import { z } from 'zod'

import type { NextApiRequest, NextApiResponse } from 'next'
import { DATA_SOURCE, HTTP_STATUS_CODE } from '@/types/constants'

import {
  apiParamPositiveIntPreprocessor,
  onError,
  onNoMatch
} from '@/utils/api'
import { ingestAuthApiMiddleware } from '@/utils/ingest/middleware'
import { processStoryActivity } from '@/utils/ingest/hn'

const StoryActivityIngestServiceApi = nextConnect<
  NextApiRequest,
  NextApiResponse
>({
  onError,
  onNoMatch
})

const StoryActivityIngestServiceApiQuery = z.object({
  dataSource: z.nativeEnum(DATA_SOURCE, {
    required_error: 'Data source is required.'
  }),
  start: apiParamPositiveIntPreprocessor().optional(),
  end: apiParamPositiveIntPreprocessor().optional(),
  score: apiParamPositiveIntPreprocessor().optional(),
  commentTotal: apiParamPositiveIntPreprocessor().optional(),
  commentWeight: apiParamPositiveIntPreprocessor({ max: 100 }).optional(),
  falloff: apiParamPositiveIntPreprocessor({ max: 100 }).optional()
})

StoryActivityIngestServiceApi.use(ingestAuthApiMiddleware)

StoryActivityIngestServiceApi.post(async (req, res) => {
  const query = StoryActivityIngestServiceApiQuery.safeParse(req.query)

  if (query.success) {
    const {
      data: {
        dataSource,
        start,
        end,
        score,
        commentTotal,
        commentWeight,
        falloff
      }
    } = query

    let totalStoriesUpdatedWithLatestScore,
      totalStoriesUpdatedWithLatestCommentTotal

    let redisClient

    switch (dataSource) {
      case DATA_SOURCE.HN:
        try {
          // TODO: get data
          const { data } = await processStoryActivity({
            start,
            end,
            score,
            commentTotal,
            commentWeight,
            falloff
          })

          // redisClient = (await import('@/redis/clients')).redisClient

          totalStoriesUpdatedWithLatestScore =
            data.totalStoriesUpdatedWithLatestScore
          totalStoriesUpdatedWithLatestCommentTotal =
            data.totalStoriesUpdatedWithLatestCommentTotal
        } catch (error) {
          console.error(error)

          return res.status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR).end()
        } finally {
          // redisClient?.disconnect()
        }

        break
      default:
        return res
          .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
          .end(`'${dataSource}' is not implemented.`)
    }

    // TODO: return data
    return res.status(HTTP_STATUS_CODE.OK).end(
      JSON.stringify({
        success: true,
        data: {
          stories_updated_with_latest_score: totalStoriesUpdatedWithLatestScore,
          stories_updated_with_latest_comment_total:
            totalStoriesUpdatedWithLatestCommentTotal
        }
      })
    )
  }

  const { error } = query

  return res.status(HTTP_STATUS_CODE.BAD_REQUEST).end(error.message)
})

export default StoryActivityIngestServiceApi
