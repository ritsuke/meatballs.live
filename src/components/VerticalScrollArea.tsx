import { ReactNode } from 'react'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import classnames from 'classnames'

const VerticalScrollArea = ({
  zIndex = 30,
  children
}: {
  zIndex?: 10 | 20 | 30 | 40 | 50
  children: ReactNode
}) => {
  return (
    <ScrollArea.Root
      className={classnames('scroll-area h-full w-full')}
      type="scroll"
    >
      <ScrollArea.ScrollAreaViewport className={classnames('w-full h-full')}>
        {children}
      </ScrollArea.ScrollAreaViewport>

      <ScrollArea.Scrollbar
        orientation="vertical"
        className={classnames('vertical scrollbar')}
        style={{ zIndex }}
      >
        <ScrollArea.Thumb className={classnames('thumb')} />
      </ScrollArea.Scrollbar>

      <ScrollArea.ScrollAreaCorner />
    </ScrollArea.Root>
  )
}

export default VerticalScrollArea
