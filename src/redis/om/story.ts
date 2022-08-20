import { Entity, Schema } from 'redis-om'

import { redisOmClient } from '../clients'

export interface Story {
  text: string | null
  title: string | null
}

export class Story extends Entity {}

const storySchema = new Schema(Story, {
  text: { type: 'text' },
  title: { type: 'text' }
})

export const storyRepository = redisOmClient.fetchRepository(storySchema)

await storyRepository.createIndex()
