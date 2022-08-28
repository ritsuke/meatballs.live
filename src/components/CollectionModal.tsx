import classnames from 'classnames'

import { Collection } from '@/redis/om/collection'

type CollectionModalProps = {
  meta: Collection
  detail: string
  open: boolean
  onClose: () => void
}

type RecommendedComment = {
  id: string
  content: string
  created: number
  created_by: string
}

type RecommendedStory = {
  id: string
  title: string
}

type CollectionDetail = {
  story: {
    id: string
    content: string | null // ask hn
    created: number
    created_by: string
    address: string | null
  }
  comments: RecommendedComment[]
  recommended_stories: RecommendedStory[]
}

const RecommendedComment = ({ comment }: { comment: RecommendedComment }) => {
  const commentDate = `${new Date(
    comment.created * 1000
  ).toLocaleTimeString()} ${new Date(
    comment.created * 1000
  ).toLocaleDateString()}`

  return (
    <div key={comment.id} className={classnames('mb-10')}>
      <div
        className={classnames('mb-3 text-lg leading-9')}
        dangerouslySetInnerHTML={{ __html: comment.content }}
      />
      <p className={classnames('text-sm font-sans')}>
        <span className={classnames('text-gray-600')}>
          recommended reply by
        </span>
        <a
          className={classnames('font-bold px-2')}
          href={`https://news.ycombinator.com/user?id=${comment.created_by}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {comment.created_by}
        </a>
        <span className={classnames('text-gray-600')}>@</span>
        <a
          className={classnames('font-bold px-2')}
          href={`https://news.ycombinator.com/item?id=${comment.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {commentDate}
        </a>
      </p>
    </div>
  )
}

const RecommendedStory = ({ story }: { story: RecommendedStory }) => {
  return (
    <a
      className={classnames('block mb-4 last:m-0 leading-7')}
      href={`https://news.ycombinator.com/item?id=${story.id}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {story.title}
    </a>
  )
}

const CollectionModal = ({
  meta,
  detail,
  open,
  onClose
}: CollectionModalProps) => {
  const closeModal = () => onClose()

  const {
    story,
    comments,
    recommended_stories: recommendedStories
  } = JSON.parse(detail) as CollectionDetail

  const storyDate = `${new Date(
    story.created * 1000
  ).toLocaleTimeString()} ${new Date(
    story.created * 1000
  ).toLocaleDateString()}`

  return (
    <>
      {open && (
        <>
          <div
            className={classnames(
              'collection-modal sticky z-50 h-full w-fill mx-10'
            )}
          >
            <div
              className={classnames(
                'fixed right-8 lg:right-[430px] top-8 hover:cursor-pointer bg-black/20 p-1 rounded-full'
              )}
              onClick={closeModal}
            >
              <div>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12.8536 2.85355C13.0488 2.65829 13.0488 2.34171 12.8536 2.14645C12.6583 1.95118 12.3417 1.95118 12.1464 2.14645L7.5 6.79289L2.85355 2.14645C2.65829 1.95118 2.34171 1.95118 2.14645 2.14645C1.95118 2.34171 1.95118 2.65829 2.14645 2.85355L6.79289 7.5L2.14645 12.1464C1.95118 12.3417 1.95118 12.6583 2.14645 12.8536C2.34171 13.0488 2.65829 13.0488 2.85355 12.8536L7.5 8.20711L12.1464 12.8536C12.3417 13.0488 12.6583 13.0488 12.8536 12.8536C13.0488 12.6583 13.0488 12.3417 12.8536 12.1464L8.20711 7.5L12.8536 2.85355Z"
                    fill="currentColor"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
            </div>

            <div className={classnames('pt-20 max-w-7xl mx-auto')}>
              <div className={classnames('mb-10')}>
                {/* title */}
                <h1 className={classnames('text-3xl lg:text-7xl mb-4')}>
                  <span
                    className={classnames(
                      'text-primary font-serif italic pr-5 mr-5 border-r border-r-gray-700'
                    )}
                  >
                    {meta.position + 1}
                  </span>
                  <span>{meta.title}</span>
                </h1>

                {/* address (if exists) */}
                {story.address && (
                  <a
                    className={classnames(
                      'inline-block mb-4 text-lg lg:text-2xl no-underline italic'
                    )}
                    href={story.address}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {story.address}{' '}
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 15 15"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={classnames('inline text-primary ml-2')}
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 13C12.5523 13 13 12.5523 13 12V3C13 2.44771 12.5523 2 12 2H3C2.44771 2 2 2.44771 2 3V6.5C2 6.77614 2.22386 7 2.5 7C2.77614 7 3 6.77614 3 6.5V3H12V12H8.5C8.22386 12 8 12.2239 8 12.5C8 12.7761 8.22386 13 8.5 13H12ZM9 6.5C9 6.5001 9 6.50021 9 6.50031V6.50035V9.5C9 9.77614 8.77614 10 8.5 10C8.22386 10 8 9.77614 8 9.5V7.70711L2.85355 12.8536C2.65829 13.0488 2.34171 13.0488 2.14645 12.8536C1.95118 12.6583 1.95118 12.3417 2.14645 12.1464L7.29289 7H5.5C5.22386 7 5 6.77614 5 6.5C5 6.22386 5.22386 6 5.5 6H8.5C8.56779 6 8.63244 6.01349 8.69139 6.03794C8.74949 6.06198 8.80398 6.09744 8.85143 6.14433C8.94251 6.23434 8.9992 6.35909 8.99999 6.49708L8.99999 6.49738"
                        fill="currentColor"
                      ></path>
                    </svg>
                  </a>
                )}

                {/* user + date */}
                <div className={classnames('text-sm')}>
                  <span className={classnames('text-gray-600')}>shared by</span>
                  <a
                    className={classnames('font-bold px-2')}
                    href={`https://news.ycombinator.com/user?id=${story.created_by}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {story.created_by}
                  </a>
                  <span className={classnames('text-gray-600')}>@</span>
                  <a
                    className={classnames('font-bold px-2')}
                    href={`https://news.ycombinator.com/item?id=${story.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {storyDate}
                  </a>
                </div>
              </div>

              <div className={classnames('grid lg:grid-cols-[65%_35%]')}>
                <div className={classnames('font-serif leading-9')}>
                  {/* content (if exists) */}
                  {story.content && (
                    <div
                      className={classnames(
                        'italic font-serif leading-9 pb-10 mb-10 border-b border-gray-700 text-lg'
                      )}
                      dangerouslySetInnerHTML={{ __html: story.content }}
                    />
                  )}

                  {/* selected comments */}
                  {comments.length === 0 && (
                    <div>No recommended comments found...</div>
                  )}
                  {comments.map((comment) => (
                    <RecommendedComment key={comment.id} comment={comment} />
                  ))}
                </div>

                <div className={classnames('relative pb-10 lg:pl-10')}>
                  <div className={classnames('sticky top-[33px]')}>
                    <h2
                      className={classnames(
                        'text-sm font-bold mb-6 uppercase text-primary border-b border-gray-700'
                      )}
                    >
                      Recommended Stories
                    </h2>

                    {recommendedStories.length === 0 && (
                      <div>No recommended stories found...</div>
                    )}

                    {recommendedStories.map((story) => (
                      <RecommendedStory key={story.id} story={story} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default CollectionModal
