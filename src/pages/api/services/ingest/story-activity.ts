import nextConnect from 'next-connect'
import { z } from 'zod'

import type { NextApiRequest, NextApiResponse } from 'next'
import { DATA_SOURCE, HTTP_STATUS_CODE } from '@/types/constants'

import { onError, onNoMatch } from '@/utils/api'
import { ingestAuthApiMiddleware } from '@/utils/ingest/middleware'
import { processHNStoryActivityIngestData } from '@/utils/ingest/processors'

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
  })
})

StoryActivityIngestServiceApi.use(ingestAuthApiMiddleware)

StoryActivityIngestServiceApi.post(async (req, res) => {
  const query = StoryActivityIngestServiceApiQuery.safeParse(req.query)

  if (query.success) {
    const {
      data: { dataSource }
    } = query

    let totalStoriesUpdatedWithLatestScore,
      totalStoriesUpdatedWithLatestCommentTotal

    switch (dataSource) {
      case DATA_SOURCE.HN:
        try {
          // TODO: get data
          const { data } = await processHNStoryActivityIngestData()

          totalStoriesUpdatedWithLatestScore =
            data.totalStoriesUpdatedWithLatestScore
          totalStoriesUpdatedWithLatestCommentTotal =
            data.totalStoriesUpdatedWithLatestCommentTotal
        } catch (error) {
          console.error(error)

          return res.status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR).end()
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
        data: {
          totalStoriesUpdatedWithLatestScore,
          totalStoriesUpdatedWithLatestCommentTotal
        }
      })
    )
  }

  const { error } = query

  return res.status(HTTP_STATUS_CODE.BAD_REQUEST).end(error.message)
})

export default StoryActivityIngestServiceApi
