import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react'
import classnames from 'classnames'
import axios from 'axios'
import { useListener } from '@casper124578/use-socket.io'
import { signIn, useSession } from 'next-auth/react'
import autoAnimate from '@formkit/auto-animate'

import { MEATBALLS_CHANNEL_KEY } from '@/types/constants'
import { isAxiosError } from '@/utils/api'

import Avatar from './Avatar'
import VerticalScrollArea from './VerticalScrollArea'

type CommentData = {
  id: string
  user: string | null
  created: string
  content: string | null
}

type CommentItemProps = {
  data: CommentData
}

const CommentInput = () => {
  const { data, status } = useSession()

  const inputRef = useRef<HTMLInputElement>(null)

  const [comment, setComment] = useState<undefined | string>(undefined),
    [sendingComment, setSendingComment] = useState(false)

  const onChange = (event: ChangeEvent<HTMLInputElement>) =>
    setComment(event.target.value)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!comment || !inputRef.current || sendingComment || !data?.user) return

    setSendingComment(true)

    try {
      // TODO: delegate to CommentStream/CommentItem for snappier UX
      await axios.post('/api/stream/publish-comment/', {
        name:
          // TODO: see [...nextauth].ts
          (data.user as { username: string }).username ||
          data.user.name ||
          'unknown',
        comment
      })
    } catch (error) {
      console.error(
        isAxiosError(error) ? error.message : (error as Error).message
      )
    } finally {
      inputRef.current.value = ''
      setComment(undefined)
      setSendingComment(false)
    }
  }

  return (
    <div
      className={classnames(
        'fixed h-11 bottom-0 w-full grid place-content-center'
      )}
    >
      {status !== 'authenticated' && (
        <span>
          <a onClick={() => signIn()}>Sign in</a> to comment...
        </span>
      )}

      {status === 'authenticated' && data.user && (
        <form
          onSubmit={onSubmit}
          className={classnames('absolute h-full w-full text-white')}
        >
          <input
            ref={inputRef}
            autoFocus
            className={classnames(
              'h-full w-full bg-black px-2 border-t border-t-gray-700 focus:outline-none focus:border-t-primary'
            )}
            placeholder="Enter your message..."
            onChange={onChange}
          />
        </form>
      )}
    </div>
  )
}

const CommentItem = ({
  data: { id, user, created, content }
}: CommentItemProps) => {
  const commentItemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!commentItemRef.current) return

    commentItemRef.current.scrollIntoView()
  }, [commentItemRef])

  return (
    <div
      ref={commentItemRef}
      className={classnames(
        'text-sm leading-5 p-2 pr-4 w-0 min-w-full border-b border-gray-900'
      )}
    >
      <a
        className={classnames('inline no-underline', {
          'hover:cursor-default': !user
        })}
        href={
          user
            ? `${
                id
                  ? 'https://news.ycombinator.com/user?id='
                  : 'https://github.com/'
              }${user}`
            : undefined
        }
        target="_blank"
        rel="noopener noreferrer"
        title={`Comment by ${user || 'I AM ERROR'} at ${created}`}
      >
        <span
          className={classnames('font-bold', {
            'text-hn': id,
            'text-primary': !id,
            'text-yellow-500': !user
          })}
        >
          {user || 'I AM ERROR'}
        </span>
        <span className={classnames('text-gray-700')}>:</span>
      </a>

      <div
        className={classnames('inline mx-1  leading-7', {
          'text-gray-700': !content
        })}
        dangerouslySetInnerHTML={{
          __html: content || 'Missing content. Curious...'
        }}
      />

      {id && (
        <a
          className={classnames('inline-block text-gray-600')}
          href={`https://news.ycombinator.com/item?id=${id}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open comment on Hacker News"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
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
    </div>
  )
}

const CommentStream = () => {
  const commentStreamRef = useRef<HTMLDivElement>(null)

  const [stats, setStats] = useState({ users: 0 }),
    [commentStreamData, setCommentStreamData] = useState<CommentData[]>([])

  useListener(MEATBALLS_CHANNEL_KEY.PRESENCE_STREAM, (message) => {
    setStats(JSON.parse(message))
  })

  useListener(MEATBALLS_CHANNEL_KEY.COMMENT_STREAM, (message) =>
    setCommentStreamData([...commentStreamData, JSON.parse(message)])
  )

  useEffect(() => {
    commentStreamRef.current && autoAnimate(commentStreamRef.current)
  }, [commentStreamRef])

  return (
    <div
      className={classnames(
        'relative bg-black h-full border-l border-gray-700'
      )}
    >
      <div
        className={classnames(
          'grid grid-cols-[minmax(0,1fr)_minmax(0,max-content)] place-content-center h-20 border-b border-gray-700 px-5'
        )}
      >
        <div className={classnames('self-center')}>
          <strong>Live Comments</strong>{' '}
          <span className={classnames('mx-3 text-gray-700')}>|</span>
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={classnames('inline mr-1')}
          >
            <path
              d="M7.5 0.875C5.49797 0.875 3.875 2.49797 3.875 4.5C3.875 6.15288 4.98124 7.54738 6.49373 7.98351C5.2997 8.12901 4.27557 8.55134 3.50407 9.31167C2.52216 10.2794 2.02502 11.72 2.02502 13.5999C2.02502 13.8623 2.23769 14.0749 2.50002 14.0749C2.76236 14.0749 2.97502 13.8623 2.97502 13.5999C2.97502 11.8799 3.42786 10.7206 4.17091 9.9883C4.91536 9.25463 6.02674 8.87499 7.49995 8.87499C8.97317 8.87499 10.0846 9.25463 10.8291 9.98831C11.5721 10.7206 12.025 11.8799 12.025 13.5999C12.025 13.8623 12.2376 14.0749 12.5 14.0749C12.7623 14.075 12.975 13.8623 12.975 13.6C12.975 11.72 12.4778 10.2794 11.4959 9.31166C10.7244 8.55135 9.70025 8.12903 8.50625 7.98352C10.0187 7.5474 11.125 6.15289 11.125 4.5C11.125 2.49797 9.50203 0.875 7.5 0.875ZM4.825 4.5C4.825 3.02264 6.02264 1.825 7.5 1.825C8.97736 1.825 10.175 3.02264 10.175 4.5C10.175 5.97736 8.97736 7.175 7.5 7.175C6.02264 7.175 4.825 5.97736 4.825 4.5Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            ></path>
          </svg>
          <strong>{stats.users}</strong>
        </div>

        <div className={classnames('justify-self-end')}>
          <Avatar />
        </div>
      </div>

      <div className={classnames('absolute left-0 right-0 top-20 bottom-11')}>
        <VerticalScrollArea>
          <div ref={commentStreamRef}>
            {commentStreamData.map((data, index) => (
              <CommentItem key={index} data={data} />
            ))}
          </div>
        </VerticalScrollArea>
      </div>

      <CommentInput />
    </div>
  )
}

export default CommentStream
