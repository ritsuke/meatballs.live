import Link from 'next/link'
import classnames from 'classnames'

import { Collection } from '@/redis/om/collection'
import { stripHtml } from 'string-strip-html'

type CollectionCoverImageProps = {
  year: number
  month: number
  day: number
  collection: Collection
}

const CollectionCoverImage = ({
  year,
  month,
  day,
  collection
}: CollectionCoverImageProps) => {
  const sanitizedTopComment = collection.top_comment
    ? stripHtml(collection.top_comment).result
    : null

  return (
    <div className={classnames('w-full h-full  bg-primary/20')}>
      <Link
        href={
          collection.slug ? `/c/${year}/${month}/${day}/${collection.slug}` : ''
        }
      >
        <div className={classnames('w-full h-full', 'hover:cursor-pointer')}>
          <div
            className={classnames(
              'absolute left-0 top-0 w-full h-full bg-cover'
            )}
            style={{
              // TODO: window.devicePixelRatio (ssr false)
              backgroundImage: `url(${collection.image_url}&w=500&dpr=${2})`
            }}
          />

          <div
            className={classnames(
              'opacity-0 absolute top-0 left-0 w-full h-full grid grid-rows-[auto_44px]',
              'p-7',
              'hover:opacity-100 hover:bg-black/80 backdrop-blur-sm',
              'transition-all'
            )}
          >
            <div>
              <div
                title={collection.title || 'No clue!'}
                className={classnames(
                  'mb-4',
                  'text-2xl text-clip line-clamp-3'
                )}
              >
                {collection.title}
              </div>

              <div
                className={classnames(
                  'font-serif italic text-clip line-clamp-4 w-0 min-w-full'
                )}
                title={sanitizedTopComment || 'No clue!'}
              >
                {sanitizedTopComment}
              </div>
            </div>

            <div
              className={classnames('self-end h-11 ', 'text-2xl', {
                'grid grid-cols-[auto_44px]': collection.image_username
              })}
            >
              {collection.image_username && (
                <div className={classnames('self-end text-xs')}>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={classnames('inline mr-1')}
                  >
                    <path
                      d="M2.5 1H12.5C13.3284 1 14 1.67157 14 2.5V12.5C14 13.3284 13.3284 14 12.5 14H2.5C1.67157 14 1 13.3284 1 12.5V2.5C1 1.67157 1.67157 1 2.5 1ZM2.5 2C2.22386 2 2 2.22386 2 2.5V8.3636L3.6818 6.6818C3.76809 6.59551 3.88572 6.54797 4.00774 6.55007C4.12975 6.55216 4.24568 6.60372 4.32895 6.69293L7.87355 10.4901L10.6818 7.6818C10.8575 7.50607 11.1425 7.50607 11.3182 7.6818L13 9.3636V2.5C13 2.22386 12.7761 2 12.5 2H2.5ZM2 12.5V9.6364L3.98887 7.64753L7.5311 11.4421L8.94113 13H2.5C2.22386 13 2 12.7761 2 12.5ZM12.5 13H10.155L8.48336 11.153L11 8.6364L13 10.6364V12.5C13 12.7761 12.7761 13 12.5 13ZM6.64922 5.5C6.64922 5.03013 7.03013 4.64922 7.5 4.64922C7.96987 4.64922 8.35078 5.03013 8.35078 5.5C8.35078 5.96987 7.96987 6.35078 7.5 6.35078C7.03013 6.35078 6.64922 5.96987 6.64922 5.5ZM7.5 3.74922C6.53307 3.74922 5.74922 4.53307 5.74922 5.5C5.74922 6.46693 6.53307 7.25078 7.5 7.25078C8.46693 7.25078 9.25078 6.46693 9.25078 5.5C9.25078 4.53307 8.46693 3.74922 7.5 3.74922Z"
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    ></path>
                  </svg>{' '}
                  <a
                    href={`${collection.image_user_url}`}
                    className={classnames(
                      'underline underline-offset-4 decoration-primary'
                    )}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {collection.image_username}
                  </a>
                </div>
              )}

              <div
                className={classnames(
                  'w-full h-full grid text-right',
                  'font-serif italic text-[70px] text-primary'
                )}
              >
                {collection.position + 1}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

export default CollectionCoverImage
