import type { ParsedUrlQuery } from 'querystring'

import { collectionRepository } from '@/redis/om/collection'

export type CollectionDate = {
  year: number
  month: number
  day: number
}

export const parseCollectionParamsFromParsedUrlQuery = (
  params: ParsedUrlQuery
) => ({
  year: typeof params.year === 'string' ? parseInt(params.year) : undefined,
  month: typeof params.month === 'string' ? parseInt(params.month) : undefined,
  day: typeof params.day === 'string' ? parseInt(params.day) : undefined,
  collectionId: typeof params.cid === 'string' ? params.cid : undefined
})

export const getUTCTimeFromYMDKey = (key: string, end?: boolean) => {
  const timeParts = key.split(':'),
    [year, month, day] = timeParts.map((part) => parseInt(part)),
    baseDate = new Date(year, month - 1, day)

  if (end) {
    return baseDate.setUTCHours(23, 59, 59)
  }

  return baseDate.setUTCHours(0, 0, 0)
}

export const getCollectionsByDate = async ({
  year,
  month,
  day
}: CollectionDate) =>
  await collectionRepository
    .search()
    .where('year')
    .eq(year)
    .and('month')
    .eq(month)
    .and('day')
    .eq(day)
    .sortBy('position')
    .return.all()
