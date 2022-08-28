import { NextPage } from 'next'
import classNames from 'classnames'

const NotFoundPage: NextPage = () => {
  return (
    <div className={classNames('mt-8 text-center')}>Nothing to see here.</div>
  )
}

export default NotFoundPage
