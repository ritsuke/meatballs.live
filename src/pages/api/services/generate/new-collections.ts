import { NextApiRequest, NextApiResponse } from 'next'
import nextConnect from 'next-connect'
import { z } from 'zod'

import { onError, onNoMatch } from '@/utils/api'
import { servicesAuthApiMiddleware } from '@/utils/ingest/middleware'
import { HTTP_STATUS_CODE } from '@/types/constants'

import processNewCollections from '@/utils/generate/processNewCollections'

const NewCollectionsGenerateServiceApi = nextConnect<
  NextApiRequest,
  NextApiResponse
>({
  onError,
  onNoMatch
})

const NewCollectionsGenerateServiceApiQuery = z.object({
  dateKey: z.string() // e.g. 2022:8:22
})

NewCollectionsGenerateServiceApi.use(servicesAuthApiMiddleware)

NewCollectionsGenerateServiceApi.post(async (req, res) => {
  const query = NewCollectionsGenerateServiceApiQuery.safeParse(req.query)

  if (query.success) {
    const {
      data: { dateKey }
    } = query

    const {
      success,
      data: { notFound: not_found, exists, benchmark }
    } = await processNewCollections({ dateKey })

    if (!success) {
    }

    return res
      .status(HTTP_STATUS_CODE.OK)
      .json({ success, data: { not_found, exists, benchmark } })
  }

  const { error } = query

  return res.status(HTTP_STATUS_CODE.BAD_REQUEST).end(error.message)
})

export default NewCollectionsGenerateServiceApi
