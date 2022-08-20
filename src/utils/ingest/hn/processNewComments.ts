import axios from 'axios'

import {
  DATA_SOURCE,
  HTTP_STATUS_CODE,
  MEATBALLS_DB_KEY
} from '@/types/constants'

import { isAxiosError } from '@/utils/api'

import { redisClient } from '@/redis/clients'
import { commentRepository } from '@/redis/om/comment'

import { getKeysToSave, SOURCE_REQUEST_HEADERS, SOURCE_USER_AGENT } from '..'
import type { HackerNewsNativeCommentData } from '.'
import { HN_API_ENDPOINTS } from '.'
import { processUserActivity, flattenComments } from '.'

const processNewComments = async (nativeStoryId: string) => {
  let success = false

  try {
    console.info(
      `[INFO:NewComments:${DATA_SOURCE.HN}] requesting comments for story "${nativeStoryId}" with user agent "${SOURCE_USER_AGENT}"...`
    )

    const { children: newComments } = (
      await axios.get<{
        children: Array<HackerNewsNativeCommentData>
      }>(HN_API_ENDPOINTS.STORY_BY_ID_ALGOLIA(nativeStoryId), {
        headers: { ...SOURCE_REQUEST_HEADERS }
      })
    ).data

    let newCommentsFlat = flattenComments(newComments),
      newCommentsToSaveToDb: string[] = await getKeysToSave(
        newCommentsFlat.map((comment) => comment.id),
        'Comment'
      )

    await Promise.all(
      newCommentsToSaveToDb.map(async (commentId, index) => {
        console.info(
          `[INFO:NewComments:${DATA_SOURCE.HN}] requesting comment data for "${commentId}"...`
        )

        const {
            author: user,
            created_at_i: created,
            deleted,
            parent_id,
            text
          } = newCommentsFlat[index],
          newComment = await commentRepository.fetch(
            `${DATA_SOURCE.HN}:${commentId}`
          )

        // save or update user
        const {
          data: { updatedUser }
        } = await processUserActivity(user)

        newComment.text = text ?? null

        // save JSON
        await commentRepository.save(newComment)

        // save to graph
        await redisClient.graph.query(
          `${MEATBALLS_DB_KEY.GRAPH}`,
          `
          MATCH (parent { name: "${DATA_SOURCE.HN}:${parent_id}" })
          MATCH (user:User { name: "${user}" })
          
          MERGE (comment:Comment {
            name: "${DATA_SOURCE.HN}:${commentId}",
            created: ${created}, // seconds
            deleted: ${deleted ?? false}
          })

          MERGE (parent)-[:CONTAINS]->(comment)-[:REACTION_TO]->(parent)
          MERGE (user)-[:CREATED]->(comment)-[:CREATED_BY]->(user)
          RETURN comment
          `
        )
      })
    )

    success = true
  } catch (error) {
    if (
      isAxiosError(error) &&
      error.status === `${HTTP_STATUS_CODE.NOT_FOUND}`
    ) {
      console.warn(
        `[WARN:StoryActivity:${DATA_SOURCE.HN}] story "${nativeStoryId}" has not propagated; skipping comments...`
      )
    }
  } finally {
    return {
      success,
      data: {}
    }
  }
}

export default processNewComments
