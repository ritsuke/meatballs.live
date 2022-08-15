import { Entity, Schema } from 'redis-om'
import redis from '../client'

interface Story {
  id: string
  deleted?: boolean
  domain: string | null
  poster: string | null
  score: number | null
  source: string
  text: string | null
  title: string | null
  comment_total: number | null
  url: string | null
  created: number
}

class Story extends Entity {}

const story = async () => {
  const { omClient: redisOmClient } = await redis(),
    storySchema = new Schema(Story, {
      id: { type: 'string' },
      deleted: { type: 'boolean' },
      domain: { type: 'string' },
      poster: { type: 'text' },
      score: { type: 'number' },
      source: { type: 'string' },
      text: { type: 'text' },
      title: { type: 'text' },
      comment_total: { type: 'number' },
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
