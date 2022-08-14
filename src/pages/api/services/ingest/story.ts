import nextConnect from 'next-connect'
import { z } from 'zod'

import type { NextApiRequest, NextApiResponse } from 'next'
import { DATA_SOURCE, HTTP_STATUS_CODE } from '@/types/constants'

import { onError, onNoMatch } from '@/utils/api'
import { processHackerNewsIngestStoryData } from '@/utils/ingest/processors'

const IngestApi = nextConnect<NextApiRequest, NextApiResponse>({
  onError,
  onNoMatch
})

const IngestApiQuery = z.object({
  apiKey: z.string({ required_error: 'API key is required.' }).min(1),
  dataSource: z.nativeEnum(DATA_SOURCE, {
    required_error: 'Data source is required.'
  }),
  maxStories: z
    .preprocess((value) => parseInt(value as string), z.number())
    .optional()
})

IngestApi.get(async (req, res) => {
  const query = IngestApiQuery.safeParse(req.query)

  if (query.success) {
    const {
      data: { apiKey, dataSource, maxStories }
    } = query

    // check for authorized ingest request
    // TODO: vercel wraps values with double quotes,
    // but thunder client includes as part of value; report
    if (apiKey.replace(/"/g, '') !== process.env.INGEST_API_KEY) {
      return res
        .status(HTTP_STATUS_CODE.UNAUTHORIZED)
        .end('Missing or invalid API key.')
    }

    switch (dataSource) {
      case DATA_SOURCE.HN:
        try {
          await processHackerNewsIngestStoryData(maxStories)
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

    return res.status(HTTP_STATUS_CODE.OK).end(dataSource)
  }

  if (!query.success) {
    const { error } = query

    return res.status(HTTP_STATUS_CODE.BAD_REQUEST).end(error.message)
  }
})

export default IngestApi
