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

const processNewComments = async (nativeSourceStoryId: string) => {
  let success = false

  try {
    console.info(
      `[INFO:NewComments:${DATA_SOURCE.HN}] requesting comments for native source story "${nativeSourceStoryId}" with user agent "${SOURCE_USER_AGENT}"...`
    )

    const { data: algoliaSourceStory } = await axios.get<{
      children: Array<HackerNewsNativeCommentData>
    } | null>(HN_API_ENDPOINTS.STORY_BY_ID_ALGOLIA(nativeSourceStoryId), {
      headers: { ...SOURCE_REQUEST_HEADERS }
    })

    if (!algoliaSourceStory) {
      throw `[ERROR:NewComments:${DATA_SOURCE.HN}] unable to process new comments from algolia from native source story "${nativeSourceStoryId}"; story missing...`
    }

    const { children: newComments } = algoliaSourceStory

    let newCommentsFlat = flattenComments(newComments),
      newCommentsToSaveToDb: string[] = await getKeysToSave(
        newCommentsFlat.map((comment) => {
          if (comment.id === undefined) {
            console.error(comment)
            throw `[ERROR:NewComments:${DATA_SOURCE.HN}] unable to get key to save; missing comment ID...`
          }

          return comment.id
        }),
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
            text: content
          } = newCommentsFlat[index],
          newComment = await commentRepository.fetch(
            `${DATA_SOURCE.HN}:${commentId}`
          )

        if (user === undefined) {
          throw `[ERROR:NewComments:${DATA_SOURCE.HN}] unable to process user activity; missing user ID...`
        }

        // save or update user
        const {
          data: { updatedUser }
        } = await processUserActivity(user)

        newComment.content = content ?? null

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

          MERGE (parent)-[:PROVOKED]->(comment)-[:REACTION_TO]->(parent)
          MERGE (user)-[:CREATED]->(comment)-[:CREATED_BY]->(user)
          RETURN comment
          `
        )
      })
    )

    success = true
  } catch (error) {
    let errorMessage = isAxiosError(error)
      ? error.message
      : (error as Error).message

    console.error(
      `[ERROR:NewComments:${DATA_SOURCE.HN}] nativeSourceStoryId: ${nativeSourceStoryId}, error: ${errorMessage}`
    )

    if (
      isAxiosError(error) &&
      error.response?.status === HTTP_STATUS_CODE.NOT_FOUND
    ) {
      console.warn(
        `[WARN:NewComments:${DATA_SOURCE.HN}] story "${nativeSourceStoryId}" has not propagated or is locked or deleted; skipping comments...`
      )

      return
    }

    console.error(error)

    throw errorMessage
  } finally {
    return {
      success,
      data: {}
    }
  }
}

export default processNewComments
