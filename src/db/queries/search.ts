import 'server-only'

import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { entriesMetadata, searchTerms, searchTermsTargets, targetsMetadata } from '@/db/schema'

const SEARCH_RESULT_LIMIT = 50
const MIN_SEARCH_QUERY_LENGTH = 3
const MAX_SEARCH_QUERY_LENGTH = 120

export type PdbSearchMatch = {
  targetEntityId: string
  targetEntityName: string | null
}

export type PdbSearchResult = {
  pdbId: string
  title: string | null
  bestResolution: number | null
  depositionDate: string | null
  initialReleaseDate: string | null
  matches: PdbSearchMatch[]
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

export async function searchPdbEntries(query: string): Promise<PdbSearchResult[]> {
  const normalizedQuery = normalizeSearchQuery(query)

  if (
    normalizedQuery.length < MIN_SEARCH_QUERY_LENGTH ||
    normalizedQuery.length > MAX_SEARCH_QUERY_LENGTH
  ) {
    return []
  }

  const termScore = sql<number>`case
    when lower(${searchTerms.term}) = lower(${normalizedQuery}) then 3
    when ${searchTerms.term} ilike ${`${escapeLikePattern(normalizedQuery)}%`} escape '\\' then 2
    else 1
  end`
  const termContainsQuery = sql`${searchTerms.term} ilike ${containsPattern(normalizedQuery)} escape '\\'`
  const entryScore = sql<number>`max(${termScore})`
  const entryRankWeight = sql<number>`max(${searchTerms.rankWeight})`

  const entryRows = await db
    .select({
      pdbId: searchTermsTargets.pdbId,
      title: entriesMetadata.title,
      bestResolution: entriesMetadata.bestResolution,
      depositionDate: entriesMetadata.depositionDate,
      initialReleaseDate: entriesMetadata.initialReleaseDate,
    })
    .from(searchTerms)
    .innerJoin(searchTermsTargets, eq(searchTerms.searchTermId, searchTermsTargets.searchTermId))
    .leftJoin(entriesMetadata, eq(searchTermsTargets.pdbId, entriesMetadata.pdbId))
    .where(termContainsQuery)
    .groupBy(
      searchTermsTargets.pdbId,
      entriesMetadata.title,
      entriesMetadata.bestResolution,
      entriesMetadata.depositionDate,
      entriesMetadata.initialReleaseDate
    )
    .orderBy(desc(entryScore), desc(entryRankWeight), asc(searchTermsTargets.pdbId))
    .limit(SEARCH_RESULT_LIMIT)

  if (entryRows.length === 0) {
    return []
  }

  const pdbIds = entryRows.map((row) => row.pdbId)
  const entriesByPdbId = new Map<string, PdbSearchResult>(
    entryRows.map((row) => [
      row.pdbId,
      {
        pdbId: row.pdbId,
        title: row.title,
        bestResolution: row.bestResolution,
        depositionDate: row.depositionDate,
        initialReleaseDate: row.initialReleaseDate,
        matches: [],
      },
    ])
  )

  const matchRows = await db
    .select({
      pdbId: searchTermsTargets.pdbId,
      targetEntityId: searchTermsTargets.entityId,
      targetEntityName: targetsMetadata.entityName,
    })
    .from(searchTerms)
    .innerJoin(searchTermsTargets, eq(searchTerms.searchTermId, searchTermsTargets.searchTermId))
    .leftJoin(
      targetsMetadata,
      and(
        eq(searchTermsTargets.pdbId, targetsMetadata.pdbId),
        eq(searchTermsTargets.entityId, targetsMetadata.entityId)
      )
    )
    .where(and(termContainsQuery, inArray(searchTermsTargets.pdbId, pdbIds)))
    .orderBy(
      desc(termScore),
      desc(searchTerms.rankWeight),
      asc(searchTerms.term),
      asc(searchTermsTargets.pdbId),
      asc(searchTermsTargets.entityId)
    )

  for (const row of matchRows) {
    const entry = entriesByPdbId.get(row.pdbId)

    if (!entry) {
      continue
    }

    const match = entry.matches.find(
      (existingMatch) => existingMatch.targetEntityId === row.targetEntityId
    )

    if (!match) {
      entry.matches.push({
        targetEntityId: row.targetEntityId,
        targetEntityName: row.targetEntityName,
      })
    }
  }

  return Array.from(entriesByPdbId.values())
}
