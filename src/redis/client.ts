import { createClient } from 'redis'
import { Client } from 'redis-om'

const redis = async () => {
  const client = createClient({ url: process.env.REDIS_DB_URL })

  await client.connect()

  const omClient = await new Client().use(client)

  return { client, omClient }
}

export default redis
