import { connection } from 'next/server'
import { SearchHome } from '@/components/search/SearchHome'
import { getRandomPdbEntries } from '@/db/queries/search'

export default async function Home() {
  await connection()

  const randomEntries = await getRandomPdbEntries()

  return <SearchHome randomEntries={randomEntries} />
}
