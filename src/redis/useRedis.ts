import { createClient } from 'redis'
import { Client } from 'redis-om'

//
const useRedis = async () => {
  const redisClient = createClient({ url: process.env.REDIS_DB_URL })

  await redisClient.connect()

  const redisOmClient = await new Client().use(redisClient)

  return { redisClient, redisOmClient }
}

export default useRedis
