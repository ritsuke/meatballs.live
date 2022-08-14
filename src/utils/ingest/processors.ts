import axios from 'axios'

import { isAxiosError } from '../api'

import useRedis from '@/redis/useRedis'
import useStoryRepository from '@/redis/om/Story'

interface HackerNewsStoryData {
  by: string
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
  HN_SOURCE_DOMAIN = 'news.ycombinator.com',
  // TODO: estimate based on recent source activity
  // assume source won't exceed 25 new stories
  // before scheduled service call; default 5min
  // 300 stories take approx. 1-2 seconds to process
  NEW_STORY_MAX = 25

// TODO: abstract when additional data sources are introduced
export const processHackerNewsIngestStoryData = async (
  maxNewStories: number = NEW_STORY_MAX
) => {
  try {
    // get newest story IDs from HN API and trim to max
    const newStoriesById = (
        await axios.get<string[]>(HN_API_ENDPOINTS.NEW_STORIES)
      ).data.slice(0, maxNewStories),
      newStoriesToSaveToDb: string[] = []

    const { redisClient } = await useRedis(),
      { storyRepository, closeStoryRepository } = await useStoryRepository()

    // check if any stories exist in the db
    const existingStoriesById = await redisClient.json.mGet(
      newStoriesById.map((id) => `Story:${id}`),
      '$.id'
    )

    // if stories exists, filter from new stories to save to db
    existingStoriesById.map((foundId, index) => {
      if (!foundId) newStoriesToSaveToDb.push(newStoriesById[index])
    })

    // save new stories to db
    await Promise.all(
      newStoriesToSaveToDb.map(async (id) => {
        try {
          // get story data and story objects
          const [{ by, text, time, title, url }, newStory] = await Promise.all([
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
          newStory.source = HN_SOURCE_DOMAIN
          newStory.text = text ?? null
          newStory.title = title
          newStory.url = url ?? null
          newStory.createdAt = time

          // save
          await storyRepository.save(newStory)
        } catch (error) {
          // TODO: handle error
          console.error(error)
        }
      })
    )

    await closeStoryRepository()
    await redisClient.disconnect()

    // done!
    console.info(`Saved ${newStoriesToSaveToDb.length} new stories to DB...`)

    return { success: true }
  } catch (error) {
    console.error(error)

    if (isAxiosError(error)) {
      return { success: false, error: error.message }
    } else {
      return { success: false, error: (error as Error).message }
    }
  }
}
