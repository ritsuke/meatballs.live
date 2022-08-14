import { Entity, Schema } from 'redis-om'
import redis from '../client'

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

const story = async () => {
  const { omClient: redisOmClient } = await redis(),
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
    repository: storyRepository,
    closeRepository: async () => await redisOmClient.close()
  }
}

export default story
