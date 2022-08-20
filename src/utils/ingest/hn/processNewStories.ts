import axios from 'axios'

import { DATA_SOURCE, MEATBALLS_DB_KEY } from '@/types/constants'

import { redisClient } from '@/redis/clients'
import { storyRepository } from '@/redis/om/story'

import { isAxiosError } from '@/utils/api'

import { getKeysToSave, SOURCE_REQUEST_HEADERS } from '..'
import type { HackerNewsNativeStoryData } from '.'
import { HN_API_ENDPOINTS, HN_SOURCE_DOMAIN } from '.'
import { processUserActivity } from '.'

// param(s) describe boundaries
// e.g. process latest 10 stories out of 500 returned from HN
// TODO: abstract when additional data sources are introduced
// benchmark: ~1-2.5s (limit=10)
const processNewStories = async (limit?: number) => {
  let success = false,
    totalNewStoriesSaved = 0,
    totalNewUsersSaved = 0

  try {
    console.info(
      `[INFO:NewStories:${DATA_SOURCE.HN}] requesting new stories...`
    )

    // get newest story IDs from HN API and trim to limit
    // i.e. we don't always want to process 500 stories
    const newNativeSourceStoriesById = (
      await axios.get<string[] | null>(HN_API_ENDPOINTS.NEW_STORIES_NATIVE, {
        headers: { ...SOURCE_REQUEST_HEADERS }
      })
    ).data

    if (!newNativeSourceStoriesById) {
      throw `[ERROR:NewStories:${DATA_SOURCE.HN}] unable to process new stories from native source; stories missing...`
    }

    const newNativeSourceStoriesByIdTrimmedToLimit = [
        ...newNativeSourceStoriesById.slice(
          0,
          limit || newNativeSourceStoriesById.length
        )
      ],
      newNativeSourceStoriesToSaveToDb = await getKeysToSave(
        newNativeSourceStoriesByIdTrimmedToLimit,
        'Story'
      )

    // save new stories to db
    await Promise.all(
      newNativeSourceStoriesToSaveToDb.map(async (nativeStoryId) => {
        try {
          console.info(
            `[INFO:NewStories:${DATA_SOURCE.HN}] requesting story data for "${nativeStoryId}"...`
          )

          // get story data and story objects
          const { data: nativeSourceStory } =
            await axios.get<HackerNewsNativeStoryData | null>(
              HN_API_ENDPOINTS.STORY_BY_ID_NATIVE(nativeStoryId),
              { headers: { ...SOURCE_REQUEST_HEADERS } }
            )

          if (!nativeSourceStory) {
            throw `[ERROR:NewStories:${DATA_SOURCE.HN}] unable to process new story from native source story "${nativeStoryId}"; story missing...`
          }

          const {
              by: nativeUserId,
              dead,
              deleted,
              descendants: comment_total,
              score: storyScore,
              text: content,
              time: created,
              title,
              url
            } = nativeSourceStory,
            newStory = await storyRepository.fetch(
              `${DATA_SOURCE.HN}:${nativeStoryId}`
            )

          // map data to object
          newStory.content = content ?? null
          newStory.title = title ?? null

          // get source user data to relate in graph
          let foundSourceUser

          if (nativeUserId) {
            // user activity processor will create a new user if none exists
            const {
              success,
              data: { updatedUser: sourceUser, isNew: sourceUserIsNew }
            } = await processUserActivity(nativeUserId)

            if (success) {
              foundSourceUser = sourceUser

              if (sourceUser && sourceUserIsNew) {
                totalNewUsersSaved++
              }
            }
          }

          await Promise.all([
            // save object to JSON
            storyRepository.save(newStory),
            // save data to graph
            redisClient.graph.query(
              `${MEATBALLS_DB_KEY.GRAPH}`,
              // https://neo4j.com/docs/cypher-manual/current/
              `
              // create or merge nodes
              // RedisGraph doesn't yet support unique constraints?
              // assume no duplicates based on newStoriesToSaveToDb
              // preference for full variable names due to length of query
              // TODO: check if nodes exists
              ${
                foundSourceUser
                  ? `MATCH (user:User { name: "${foundSourceUser.id}"})`
                  : ''
              }
              
              MERGE (story:Story {
                name: "${DATA_SOURCE.HN}:${nativeStoryId}",
                comment_total: ${comment_total ?? 0},
                created: ${created}, // seconds
                locked: ${dead ?? false},
                deleted: ${deleted ?? false},
                score: ${storyScore ?? 0}
              })

              MERGE (source:Source {
                name: "${HN_SOURCE_DOMAIN}"
              })

              MERGE (url:Url {
                name: "${
                  url
                    ? new URL(url).hostname.replace('www.', '')
                    : HN_SOURCE_DOMAIN
                }",
                address: "${url}"
              })

              // create or merge relationships
              // TODO: check if relationships exist
              ${
                foundSourceUser
                  ? `
                  MERGE (user)-[:CREATED]->(story)-[:CREATED_BY]->(user)
                  MERGE (user)-[:USER_OF]->(source)-[:USED_BY]->(user)
                  `
                  : ''
              }
              MERGE (source)-[:HOSTS]->(story)-[:HOSTED_BY]->(source)
              MERGE (story)-[:POINTS_TO]->(url)-[:COMES_FROM]->(story)
              `
            )
          ])

          console.info(
            `[INFO:NewStories:${DATA_SOURCE.HN}] saved new story "${nativeStoryId}" to DB...`
          )
        } catch (error) {
          console.error(error)

          throw error
        }
      })
    )

    totalNewStoriesSaved = newNativeSourceStoriesToSaveToDb.length

    success = true
  } catch (error) {
    let errorMessage = isAxiosError(error)
      ? error.message
      : (error as Error).message

    console.error(
      `[ERROR:NewStories:${DATA_SOURCE.HN}] limit: ${limit}, error: ${errorMessage}`
    )
    console.error(error)

    throw errorMessage
  } finally {
    console.info(
      `[INFO:NewStories:${DATA_SOURCE.HN}] saved ${totalNewStoriesSaved} new stories to DB...`
    )
    console.info(
      `[INFO:NewStories:${DATA_SOURCE.HN}] saved ${totalNewUsersSaved} new users to DB...`
    )

    return {
      success,
      data: {
        totalNewStoriesSaved,
        totalNewUsersSaved
      }
    }
  }
}

export default processNewStories
