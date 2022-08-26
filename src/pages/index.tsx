import Head from 'next/head'
import type { NextPage } from 'next'
import classnames from 'classnames'

import { redisClient } from '@/redis/clients'
import { MEATBALLS_DB_KEY } from '@/types/constants'

type IndexProps = {
  data: {
    totalMeatballsMade?: number
  }
}

export const getServerSideProps = async () => {
  const previewKey = '_cache:preview'

  const previewCacheValue = await redisClient.get(previewKey)

  if (previewCacheValue) {
    return {
      props: {
        data: {
          totalMeatballsMade: parseInt(previewCacheValue)
        }
      }
    }
  }

  const totalMeatballsMade = (
    await redisClient.graph.query(
      MEATBALLS_DB_KEY.GRAPH,
      `MATCH (n) RETURN count(n)`
    )
  ).data[0][0]

  if (typeof totalMeatballsMade === 'number') {
    await redisClient.set(previewKey, String(totalMeatballsMade), { EX: 60 })
  }

  return {
    props: {
      data: {
        totalMeatballsMade: parseInt(`${totalMeatballsMade}` || '0')
      }
    }
  }
}

const Index: NextPage<IndexProps> = ({ data }) => {
  return (
    <div>
      <Head>
        <title>meatballs.live &mdash; makin&apos; meatballs since 2022</title>
        <meta
          name="description"
          content="meatballs.live remixes social news data to uncover new insights."
        />
      </Head>

      <main className={'w-screen h-screen bg-black/80'}>
        <div
          className={classnames(
            'px-6',
            'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'text-center'
          )}
        >
          {data.totalMeatballsMade}{' '}
          <a
            href="https://dev.to/ritsuke/remix-social-news-with-redis-cloud-299l"
            className={classnames(
              'underline underline-offset-4 decoration-primary'
            )}
          >
            meatballs
          </a>{' '}
          made since August 22nd 2022
        </div>

        <footer
          className={classnames(
            'w-screen',
            'absolute bottom-2',
            'text-xs text-center'
          )}
        >
          <a href="https://ritsuke.dev">ritsuke.dev</a>
        </footer>
      </main>
    </div>
  )
}

export default Index
