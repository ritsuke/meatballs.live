import { useEffect, useRef, useState } from 'react'
import type {
  GetServerSideProps,
  GetServerSidePropsResult,
  NextPage
} from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import classnames from 'classnames'
import Link from 'next/link'
import add from 'date-fns/add'
import sub from 'date-fns/sub'
import { BlurhashCanvas } from 'react-blurhash'
import autoAnimate from '@formkit/auto-animate'

import { redisClient } from '@/redis/clients'
import { Collection } from '@/redis/om/collection'
import {
  getTimePartsFromYMDKey,
  getUTCTimeFromYMDKey,
  getYMDKeyFromUTCTime,
  parseCollectionParamsFromParsedUrlQuery
} from '@/utils/collections'

const CollectionsNavBar = dynamic(
    () => import('@/components/CollectionsNavBar')
  ),
  CollectionCoverImage = dynamic(
    () => import('@/components/CollectionCoverImage')
  ),
  CollectionModal = dynamic(() => import('@/components/CollectionModal'))

type SelectedCollection = {
  meta: Collection | null
  detail: string | null
}

type CollectionsByDayIndexProps = {
  data: {
    first: string | null
    previous: string | null // previous collections date url
    requested: string
    next: string | null // next collections date url
    last: string | null
    benchmark: number // time to generate in milliseconds
    collections: Collection[] | null
    selectedCollection: SelectedCollection | null
  }
}

