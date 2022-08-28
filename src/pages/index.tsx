import { useState } from 'react'
import type {
  GetServerSideProps,
  GetServerSidePropsResult,
  NextPage
} from 'next'
import Head from 'next/head'
import Link from 'next/link'
import classnames from 'classnames'
import { useListener } from '@casper124578/use-socket.io'

import { MEATBALLS_CHANNEL_KEY } from '@/types/constants'
import { getCollectionsUrlFromYMDKey } from '@/utils/collections'

type IndexPageProps = {
  data: {
    collectionsDateKey: string | null
  }
}

export const getServerSideProps: GetServerSideProps = async (): Promise<
  GetServerSidePropsResult<IndexPageProps>
> => {
  return {
    props: {
      data: {
        collectionsDateKey: `2022:8:23`
        // TODO: starting with the 23rd
        // process.env.MEATBALLS_COLLECTIONS_START_DATE_KEY || null
      }
    }
  }
}

const IndexPage: NextPage<IndexPageProps> = ({
  data: { collectionsDateKey }
}) => {
  const [meatballsMade, setMeatballsMade] = useState<undefined | number>(
    undefined
  )

  useListener(MEATBALLS_CHANNEL_KEY.FRONTPAGE_STREAM, (message) => {
    setMeatballsMade(JSON.parse(message).meatballs)
  })

  return (
    <div>
      <Head>
        <title>meatballs.live &mdash; makin&apos; meatballs since 2022</title>
        <meta
          name="description"
          content="meatballs.live remixes social news data to uncover new insights."
        />
      </Head>

      <main
        className={
          'w-0 min-w-full p-10 sm:w-full sm:h-screen sm:m-0 sm:grid sm:place-content-center'
        }
      >
        <div className={classnames('max-w-xl')}>
          <div className={classnames('text-5xl sm:text-7xl mb-12')}>
            Remix <strong className={classnames('text-primary')}>your</strong>{' '}
            social news experience.
          </div>
          <div
            className={classnames(
              'text-xl sm:text-2xl sm:leading-10 font-serif italic mb-6'
            )}
          >
            <strong className={classnames('text-primary not-italic font-sans')}>
              meatballs
            </strong>{' '}
            is an automated,{' '}
            <a
              href="https://github.com/ritsuke/meatballs.live"
              className={classnames(
                'underline underline-offset-4 decoration-primary'
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              open-source
            </a>{' '}
            network surfacing interesting conversation.
          </div>

          <div className={classnames('mb-12')}>
            <>
              The network currently supports{' '}
              <a
                href="https://news.ycombinator.com"
                className={classnames('font-bold decoration-hn')}
                target="_blank"
                rel="noopener noreferrer"
              >
                Hacker News
              </a>
            </>{' '}
            {meatballsMade && (
              <>
                and has made{' '}
                <a
                  className={classnames('font-bold')}
                  href="https://dev.to/ritsuke/remix-social-news-with-redis-cloud-299l"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {meatballsMade.toLocaleString()}
                </a>{' '}
                meatballs since August 22nd 2022
              </>
            )}
            . 🤖
          </div>

          <div className={classnames('mb-6')}>
            {collectionsDateKey && (
              <>
                <Link
                  href={`${getCollectionsUrlFromYMDKey(collectionsDateKey)}`}
                >
                  <a
                    className={classnames(
                      'underline underline-offset-4 decoration-primary'
                    )}
                  >
                    collections
                  </a>
                </Link>
                <span className={classnames('mx-3 text-gray-700')}>|</span>
              </>
            )}
            <a
              className={classnames(
                'underline underline-offset-4 decoration-primary'
              )}
              href="https://dev.to/ritsuke/remix-social-news-with-redis-cloud-299l"
              target="_blank"
              rel="noopener noreferrer"
            >
              about
            </a>
            <span className={classnames('mx-3 text-gray-700')}>|</span>{' '}
            <Link href="/terms/">
              <a
                className={classnames(
                  'underline underline-offset-4 decoration-primary'
                )}
              >
                terms
              </a>
            </Link>
            <span className={classnames('mx-3 text-gray-700')}>|</span>{' '}
            <a
              href="https://www.buymeacoffee.com/ritsuke"
              className={classnames('text-primary')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
                className={classnames('inline')}
              >
                <path
                  fillRule="evenodd"
                  d="M.5 6a.5.5 0 0 0-.488.608l1.652 7.434A2.5 2.5 0 0 0 4.104 16h5.792a2.5 2.5 0 0 0 2.44-1.958l.131-.59a3 3 0 0 0 1.3-5.854l.221-.99A.5.5 0 0 0 13.5 6H.5ZM13 12.5a2.01 2.01 0 0 1-.316-.025l.867-3.898A2.001 2.001 0 0 1 13 12.5ZM2.64 13.825 1.123 7h11.754l-1.517 6.825A1.5 1.5 0 0 1 9.896 15H4.104a1.5 1.5 0 0 1-1.464-1.175Z"
                />
                <path d="m4.4.8-.003.004-.014.019a4.167 4.167 0 0 0-.204.31 2.327 2.327 0 0 0-.141.267c-.026.06-.034.092-.037.103v.004a.593.593 0 0 0 .091.248c.075.133.178.272.308.445l.01.012c.118.158.26.347.37.543.112.2.22.455.22.745 0 .188-.065.368-.119.494a3.31 3.31 0 0 1-.202.388 5.444 5.444 0 0 1-.253.382l-.018.025-.005.008-.002.002A.5.5 0 0 1 3.6 4.2l.003-.004.014-.019a4.149 4.149 0 0 0 .204-.31 2.06 2.06 0 0 0 .141-.267c.026-.06.034-.092.037-.103a.593.593 0 0 0-.09-.252A4.334 4.334 0 0 0 3.6 2.8l-.01-.012a5.099 5.099 0 0 1-.37-.543A1.53 1.53 0 0 1 3 1.5c0-.188.065-.368.119-.494.059-.138.134-.274.202-.388a5.446 5.446 0 0 1 .253-.382l.025-.035A.5.5 0 0 1 4.4.8Zm3 0-.003.004-.014.019a4.167 4.167 0 0 0-.204.31 2.327 2.327 0 0 0-.141.267c-.026.06-.034.092-.037.103v.004a.593.593 0 0 0 .091.248c.075.133.178.272.308.445l.01.012c.118.158.26.347.37.543.112.2.22.455.22.745 0 .188-.065.368-.119.494a3.31 3.31 0 0 1-.202.388 5.444 5.444 0 0 1-.253.382l-.018.025-.005.008-.002.002A.5.5 0 0 1 6.6 4.2l.003-.004.014-.019a4.149 4.149 0 0 0 .204-.31 2.06 2.06 0 0 0 .141-.267c.026-.06.034-.092.037-.103a.593.593 0 0 0-.09-.252A4.334 4.334 0 0 0 6.6 2.8l-.01-.012a5.099 5.099 0 0 1-.37-.543A1.53 1.53 0 0 1 6 1.5c0-.188.065-.368.119-.494.059-.138.134-.274.202-.388a5.446 5.446 0 0 1 .253-.382l.025-.035A.5.5 0 0 1 7.4.8Zm3 0-.003.004-.014.019a4.077 4.077 0 0 0-.204.31 2.337 2.337 0 0 0-.141.267c-.026.06-.034.092-.037.103v.004a.593.593 0 0 0 .091.248c.075.133.178.272.308.445l.01.012c.118.158.26.347.37.543.112.2.22.455.22.745 0 .188-.065.368-.119.494a3.198 3.198 0 0 1-.202.388 5.385 5.385 0 0 1-.252.382l-.019.025-.005.008-.002.002A.5.5 0 0 1 9.6 4.2l.003-.004.014-.019a4.149 4.149 0 0 0 .204-.31 2.06 2.06 0 0 0 .141-.267c.026-.06.034-.092.037-.103a.593.593 0 0 0-.09-.252A4.334 4.334 0 0 0 9.6 2.8l-.01-.012a5.099 5.099 0 0 1-.37-.543A1.53 1.53 0 0 1 9 1.5c0-.188.065-.368.119-.494.059-.138.134-.274.202-.388a5.446 5.446 0 0 1 .253-.382l.025-.035A.5.5 0 0 1 10.4.8Z" />
              </svg>
            </a>
          </div>

          <div
            className={classnames('visible sm:hidden text-sm text-gray-700')}
          >
            For the complete experience, use your desktop or tablet.
          </div>
        </div>
      </main>
    </div>
  )
}

export default IndexPage
