import NextAuth from 'next-auth'
import { UpstashRedisAdapter } from '@next-auth/upstash-redis-adapter'
import { Redis } from '@upstash/redis'
import GithubProvider from 'next-auth/providers/github'

import type { NextAuthOptions } from 'next-auth'

const options: NextAuthOptions = {
  adapter: UpstashRedisAdapter(
    new Redis({
      url: process.env.UPSTASH_REDIS_AUTH_REST_URL as string,
      token: process.env.UPSTASH_REDIS_AUTH_REST_TOKEN as string
    }),
    { baseKeyPrefix: process.env.UPSTASH_REDIS_AUTH_PREFIX }
  ),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string
    })
  ]
}

export default NextAuth(options)
