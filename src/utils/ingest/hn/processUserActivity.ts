import { DATA_SOURCE, MEATBALLS_DB_KEY } from '@/types/constants'

import { redisClient } from '@/redis/clients'

import { processNewUser } from '.'

const processUserActivity = async (sourceUserId: string) => {
  let success = false,
    updatedUser

  try {
    const {
      success: processNewUserSuccess,
      data: { sourceUser, isNew }
    } = await processNewUser(sourceUserId)

    // if user exists, look up in graph and update score if necessary
    // otherwise, assume the user is new w/ fresh data and skip
    if (sourceUser && !isNew) {
      // sourceUser is latest data from source
      // get data from DB and compare
      const existingUser = (
        await redisClient.graph.query(
          `${MEATBALLS_DB_KEY.GRAPH}`,
          `
        MATCH (u:User { name: "${sourceUserId}" })
        RETURN u.score
        `
        )
      ).data

      if (sourceUser.karma !== existingUser[0][0]) {
        console.info(
          `[INFO:UserActivity:${DATA_SOURCE.HN}] updating existing user "${sourceUserId}"...`
        )

        await redisClient.graph.query(
          `${MEATBALLS_DB_KEY.GRAPH}`,
          `
          MERGE (u:User { name: "${sourceUserId}"})
          ON MATCH
            SET
              u.score = ${sourceUser.karma}
          `
        )
      }
    }

    // user is new w/ fresh data
    if (isNew) {
      updatedUser = sourceUser
    }

    success = true
  } catch (error) {
    console.error(error)
  } finally {
    return { success, data: { updatedUser } }
  }
}

export default processUserActivity
