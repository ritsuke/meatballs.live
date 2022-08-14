import axios from 'axios'

import type { AxiosError } from 'axios'
import { type NextApiRequest, NextApiResponse } from 'next'
import { HTTP_STATUS_CODE } from '@/types/constants'

export const onError = (
  error: any,
  _: NextApiRequest,
  res: NextApiResponse
) => {
  console.error(error)
  return res.status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR).end()
}

export const onNoMatch = (_: NextApiRequest, res: NextApiResponse) => {
  return res.status(HTTP_STATUS_CODE.METHOD_NOT_ALLOWED).end()
}

// https://github.com/axios/axios/issues/3612#issuecomment-1198490390
export const isAxiosError = <ResponseType>(
  error: unknown
): error is AxiosError<ResponseType> => axios.isAxiosError(error)

// TODO: vercel wraps values with double quotes,
// but thunder client includes as part of value; report
export const preprocessAuthHeader = (value: unknown) =>
  typeof value === 'string'
    ? value.replace(/"/g, '').replace('Bearer ', '')
    : undefined
