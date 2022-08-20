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
import { processNewStories } from '@/utils/ingest/hn'

const NewStoriesIngestServiceApi = nextConnect<NextApiRequest, NextApiResponse>(
  {
    onError,
    onNoMatch
  }
)

const NewStoriesIngestServiceApiQuery = z.object({
  dataSource: z.nativeEnum(DATA_SOURCE, {
    required_error: 'Data source is required.'
  }),
  limit: apiParamPositiveIntPreprocessor().optional()
})

NewStoriesIngestServiceApi.use(ingestAuthApiMiddleware)

NewStoriesIngestServiceApi.post(async (req, res) => {
  const query = NewStoriesIngestServiceApiQuery.safeParse(req.query)

  if (query.success) {
    const {
      data: { dataSource, limit }
    } = query

    let totalNewStoriesSaved = 0,
      totalNewUsersSaved = 0

    switch (dataSource) {
      case DATA_SOURCE.HN:
        try {
          const { data } = await processNewStories(limit)

          totalNewStoriesSaved = data.totalNewStoriesSaved
          totalNewUsersSaved = data.totalNewUsersSaved
        } catch (error) {
          console.error(error)

          return res.status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR).end()
        } finally {
        }

        break
      default:
        return res
          .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
          .end(`'${dataSource}' is not implemented.`)
    }

    return res.status(HTTP_STATUS_CODE.OK).end(
      JSON.stringify({
        success: true,
        data: {
          new_stories_saved: totalNewStoriesSaved,
          new_users_saved: totalNewUsersSaved
        }
      })
    )
  }

  const { error } = query

  return res.status(HTTP_STATUS_CODE.BAD_REQUEST).end(error.message)
})

export default NewStoriesIngestServiceApi
