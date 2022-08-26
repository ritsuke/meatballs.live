import classnames from 'classnames'
import { Html, Head, Main, NextScript } from 'next/document'

const Document = () => {
  return (
    <Html lang="en">
      <Head>
        <link rel="shortcut icon" href="/favicon.ico" />

        <link
          href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400;1,700&display=optional"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Serif:ital,wght@0,400;0,700;1,400;1,700&display=optional"
          rel="stylesheet"
        />
      </Head>

      <body className={classnames('bg-black text-white')}>
        <Main />

        <NextScript />
      </body>
    </Html>
  )
}

export default Document
