import NextAuth from 'next-auth'
import { UpstashRedisAdapter } from '@next-auth/upstash-redis-adapter'
import { Redis } from '@upstash/redis'
import GithubProvider from 'next-auth/providers/github'

import type { NextAuthOptions } from 'next-auth'
import axios from 'axios'

export const authOptions: NextAuthOptions = {
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
  ],
  callbacks: {
    session: async ({ session, user }) => {
      // TODO: not a long term solution
      // https://github.com/nextauthjs/next-auth/discussions/536
      // https://stackoverflow.com/a/71105736/210675
      if (user.image) {
        try {
          const { data } = await axios.get<{ login: string }>(
            `https://api.github.com/user/${user.image
              ?.replace('https://avatars.githubusercontent.com/u/', '')
              .replace('?v=4', '')}`
          )

          user.username = data.login
        } catch (error) {
          console.error(error)
        }
      }

      return {
        ...session,
        user: user
      }
    }
  }
}

export default NextAuth(authOptions)
