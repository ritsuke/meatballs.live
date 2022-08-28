import nextConnect from 'next-connect'
import { z } from 'zod'

import type { NextApiRequest, NextApiResponse } from 'next'
import { HTTP_STATUS_CODE, MEATBALLS_CHANNEL_KEY } from '@/types/constants'

import { onError, onNoMatch } from '@/utils/api'
import { unstable_getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { redisClient } from '@/redis/clients'

const PublishCommentApi = nextConnect<NextApiRequest, NextApiResponse>({
  onError,
  onNoMatch
})

const PublishCommentApiQuery = z.object({
  name: z.string(),
  comment: z.string()
})

PublishCommentApi.post(async (req, res) => {
  const query = PublishCommentApiQuery.safeParse(req.body)

  if (query.success) {
    const session = await unstable_getServerSession(req, res, authOptions)

    if (!session?.user)
      return res
        .status(HTTP_STATUS_CODE.UNAUTHORIZED)
        .end('Must be signed in to comment.')

    const {
      data: { name, comment }
    } = query

    redisClient.publish(
      MEATBALLS_CHANNEL_KEY.COMMENT_STREAM,
      JSON.stringify({
        user: name,
        created: Math.round(Date.now() / 1000),
        content: comment
      })
    )

    return res.status(HTTP_STATUS_CODE.OK).end()
  }

  const { error } = query

  console.error(error)

  return res.status(HTTP_STATUS_CODE.BAD_REQUEST).end(error.message)
})

export default PublishCommentApi
