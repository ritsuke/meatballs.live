import { useEffect } from 'react'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import classnames from 'classnames'
import { SocketProvider, useSocket } from '@casper124578/use-socket.io'

import CommentStream from '@/components/CommentStream'
import VerticalScrollArea from '@/components/VerticalScrollArea'
import NavigationProgressBar from '@/components/NavigationProgressBar'

import '@/styles/globals.scss'

function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const socket = useSocket()

  // pubsub connection
  useEffect(() => {
    if (!socket) return

    socket.connect()

    return () => {
      socket?.disconnect()
    }
  }, [socket])

  return (
    <SessionProvider session={session}>
      <SocketProvider
        uri={process.env.NEXT_PUBLIC_STREAM_SERVER_URL || ''}
        options={{ autoConnect: false }}
      >
        <div
          className={classnames(
            'sm:fixed sm:top-0 sm:right-96 sm:bottom-0 sm:left-0'
          )}
        >
          <VerticalScrollArea zIndex={50}>
            <NavigationProgressBar />
            <Component {...pageProps} />
          </VerticalScrollArea>
        </div>

        <div
          className={classnames(
            'fixed top-0 right-0 w-96 h-screen hidden sm:block'
          )}
        >
          <CommentStream />
        </div>
      </SocketProvider>
    </SessionProvider>
  )
}

export default App
