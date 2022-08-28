import classnames from 'classnames'
import { NextPage } from 'next'
import Head from 'next/head'

const TermsPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Terms + Privacy | meatballs.live</title>
      </Head>

      <div className={classnames('my-8 mx-auto px-8 max-w-2xl')}>
        <div className={classnames('mb-8')}>
          <h1 className={classnames('text-2xl mb-4 text-primary')}>Terms</h1>
          <ul>
            <li className={classnames('my-2')}>Be nice.</li>
            <li className={classnames('my-2')}>Don&apos;t be a jerk.</li>
          </ul>
        </div>

        <h1 className={classnames('text-2xl mb-4 text-primary')}>Privacy</h1>
        <p className={classnames('mb-3 leading-8')}>
          meatballs.live doesn&apos;t utilize any invasive, IP-based analytics,
          but is hosted with{' '}
          <a
            href="https://vercel.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vercel
          </a>
          .
        </p>
        <p className={classnames('mb-3 leading-8')}>
          To participate in the live comments stream, you will need to sign in
          with your{' '}
          <a
            href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>{' '}
          account. For account association, meatballs.live persists your email
          address to our authorization cloud store on{' '}
          <a
            href="https://upstash.com/static/trust/privacy.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Upstash
          </a>
          .
        </p>
        <p className={classnames('mb-3 leading-8')}>
          Interactions in the live comments stream are not saved by
          meatballs.live, but could be saved by other participants.{' '}
          <strong>Keep your private information private</strong>.
        </p>
        <p className={classnames('mb-3 leading-8')}>
          Self-serve account deletion is not yet implemented. Contact
          fred@ritsuke.dev and I will remove your account manually.
        </p>
      </div>
    </>
  )
}

export default TermsPage
