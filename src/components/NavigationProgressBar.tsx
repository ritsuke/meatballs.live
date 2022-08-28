import Router from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { useNProgress } from '@tanem/react-nprogress'
import classnames from 'classnames'
import autoAnimate from '@formkit/auto-animate'

const NavigationProgressBar = () => {
  const progressBarRef = useRef<HTMLDivElement>(null)

  const [isAnimating, setIsAnimating] = useState(false)

  const { progress } = useNProgress({
    isAnimating,
    incrementDuration: 1
  })

  const onRouteChangeStart = () => setIsAnimating(true)
  const onRouteChangeComplete = () => setIsAnimating(false)

  useEffect(() => {
    progressBarRef.current && autoAnimate(progressBarRef.current)
  }, [progressBarRef])

  useEffect(() => {
    Router.events.on('routeChangeStart', onRouteChangeStart)
    Router.events.on('routeChangeComplete', onRouteChangeComplete)
    Router.events.on('routeChangeError', onRouteChangeComplete)

    return () => {
      Router.events.off('routeChangeStart', onRouteChangeStart)
      Router.events.off('routeChangeComplete', onRouteChangeComplete)
      Router.events.off('routeChangeError', onRouteChangeComplete)
    }
  }, [])

  return (
    <>
      <div
        ref={progressBarRef}
        className={classnames('z-50 absolute top-0 w-full left-0 h-[1px]')}
      >
        {isAnimating && (
          <div
            className={classnames(
              'relative h-full w-full bg-primary transition'
            )}
            style={{
              width: isAnimating ? `${progress * 100}%` : 0,
              transition: 'width 0.1s'
            }}
          />
        )}
      </div>
    </>
  )
}

export default NavigationProgressBar
