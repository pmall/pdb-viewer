import { searchPdbEntries } from '@/db/queries/search'

const MIN_SEARCH_QUERY_LENGTH = 3
const MAX_SEARCH_QUERY_LENGTH = 120

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() ?? ''

  if (query.length < MIN_SEARCH_QUERY_LENGTH) {
    return Response.json({ results: [] })
  }

  if (query.length > MAX_SEARCH_QUERY_LENGTH) {
    return Response.json(
      { error: `Search query must be ${MAX_SEARCH_QUERY_LENGTH} characters or fewer.` },
      { status: 400 }
    )
  }

  const results = await searchPdbEntries(query)

  return Response.json({ results })
}
