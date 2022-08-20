// NOTE: it shouldn't be necessary to call this processor directly
// user activity processor is higher order

import axios from 'axios'

import { DATA_SOURCE, MEATBALLS_DB_KEY } from '@/types/constants'

import { redisClient } from '@/redis/clients'
import { userRepository } from '@/redis/om/user'

import { isAxiosError } from '@/utils/api'

import { SOURCE_REQUEST_HEADERS } from '..'
import type { HackerNewsNativeUserData } from '.'
import { HN_API_ENDPOINTS } from '.'

const processNewUser = async (sourceUserId: string) => {
  let success = false,
    sourceUser,
    isNew = true

  try {
    console.info(
      `[INFO:NewUser:${DATA_SOURCE.HN}] requesting user data for "${sourceUserId}"...`
    )

    sourceUser = (
      await axios.get<HackerNewsNativeUserData>(
        HN_API_ENDPOINTS.USER_BY_ID_NATIVE(sourceUserId),
        { headers: { ...SOURCE_REQUEST_HEADERS } }
      )
    ).data

    if (
      (await redisClient.exists(`User:${DATA_SOURCE.HN}:${sourceUser.id}`)) ===
      1
    ) {
      isNew = false
    }

    // save new user data
    if (
      sourceUser &&
      (await redisClient.exists(`User:${DATA_SOURCE.HN}:${sourceUser.id}`)) ===
        0
    ) {
      const newUser = await userRepository.fetch(
        `${DATA_SOURCE.HN}:${sourceUser.id}`
      )

      newUser.about = sourceUser.about ?? null

      await Promise.all([
        userRepository.save(newUser),
        redisClient.graph.query(
          `${MEATBALLS_DB_KEY.GRAPH}`,
          `MERGE (user:User { name: "${sourceUser.id}", created: ${sourceUser.created}, score: ${sourceUser.karma} })`
        )
      ])

      console.info(
        `[INFO:NewUser:${DATA_SOURCE.HN}] saved new user "${sourceUser.id}" to DB...`
      )
    }

    success = true
  } catch (error) {
    console.error(error)

    throw isAxiosError(error) ? error.message : (error as Error).message
  } finally {
    return {
      success,
      data: {
        sourceUser,
        // user already exists in database
        // and may require an update
        // see user activity processor
        isNew
      }
    }
  }
}

export default processNewUser
