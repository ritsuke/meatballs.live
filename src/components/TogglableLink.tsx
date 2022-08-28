import Link from 'next/link'
import { ReactNode } from 'react'

const TogglableLink = ({
  href,
  children
}: {
  href: string | null
  children: ReactNode
}) => {
  if (href) {
    return <Link href={href}>{children}</Link>
  }

  return <>{children}</>
}

export default TogglableLink
