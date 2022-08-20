import { Entity, Schema } from 'redis-om'

import { redisOmClient } from '../clients'

export interface Comment {
  text: string | null
}

export class Comment extends Entity {}

const commentSchema = new Schema(Comment, {
  text: { type: 'text' }
})

export const commentRepository = redisOmClient.fetchRepository(commentSchema)
