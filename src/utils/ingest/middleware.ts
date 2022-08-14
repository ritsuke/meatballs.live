import { z } from 'zod'

import type { NextApiRequest, NextApiResponse } from 'next'
import type { NextHandler } from 'next-connect'

import { HTTP_STATUS_CODE } from '@/types/constants'

import { preprocessAuthHeader } from '../api'

const IngestServiceApiHeaders = z.object({
  authorization: z.preprocess(
    preprocessAuthHeader,
    z.string({ required_error: 'API key is required' }).min(1)
  )
})

export const ingestAuthApiMiddleware = (
  req: NextApiRequest,
  res: NextApiResponse,
  next: NextHandler
) => {
  const headers = IngestServiceApiHeaders.safeParse(req.headers)

  if (headers.success) {
    const {
      data: { authorization: apiKey }
    } = headers

    if (apiKey !== process.env.INGEST_API_KEY) {
      return res
        .status(HTTP_STATUS_CODE.UNAUTHORIZED)
        .end('Missing or invalid API key.')
    }

    return next()
  }

  const { error } = headers

  return res.status(HTTP_STATUS_CODE.BAD_REQUEST).end(error.message)
}
