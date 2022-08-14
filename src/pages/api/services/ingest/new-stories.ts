import nextConnect from 'next-connect'
import { z } from 'zod'

import type { NextApiRequest, NextApiResponse } from 'next'
import { DATA_SOURCE, HTTP_STATUS_CODE } from '@/types/constants'

import { onError, onNoMatch } from '@/utils/api'
import { processHNNewStoriesIngestData } from '@/utils/ingest/processors'

const NewStoriesIngestServiceApi = nextConnect<NextApiRequest, NextApiResponse>(
  {
    onError,
    onNoMatch
  }
)

const NewStoriesIngestServiceApiHeaders = z.object({
  authorization: z.preprocess(
    (value) =>
      // TODO: vercel wraps values with double quotes,
      // but thunder client includes as part of value; report
      typeof value === 'string'
        ? value.replace(/"/g, '').replace('Bearer ', '')
        : undefined,
    z.string({ required_error: 'API key is required' }).min(1)
  )
})

const NewStoriesIngestServiceApiQuery = z.object({
  dataSource: z.nativeEnum(DATA_SOURCE, {
    required_error: 'Data source is required.'
  }),
  max: z.preprocess((value) => parseInt(value as string), z.number()).optional()
})

NewStoriesIngestServiceApi.post(async (req, res) => {
  const headers = NewStoriesIngestServiceApiHeaders.safeParse(req.headers),
    query = NewStoriesIngestServiceApiQuery.safeParse(req.query)

  if (headers.success && query.success) {
    const {
        data: { authorization: apiKey }
      } = headers,
      {
        data: { dataSource, max }
      } = query

    // check for authorized ingest request
    if (apiKey !== process.env.INGEST_API_KEY) {
      return res
        .status(HTTP_STATUS_CODE.UNAUTHORIZED)
        .end('Missing or invalid API key.')
    }

    switch (dataSource) {
      case DATA_SOURCE.HN:
        try {
          await processHNNewStoriesIngestData(max)
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

export default NewStoriesIngestServiceApi