export const getServerSideProps: GetServerSideProps = async ({
  params,
  query
}): Promise<GetServerSidePropsResult<CollectionsByDayIndexProps>> => {
  if (!params) throw 'missing parameters...'
  if (!process.env.MEATBALLS_COLLECTIONS_START_DATE_KEY)
    throw 'missing collections start date'

  const benchmarkStartTime = Date.now(),
    startDateKey = process.env.MEATBALLS_COLLECTIONS_START_DATE_KEY

  const { year, month, day } = parseCollectionParamsFromParsedUrlQuery(params)

  if (year === undefined || month === undefined || day === undefined)
    throw 'missing collections date'

  const requestedCollectionsCache = await redisClient.get(
    `Collection:${year}:${month}:${day}:_cache`
  )

  if (requestedCollectionsCache) {
    // checking which adjacent collections exist to for navigation
    // as the collection process is automated, with potential for
    // unattended failure, we want to disable navigation where necessary
    // TODO: notification via comment stream when new collections are ready
    const startDate = new Date(getUTCTimeFromYMDKey(startDateKey)),
      todaysDate = new Date(new Date(Date.now()).setUTCHours(0, 0, 0, 0)),
      requestedDate = new Date(getUTCTimeFromYMDKey(`${year}:${month}:${day}`))

    const firstCollectionsDateKey =
        requestedDate.getTime() !== startDate.getTime() ? startDateKey : null,
      previousCollectionsDateKey =
        requestedDate > startDate
          ? getYMDKeyFromUTCTime(sub(requestedDate, { days: 1 }).getTime())
          : null,
      nextCollectionsDateKey =
        requestedDate.getTime() < sub(todaysDate, { days: 1 }).getTime()
          ? getYMDKeyFromUTCTime(add(requestedDate, { days: 1 }).getTime())
          : null,
      lastCollectionsDateKey =
        requestedDate.getTime() < sub(todaysDate, { days: 1 }).getTime()
          ? getYMDKeyFromUTCTime(sub(todaysDate, { days: 1 }).getTime())
          : null

    // this check adds ~50ms
    const [
      firstCollectionsExist,
      previousCollectionsExist,
      nextCollectionsExist,
      lastCollectionsExist
    ] = await Promise.all([
      redisClient.exists(`Collection:${firstCollectionsDateKey}:_cache`),
      redisClient.exists(`Collection:${previousCollectionsDateKey}:_cache`),
      redisClient.exists(`Collection:${nextCollectionsDateKey}:_cache`),
      redisClient.exists(`Collection:${lastCollectionsDateKey}:_cache`)
    ])

    const collections = JSON.parse(requestedCollectionsCache) as Collection[]

    const slug = query?.slug?.length === 1 ? query.slug[0] : undefined,
      lastDashIndex = slug?.lastIndexOf('-'),
      idFromSlug =
        lastDashIndex && lastDashIndex !== -1
          ? slug?.substring(lastDashIndex + 1)
          : undefined

    const selectedCollectionMeta =
      collections.find((collection) => slug === collection.slug) || null

    const selectedCollectionDetail = selectedCollectionMeta
      ? await redisClient.get(
          `Collection:${year}:${month}:${day}:${idFromSlug}:_cache`
        )
      : null

    return {
      props: {
        data: {
          first: firstCollectionsExist === 1 ? firstCollectionsDateKey : null,
          previous:
            previousCollectionsExist === 1 ? previousCollectionsDateKey : null,
          requested: `${year}:${month}:${day}`,
          next: nextCollectionsExist === 1 ? nextCollectionsDateKey : null,
          last: lastCollectionsExist === 1 ? lastCollectionsDateKey : null,
          benchmark: Date.now() - benchmarkStartTime,
          collections,
          selectedCollection: {
            meta: selectedCollectionMeta,
            detail: selectedCollectionDetail
          }
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
  const containerRef = useRef<HTMLDivElement>(null)

  const { first, previous, requested, next, last } = data,
    { year, month, day } = getTimePartsFromYMDKey(requested)

  const { push, query } = useRouter()

  const [selectedCollection, setSelectedCollection] =
    useState<null | SelectedCollection>(null)

  useEffect(() => {
    setSelectedCollection(data.selectedCollection)
  }, [data.selectedCollection])

  useEffect(() => {
    containerRef.current && autoAnimate(containerRef.current, { duration: 100 })
  }, [containerRef])

  return (
    <>
      <Head>
        <title>
          {selectedCollection?.meta
            ? `${selectedCollection.meta.title} | meatballs.live`
            : `Collections for ${new Date(
                year,
                month - 1,
                day
              ).toLocaleDateString('en-us', {
                dateStyle: 'full'
              })}
          } | meatballs.live`}
        </title>
      </Head>

      <div ref={containerRef}>
        {selectedCollection?.meta && selectedCollection?.detail && (
          <>
            <div
              className={classnames(
                'fixed h-full left-0 right-0 sm:right-96',
                'bg-black bg-cover bg-no-repeat'
              )}
              style={{
                backgroundImage: `url(${
                  selectedCollection.meta.image_url
                }&w=500&dpr=${2})`
              }}
            >
              <div
                className={classnames(
                  'top-0 w-full h-full backdrop-blur-lg bg-black/80 p-11'
                )}
              />
            </div>

            <div>
              <CollectionModal
                meta={selectedCollection.meta}
                detail={selectedCollection.detail}
                open={selectedCollection ? true : false}
                onClose={() =>
                  push(`/c/${query.year}/${query.month}/${query.day}/`)
                }
              />
            </div>
          </>
        )}

        {!selectedCollection?.meta && !selectedCollection?.detail && (
          <div className={classnames('w-full')}>
            <CollectionsNavBar
              first={first}
              previous={previous}
              selected={requested}
              next={next}
              last={last}
            />

            <div className={classnames('max-w-[1050px] mx-auto')}>
              <div
                className={classnames(
                  'grid md:grid-cols-2 lg:grid-cols-3 min-h-[966px]'
                )}
              >
                {data.collections &&
                  data.collections.map((collection, index) => (
                    <div key={index} className={classnames('relative')}>
                      {collection.image_blur_hash && (
                        <BlurhashCanvas
                          hash={collection.image_blur_hash}
                          className={classnames('w-full')}
                          punch={1}
                        />
                      )}

                      <div
                        className={classnames(
                          'absolute left-0 top-0 w-full h-full'
                        )}
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

              <div
                className={classnames(
                  'py-4',
                  'text-gray-600 text-center text-xs'
                )}
              >
                collection rendered from cache in{' '}
                <Link href="/about/">{data.benchmark / 1000}</Link> seconds
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default CollectionsByDayIndex
