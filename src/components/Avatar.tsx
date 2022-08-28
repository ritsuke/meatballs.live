import classnames from 'classnames'
import { signIn, signOut, useSession } from 'next-auth/react'

const Avatar = () => {
  const { data, status } = useSession()

  return (
    <div>
      {status !== 'authenticated' && (
        <a
          onClick={() => signIn()}
          className={classnames('hover:cursor-pointer')}
        >
          Sign In
        </a>
      )}

      {status === 'authenticated' && data.user && (
        <div
          className={classnames(
            'w-8 h-8 bg-gray-700 rounded-full hover:cursor-pointer'
          )}
          style={{
            background: `url(${data.user?.image})`,
            backgroundSize: 'contain'
          }}
          onClick={() => signOut()}
          title={`You are signed in as ${data.user.name}. Click here to sign out.`}
        />
      )}
    </div>
  )
}

export default Avatar
