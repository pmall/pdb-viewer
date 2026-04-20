'use client'

import Link from 'next/link'
import { useDeferredValue, useState } from 'react'
import useSWR from 'swr'

const SEARCH_API_PATH = '/api/search'
const MIN_SEARCH_QUERY_LENGTH = 3
const MAX_SEARCH_QUERY_LENGTH = 120

type SearchResult = {
  pdbId: string
  title: string | null
  bestResolution: number | null
  depositionDate: string | null
  initialReleaseDate: string | null
  matches: SearchMatch[]
}

type SearchMatch = {
  targetEntityId: string
  targetEntityName: string | null
}

type SearchResponse = {
  results: SearchResult[]
}

type SearchKey = [typeof SEARCH_API_PATH, string]

function formatResolution(resolution: number | null): string {
  if (resolution === null) {
    return 'Not reported'
  }

  return `${resolution.toFixed(2)} A`
}

function formatDate(date: string | null): string {
  if (!date) {
    return 'Not reported'
  }

  return date
}

function normalizeQuery(query: string): string {
  return query.trim()
}

async function fetchSearchResults([path, query]: SearchKey): Promise<SearchResponse> {
  const response = await fetch(`${path}?q=${encodeURIComponent(query)}`)

  if (!response.ok) {
    throw new Error('Search failed.')
  }

  return (await response.json()) as SearchResponse
}

export function SearchHome() {
  const [query, setQuery] = useState('')
  const normalizedQuery = normalizeQuery(query)
  const deferredQuery = useDeferredValue(normalizedQuery)
  const isTooLong = normalizedQuery.length > MAX_SEARCH_QUERY_LENGTH
  const canSearch =
    normalizedQuery.length >= MIN_SEARCH_QUERY_LENGTH &&
    normalizedQuery.length <= MAX_SEARCH_QUERY_LENGTH
  const isWaitingForDeferredQuery = canSearch && normalizedQuery !== deferredQuery
  const searchKey: SearchKey | null =
    deferredQuery.length >= MIN_SEARCH_QUERY_LENGTH &&
    deferredQuery.length <= MAX_SEARCH_QUERY_LENGTH
      ? [SEARCH_API_PATH, deferredQuery]
      : null

  const { data, error, isLoading, isValidating } = useSWR<SearchResponse, Error, SearchKey | null>(
    searchKey,
    fetchSearchResults,
    {
      keepPreviousData: false,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  const results = canSearch && !isWaitingForDeferredQuery ? (data?.results ?? []) : []
  const isSearching = canSearch && (isWaitingForDeferredQuery || isLoading || isValidating)
  const hasError = canSearch && !isWaitingForDeferredQuery && Boolean(error)
  const hasEmptyResults = canSearch && !isSearching && !hasError && results.length === 0

  let resultCountLabel = `${results.length} matching ${results.length === 1 ? 'entry' : 'entries'}`

  if (isTooLong) {
    resultCountLabel = `Enter ${MAX_SEARCH_QUERY_LENGTH} characters or fewer.`
  } else if (!canSearch) {
    resultCountLabel = `Enter at least ${MIN_SEARCH_QUERY_LENGTH} characters.`
  } else if (isSearching) {
    resultCountLabel = 'Searching...'
  } else if (hasError) {
    resultCountLabel = 'Search is unavailable right now.'
  } else if (hasEmptyResults) {
    resultCountLabel = 'No matching PDB entries found.'
  }

  return (
    <section className="min-h-screen bg-[#f5f7f9] text-[#171717]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-8 sm:px-8 lg:px-12">
        <header className="flex flex-col gap-5 border-b border-[#d2dae0] pb-8">
          <p className="text-sm font-semibold text-[#426352] uppercase">
            PDB peptide target search
          </p>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div className="flex flex-col gap-4">
              <h1 className="max-w-4xl text-4xl leading-tight font-semibold sm:text-5xl">
                Find curated peptide entries by target-centered terms.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-[#4f514d]">
                Search names, accessions, organisms, annotations, and related target context.
              </p>
            </div>
            <div className="hidden border-l-4 border-[#b64253] pl-5 text-sm leading-6 text-[#4f514d] lg:block">
              Results link to peptide-centered PDB entry pages as they are added to the viewer.
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-4">
          <label htmlFor="pdb-search" className="text-base font-semibold">
            Search target context
          </label>
          <input
            id="pdb-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try HLA, insulin, P01308, or kinase"
            className="h-14 w-full rounded-lg border border-[#aab8c2] bg-white px-4 text-lg transition outline-none focus:border-[#1f6f54] focus:ring-4 focus:ring-[#b7d5c7]"
          />
          <p className="min-h-6 text-sm text-[#555a52]" aria-live="polite">
            {resultCountLabel}
          </p>
        </div>

        {canSearch && results.length > 0 ? (
          <div className="overflow-x-auto border border-[#d2dae0] bg-white">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="bg-[#e8edf0] text-xs text-[#384139] uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    PDB
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Matched target context
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Title
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Resolution
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Dates
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1e6ea]">
                {results.map((result) => (
                  <tr key={result.pdbId}>
                    <td className="px-4 py-4 align-top font-semibold">
                      <Link
                        href={`/pdb/${result.pdbId}`}
                        className="rounded-sm text-[#0c5f46] underline-offset-4 hover:underline focus:ring-2 focus:ring-[#1f6f54] focus:outline-none"
                      >
                        {result.pdbId}
                      </Link>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex max-w-lg flex-col gap-3">
                        {result.matches.map((match) => (
                          <div
                            key={match.targetEntityId}
                            className="flex flex-col gap-1 border-l-2 border-[#b64253] pl-3"
                          >
                            <span className="font-medium">
                              {match.targetEntityName ?? 'Unnamed target'}
                            </span>
                            <span className="text-xs text-[#62675f]">
                              Entity {match.targetEntityId}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className="line-clamp-3 max-w-md">
                        {result.title ?? 'Untitled entry'}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      {formatResolution(result.bestResolution)}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex min-w-36 flex-col gap-1">
                        <span>Deposited {formatDate(result.depositionDate)}</span>
                        <span>Released {formatDate(result.initialReleaseDate)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {hasEmptyResults ? (
          <div className="border border-[#d2dae0] bg-white px-5 py-8">
            <div className="flex max-w-2xl flex-col gap-3">
              <h2 className="text-xl font-semibold">No matching PDB entries</h2>
              <p className="leading-7 text-[#4f514d]">
                No entries matched {normalizedQuery}. Try a broader target name, organism, keyword,
                GO term, PDB ID, or UniProt accession.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
