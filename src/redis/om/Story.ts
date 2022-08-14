import { Entity, Schema } from 'redis-om'
import useRedis from '../useRedis'

interface Story {
  id: string
  domain: string | null
  poster: string
  source: string
  text: string | null
  title: string
  url: string | null
  createdAt: number
}

class Story extends Entity {}

const useStoryRepository = async () => {
  const { redisOmClient } = await useRedis(),
    storySchema = new Schema(Story, {
      id: { type: 'string' },
      domain: { type: 'string' },
      poster: { type: 'text' },
      source: { type: 'string' },
      text: { type: 'text' },
      title: { type: 'text' },
      url: { type: 'string' },
      createdAt: { type: 'date' }
    })

  const storyRepository = redisOmClient.fetchRepository(storySchema)

  await storyRepository.createIndex()

  return {
    storyRepository,
    closeStoryRepository: async () => await redisOmClient.close()
  }
}

export default useStoryRepository
