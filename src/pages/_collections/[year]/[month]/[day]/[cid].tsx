import { parseCollectionParamsFromParsedUrlQuery } from '@/utils/collections'
import { GetServerSideProps, InferGetServerSidePropsType, NextPage } from 'next'

type CollectionPageProps = {
  data: {
    id: string
  }
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  if (!params) throw 'missing params'

  const { collectionId: id } = parseCollectionParamsFromParsedUrlQuery(params)

  return {
    props: {
      data: {
        id
      }
    }
  }
}

const CollectionPage: NextPage<CollectionPageProps> = ({ data }) => {
  return <div>{data.id}</div>
}

export default CollectionPage
