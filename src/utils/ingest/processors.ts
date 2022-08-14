import axios from 'axios'

import { isAxiosError } from '../api'

import redis from '@/redis/client'
import story from '@/redis/om/story'

interface HackerNewsStoryData {
  by: string
  descendants: number
  score: number
  text?: string
  time: number
  title: string
  url?: string
}

const HN_API_ENDPOINTS = {
    NEW_STORIES: 'https://hacker-news.firebaseio.com/v0/newstories.json',
    STORY_BY_ID: 'https://hacker-news.firebaseio.com/v0/item/{id}.json'
  },
  HN_SOURCE_DOMAIN = 'news.ycombinator.com'

// TODO: abstract when additional data sources are introduced
// as of 20220814, HN API returns 500 newest story IDs
export const processHNNewStoriesIngestData = async (max?: number) => {
  try {
    // get newest story IDs from HN API and trim to max
    const newStoriesById = (
        await axios.get<string[]>(HN_API_ENDPOINTS.NEW_STORIES)
      ).data,
      newStoriesByIdTrimmedToMax = [
        ...newStoriesById.slice(0, max || newStoriesById.length)
      ],
      newStoriesToSaveToDb: string[] = []

    const { client: redisClient } = await redis(),
      { repository: storyRepository, closeRepository: closeStoryRepository } =
        await story()

    // check if any stories exist in the db
    const existingStoriesById = await redisClient.json.mGet(
      newStoriesByIdTrimmedToMax.map((id) => `Story:${id}`),
      '$.id'
    )

    // if stories exists, filter from new stories to save to db
    existingStoriesById.map((foundId, index) => {
      if (!foundId) newStoriesToSaveToDb.push(newStoriesByIdTrimmedToMax[index])
    })

    // save new stories to db
    await Promise.all(
      newStoriesToSaveToDb.map(async (id) => {
        try {
          // get story data and story objects
          const [
            { by, descendants: total_comments, score, text, time, title, url },
            newStory
          ] = await Promise.all([
            (
              await axios.get<HackerNewsStoryData>(
                HN_API_ENDPOINTS.STORY_BY_ID.replace('{id}', id)
              )
            ).data,
            await storyRepository.fetch(id)
          ])

          // map data to object
          newStory.id = id
          newStory.domain = url ? new URL(url).hostname : HN_SOURCE_DOMAIN
          newStory.poster = by
          newStory.score = score
          newStory.source = HN_SOURCE_DOMAIN
          newStory.text = text ?? null
          newStory.title = title
          newStory.total_comments = total_comments
          newStory.url = url ?? null
          newStory.createdAt = time

          // save
          await storyRepository.save(newStory)
        } catch (error) {
          console.error(error)

          throw (error as Error).message
        }
      })
    )

    await closeStoryRepository()
    await redisClient.disconnect()

    const totalNewStoriesSavedToDb = newStoriesToSaveToDb.length

    // done!
    console.info(`Saved ${totalNewStoriesSavedToDb} new stories to DB...`)

    return { success: true, data: { total: totalNewStoriesSavedToDb } }
  } catch (error) {
    console.error(error)

    throw isAxiosError(error) ? error.message : (error as Error).message
  }
}
