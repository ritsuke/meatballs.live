import cuid from 'cuid'
import slugify from 'slugify'
import axios from 'axios'
import pick from 'lodash-es/pick'

import { TimeSeriesReducers } from '@redis/time-series/dist/commands'

import { redisClient } from '@/redis/clients'
import { collectionRepository } from '@/redis/om/collection'
import { storyRepository } from '@/redis/om/story'
import {
  DATA_SOURCE,
  HTTP_STATUS_CODE,
  MEATBALLS_DB_KEY
} from '@/types/constants'

import { removeSpecialCharacters } from '..'
import { getCollectionsByDate, getUTCTimeFromYMDKey } from '../collections'
import { UnsplashPhotoData, UNSPLASH_API_ENDPOINTS } from '../ingest/unsplash'
import { isAxiosError } from '../api'

// TODO: handle potential for overlapping requests (e.g. block)
const processNewCollections = async ({
  dateKey
}: {
  dateKey: string
}): Promise<{
  success: boolean
  data: { notFound: boolean; exists: boolean; benchmark: number }
}> => {
  let success = false,
    exists = false,
    notFound = false

  const benchmarkStartTime = Date.now()

  const [year, month, day] = dateKey
      .split(':')
      .map((datePart) => parseInt(datePart)),
    collectionsStartDateKey = process.env.MEATBALLS_COLLECTIONS_START_DATE_KEY

  if (!collectionsStartDateKey)
    throw 'missing collections start date; check env'

  const startOfRequestedDayInMilliseconds = new Date(
      year,
      month - 1,
      day
    ).setUTCHours(0, 0, 0),
    collectionsStartDateInMilliseconds = getUTCTimeFromYMDKey(
      collectionsStartDateKey
    )

  try {
    // if requested date is before meatballs start date or
    // later than yesterday, return 404
    if (
      startOfRequestedDayInMilliseconds < collectionsStartDateInMilliseconds ||
      startOfRequestedDayInMilliseconds >
        new Date(Date.now()).setUTCHours(23, 59, 59, 0) - 86400000
    ) {
      notFound = true
      throw new Error(`${HTTP_STATUS_CODE.NOT_FOUND}`)
    }

    const collectionsKeyPrepend = `${year}:${month}:${day}`

    const foundCollections = await getCollectionsByDate({
      year,
      month,
      day
    })

    if (foundCollections.length > 0) {
      exists = true
      throw new Error(`${HTTP_STATUS_CODE.CONFLICT}`)
    }

    const endOfRequestedDayInMilliseconds = new Date(
      year,
      month - 1,
      day
    ).setUTCHours(23, 59, 59)

    const foundTimeSeries = await redisClient.ts.mRange(
      startOfRequestedDayInMilliseconds,
      endOfRequestedDayInMilliseconds,
      ['type=weighted', 'compacted=day'],
      {
        GROUPBY: { label: 'story', reducer: TimeSeriesReducers.MAXIMUM }
      }
    )

    // 404
    if (foundTimeSeries.length === 0) {
      notFound = true
      throw new Error(`${HTTP_STATUS_CODE.NOT_FOUND}`)
    }

    // sort by highest value DESC and return 1st 50
    const timeSeriesWithSamples = foundTimeSeries
      .filter((series) => series.samples.length > 0)
      .sort((a, b) => b.samples[0].value - a.samples[0].value)
      .slice(0, 20)

    const findStoriesTransaction = redisClient.multi()

    // prepare transaction calls
    timeSeriesWithSamples.map((series) => {
      const storyId = series.key.replace('story=', `${DATA_SOURCE.HN}:`)

      findStoriesTransaction.graph.query(
        `${MEATBALLS_DB_KEY.GRAPH}`,
        `
      MATCH (s:Story)
      WHERE s.name = "${storyId}"
      return s.name, s.score, s.comment_total, s.created
      `
      )
    })

    const foundStories = await findStoriesTransaction.exec()

    if (foundStories.length === 0) {
      throw new Error(`${HTTP_STATUS_CODE.CONFLICT}`)
    }

    const rankedStories = foundStories
      .map((story: any) => {
        const _story: {
            data: Array<[string, number, number, number]>
          } = story,
          [id, score, comment_total, created] = _story.data[0]

        return { id, score, comment_total, created }
      })
      // only use stories within window
      .filter((story) => {
        const storyCreatedInMilliseconds = story.created * 1000

        return (
          storyCreatedInMilliseconds >= startOfRequestedDayInMilliseconds &&
          storyCreatedInMilliseconds <= endOfRequestedDayInMilliseconds
        )
      })
      // bubble comments to top
      .sort((a, b) => {
        if (a.comment_total - a.score < b.comment_total - b.score) {
          return 1
        }

        if (a.comment_total - a.score > b.comment_total - b.score) {
          return -1
        }

        return 0
      })
      // return 1st 9
      .slice(0, 9)

    const newCollections = await Promise.all(
      rankedStories.map(async (story, index) => {
        const slug = cuid.slug()

        try {
          const [collection, storyContent] = await Promise.all([
            collectionRepository.fetch(`${collectionsKeyPrepend}:${slug}`),
            storyRepository.fetch(story.id)
          ])

          collection.year = year
          collection.month = month
          collection.day = day
          collection.title = storyContent.title
          collection.slug = storyContent.title
            ? `${slugify(storyContent.title, {
                strict: true,
                lower: true
              })}-${slug}`
            : null
          collection.position = index
          collection.comment_total = story.comment_total

          let photoData: UnsplashPhotoData | undefined = undefined

          if (storyContent.title) {
            photoData = (
              await axios.get<{ results: UnsplashPhotoData[] }>(
                UNSPLASH_API_ENDPOINTS.PHOTO_BY_QUERY(
                  removeSpecialCharacters(storyContent.title)
                ),
                {
                  headers: {
                    Authorization: `Client-ID ${process.env.UNSPLASH_CLIENT_ID}`
                  }
                }
              )
            ).data.results[0]
          }

          if (photoData) {
            collection.image_username = photoData.user.username
            collection.image_user_url = photoData.user.links.html
            collection.image_source_url = photoData.links.html
            collection.image_url = photoData.urls.raw
            collection.image_blur_hash = photoData.blur_hash
          }

          await collectionRepository.save(collection)

          return collection
        } catch (error) {
          throw error
        }
      })
    )

    await redisClient.set(
      `Collection:${collectionsKeyPrepend}:_cache`,
      JSON.stringify(
        newCollections.map((collection) => ({
          ...pick(collection, [
            'year',
            'month',
            'day',
            'title',
            'slug',
            'top_comment',
            'comment_total',
            'image_username',
            'image_user_url',
            'image_url',
            'image_source_url',
            'image_blur_hash',
            'position',
            'stories'
          ])
        }))
      )
    )

    success = true
  } catch (error) {
    success = false

    let errorMessage = isAxiosError(error)
      ? error.message
      : (error as Error).message

    console.error(
      `[ERROR:NewCollections:${DATA_SOURCE.HN}] dateKey: ${dateKey}, error: ${
        errorMessage || error
      }`
    )
    console.error(error)
  } finally {
    return {
      success,
      data: {
        notFound,
        exists,
        benchmark: Date.now() - benchmarkStartTime
      }
    }
  }
}

export default processNewCollections
