import 'server-only'

import { and, asc, desc, eq, or, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  entries,
  entriesMetadata,
  searchTerms,
  searchTermsTargets,
  targetsMetadata,
} from '@/db/schema'

const SEARCH_RESULT_LIMIT = 50
const SEARCH_SUGGESTION_LIMIT = 10
const DIRECT_ENTRY_SUGGESTION_LIMIT = 5

export type PdbSearchResult = {
  pdbId: string
  matchedTerm: string
  termKind: string
  targetEntityId: string
  targetEntityName: string | null
  title: string | null
  bestResolution: number | null
  depositionDate: string | null
  initialReleaseDate: string | null
  score: number
}

export type SearchSuggestion =
  | {
      type: 'entry'
      pdbId: string
      label: string
      title: string | null
    }
  | {
      type: 'term'
      query: string
      label: string
      termKind: string
      score: number
    }

function normalizeSearchQuery(query: string): string {
  return query.trim()
}

function escapeLikePattern(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
}

function containsPattern(query: string): string {
  return `%${escapeLikePattern(query)}%`
}

function startsWithPattern(query: string): string {
  return `${escapeLikePattern(query)}%`
}

export async function searchPdbEntries(query: string): Promise<PdbSearchResult[]> {
  const normalizedQuery = normalizeSearchQuery(query)

  if (!normalizedQuery) {
    return []
  }

  const similarityScore = sql<number>`similarity(${searchTerms.term}, ${normalizedQuery})`
  const termContainsQuery = sql`${searchTerms.term} ilike ${containsPattern(normalizedQuery)} escape '\\'`
  const searchCondition =
    normalizedQuery.length < 3
      ? termContainsQuery
      : or(termContainsQuery, sql`${searchTerms.term} % ${normalizedQuery}`)

  const rows = await db
    .select({
      pdbId: searchTermsTargets.pdbId,
      matchedTerm: searchTerms.term,
      termKind: searchTerms.termKind,
      targetEntityId: searchTermsTargets.entityId,
      targetEntityName: targetsMetadata.entityName,
      title: entriesMetadata.title,
      bestResolution: entriesMetadata.bestResolution,
      depositionDate: entriesMetadata.depositionDate,
      initialReleaseDate: entriesMetadata.initialReleaseDate,
      score: similarityScore,
    })
    .from(searchTerms)
    .innerJoin(searchTermsTargets, eq(searchTerms.searchTermId, searchTermsTargets.searchTermId))
    .innerJoin(entries, eq(searchTermsTargets.pdbId, entries.pdbId))
    .leftJoin(entriesMetadata, eq(entries.pdbId, entriesMetadata.pdbId))
    .leftJoin(
      targetsMetadata,
      and(
        eq(searchTermsTargets.pdbId, targetsMetadata.pdbId),
        eq(searchTermsTargets.entityId, targetsMetadata.entityId)
      )
    )
    .where(searchCondition)
    .orderBy(
      desc(searchTerms.rankWeight),
      desc(similarityScore),
      asc(searchTerms.term),
      asc(entries.pdbId)
    )
    .limit(SEARCH_RESULT_LIMIT)

  return rows
}

export async function getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
  const normalizedQuery = normalizeSearchQuery(query)

  if (!normalizedQuery) {
    return []
  }

  const similarityScore = sql<number>`similarity(${searchTerms.term}, ${normalizedQuery})`
  const termStartsWithQuery = sql`${searchTerms.term} ilike ${startsWithPattern(normalizedQuery)} escape '\\'`
  const termMatchesQuery =
    normalizedQuery.length < 3
      ? termStartsWithQuery
      : or(termStartsWithQuery, sql`${searchTerms.term} % ${normalizedQuery}`)

  const [entryRows, termRows] = await Promise.all([
    db
      .select({
        pdbId: entries.pdbId,
        title: entriesMetadata.title,
      })
      .from(entries)
      .leftJoin(entriesMetadata, eq(entries.pdbId, entriesMetadata.pdbId))
      .where(sql`${entries.pdbId} ilike ${startsWithPattern(normalizedQuery)} escape '\\'`)
      .orderBy(asc(entries.pdbId))
      .limit(DIRECT_ENTRY_SUGGESTION_LIMIT),
    db
      .select({
        query: searchTerms.term,
        termKind: searchTerms.termKind,
        score: similarityScore,
      })
      .from(searchTerms)
      .where(termMatchesQuery)
      .orderBy(desc(searchTerms.rankWeight), desc(similarityScore), asc(searchTerms.term))
      .limit(SEARCH_SUGGESTION_LIMIT),
  ])

  return [
    ...entryRows.map(
      (row): SearchSuggestion => ({
        type: 'entry',
        pdbId: row.pdbId,
        label: row.pdbId,
        title: row.title,
      })
    ),
    ...termRows.map(
      (row): SearchSuggestion => ({
        type: 'term',
        query: row.query,
        label: row.query,
        termKind: row.termKind,
        score: row.score,
      })
    ),
  ]
}
