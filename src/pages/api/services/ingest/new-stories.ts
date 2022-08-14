import nextConnect from 'next-connect'
import { z } from 'zod'

import type { NextApiRequest, NextApiResponse } from 'next'
import { DATA_SOURCE, HTTP_STATUS_CODE } from '@/types/constants'

import { onError, onNoMatch } from '@/utils/api'
import { processHNNewStoriesIngestData } from '@/utils/ingest/processors'
import { ingestAuthApiMiddleware } from '@/utils/ingest/middleware'

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
  max: z.preprocess((value) => parseInt(value as string), z.number()).optional()
})

NewStoriesIngestServiceApi.use(ingestAuthApiMiddleware)

NewStoriesIngestServiceApi.post(async (req, res) => {
  const query = NewStoriesIngestServiceApiQuery.safeParse(req.query)

  if (query.success) {
    const {
      data: { dataSource, max }
    } = query

    let totalStoriesSaved = 0

    switch (dataSource) {
      case DATA_SOURCE.HN:
        try {
          const { data } = await processHNNewStoriesIngestData(max)

          totalStoriesSaved = data.total
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

    return res
      .status(HTTP_STATUS_CODE.OK)
      .end(JSON.stringify({ data: { total: totalStoriesSaved } }))
  }

  if (!query.success) {
    const { error } = query

    return res.status(HTTP_STATUS_CODE.BAD_REQUEST).end(error.message)
  }
})

export default NewStoriesIngestServiceApi
