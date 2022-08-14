import { Entity, Schema } from 'redis-om'
import redis from '../client'

interface Story {
  id: string
  domain: string | null
  poster: string
  score: number
  source: string
  text: string | null
  title: string
  total_comments: number
  url: string | null
  created: number
}

class Story extends Entity {}

const story = async () => {
  const { omClient: redisOmClient } = await redis(),
    storySchema = new Schema(Story, {
      id: { type: 'string' },
      domain: { type: 'string' },
      poster: { type: 'text' },
      score: { type: 'number' },
      source: { type: 'string' },
      text: { type: 'text' },
      title: { type: 'text' },
      total_comments: { type: 'number' },
      url: { type: 'string' },
      created: { type: 'date' }
    })

  const storyRepository = redisOmClient.fetchRepository(storySchema)

  await storyRepository.createIndex()

  return {
    repository: storyRepository,
    closeRepository: async () => await redisOmClient.close()
  }
}

export default story
