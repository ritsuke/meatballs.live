import type {
  GetServerSideProps,
  GetServerSidePropsResult,
  NextPage
} from 'next'
import dynamic from 'next/dynamic'
import classnames from 'classnames'
import Link from 'next/link'

import { redisClient } from '@/redis/clients'
import { Collection } from '@/redis/om/collection'
import {
  CollectionDate,
  parseCollectionParamsFromParsedUrlQuery
} from '@/utils/collections'
import { BlurhashCanvas } from 'react-blurhash'

const CollectionCoverImage = dynamic(
  () => import('@/components/CollectionCoverImage'),
  {
    ssr: false
  }
)

type CollectionsByDayIndexProps = {
  data: {
    previous?: string // previous collections date url
    next?: string // next collections date url
    benchmark: number // time to generate in milliseconds
    date: CollectionDate
    collections?: Collection[]
  }
}

export const getServerSideProps: GetServerSideProps = async ({
  params
}): Promise<GetServerSidePropsResult<CollectionsByDayIndexProps>> => {
  if (!params) throw 'missing parameters...'

  const benchmarkStartTime = Date.now()

  const { year, month, day } = parseCollectionParamsFromParsedUrlQuery(params)

  if (year === undefined || month === undefined || day === undefined)
    throw 'missing collections date'

  const cache = await redisClient.get(
    `Collection:${year}:${month}:${day}:_cache`
  )

  if (cache) {
    return {
      props: {
        data: {
          benchmark: Date.now() - benchmarkStartTime,
          date: { year, month, day },
          collections: JSON.parse(cache)
        }
      }
    }
  }

  return {
    notFound: true
  }
}

const CollectionsByDayIndex: NextPage<CollectionsByDayIndexProps> = ({
  data
}) => {
  const { year, month, day } = data.date

  return (
    <div className={classnames('max-w-[1050px] mx-auto')}>
      <div
        className={classnames('w-full h-20', 'grid grid-cols-3 items-center')}
      >
        <div className={classnames('text-2xl font-bold self-center')}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className={classnames('inline m-0 sm:mr-3', 'text-primary')}
          >
            <circle cx="8" cy="8" r="8" />
          </svg>
          <span className={classnames('hidden sm:inline')}>
            <Link href="/">meatballs</Link>
          </span>
        </div>

        <div
          className={classnames(
            'justify-self-center h-11 w-[438px]',
            'grid grid-cols-[44px_44px_262px_44px_44px] place-items-center'
          )}
        >
          <div
            className={classnames(
              'h-full w-full',
              'grid place-content-center',
              'hover:cursor-pointer'
            )}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.85355 3.85355C7.04882 3.65829 7.04882 3.34171 6.85355 3.14645C6.65829 2.95118 6.34171 2.95118 6.14645 3.14645L2.14645 7.14645C1.95118 7.34171 1.95118 7.65829 2.14645 7.85355L6.14645 11.8536C6.34171 12.0488 6.65829 12.0488 6.85355 11.8536C7.04882 11.6583 7.04882 11.3417 6.85355 11.1464L3.20711 7.5L6.85355 3.85355ZM12.8536 3.85355C13.0488 3.65829 13.0488 3.34171 12.8536 3.14645C12.6583 2.95118 12.3417 2.95118 12.1464 3.14645L8.14645 7.14645C7.95118 7.34171 7.95118 7.65829 8.14645 7.85355L12.1464 11.8536C12.3417 12.0488 12.6583 12.0488 12.8536 11.8536C13.0488 11.6583 13.0488 11.3417 12.8536 11.1464L9.20711 7.5L12.8536 3.85355Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
          <div
            className={classnames(
              'h-full w-full',
              'grid place-content-center',
              'hover:cursor-pointer'
            )}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
          <div className={classnames('text-center text-sm')}>
            {year} : {month} : {day}{' '}
          </div>
          <div
            className={classnames(
              'h-full w-full',
              'grid place-content-center',
              'hover:cursor-pointer'
            )}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
          <div
            className={classnames(
              'h-full w-full',
              'grid place-content-center',
              'hover:cursor-pointer'
            )}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
        </div>
        <div
          className={classnames(
            'w-11 h-11',
            'justify-self-end grid content-center justify-end',
            'hover:cursor-pointer'
          )}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.49991 0.876892C3.84222 0.876892 0.877075 3.84204 0.877075 7.49972C0.877075 11.1574 3.84222 14.1226 7.49991 14.1226C11.1576 14.1226 14.1227 11.1574 14.1227 7.49972C14.1227 3.84204 11.1576 0.876892 7.49991 0.876892ZM1.82707 7.49972C1.82707 4.36671 4.36689 1.82689 7.49991 1.82689C10.6329 1.82689 13.1727 4.36671 13.1727 7.49972C13.1727 10.6327 10.6329 13.1726 7.49991 13.1726C4.36689 13.1726 1.82707 10.6327 1.82707 7.49972ZM8.24992 4.49999C8.24992 4.9142 7.91413 5.24999 7.49992 5.24999C7.08571 5.24999 6.74992 4.9142 6.74992 4.49999C6.74992 4.08577 7.08571 3.74999 7.49992 3.74999C7.91413 3.74999 8.24992 4.08577 8.24992 4.49999ZM6.00003 5.99999H6.50003H7.50003C7.77618 5.99999 8.00003 6.22384 8.00003 6.49999V9.99999H8.50003H9.00003V11H8.50003H7.50003H6.50003H6.00003V9.99999H6.50003H7.00003V6.99999H6.50003H6.00003V5.99999Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            ></path>
          </svg>
        </div>
      </div>

      <div
        className={classnames(
          'grid md:grid-cols-2 lg:grid-cols-3 min-h-[966px]'
        )}
      >
        {data.collections &&
          data.collections.map((collection, index) => (
            <div key={index} className={classnames('relative')}>
              <BlurhashCanvas
                hash={collection.image_blur_hash}
                className={classnames('w-full')}
                punch={1}
              />

              <div
                className={classnames('absolute left-0 top-0 w-full h-full')}
              >
                <CollectionCoverImage
                  year={year}
                  month={month}
                  day={day}
                  collection={collection}
                />
              </div>
            </div>
          ))}
      </div>

      {/* {data.benchmark && ( */}
      <div className={classnames('py-4', 'text-gray-600 text-center text-xs')}>
        rendered from cache in {data.benchmark / 1000} seconds
      </div>
      {/* )} */}
    </div>
  )
}

export default CollectionsByDayIndex
