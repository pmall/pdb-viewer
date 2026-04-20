import 'server-only'

import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  chainPairs,
  entries,
  entriesMetadata,
  peptides,
  peptidesAccessions,
  peptidesMetadata,
} from '@/db/schema'

type JsonScalar = string | number | boolean | null

export type PdbEntryMetadata = {
  pdbId: string
  assemblyFileStem: string
  title: string | null
  experimentalMethods: string[]
  resolutionCombined: JsonScalar[]
  bestResolution: number | null
  depositionDate: string | null
  initialReleaseDate: string | null
}

export type PdbEntryChainPair = {
  chainPairId: number
  peptideChainId: string
  peptideSequence: string
  peptideResidueNames: string[]
  receptorEntityId: string
  receptorChainId: string
  receptorSequence: string
  receptorResidueNames: string[]
}

export type PdbEntryPeptide = {
  pdbId: string
  entityId: string
  sequence: string
  residueNames: string[]
  entityName: string | null
  organismScientificNames: string[]
  taxonomyIds: number[]
  accessions: string[]
  polymerType: string | null
  sequenceLength: number | null
  chainPairs: PdbEntryChainPair[]
}

export type PdbEntryPage = {
  entry: PdbEntryMetadata
  peptides: PdbEntryPeptide[]
}

function parseJsonArray(value: string): JsonScalar[] {
  try {
    const parsed = JSON.parse(value) as JsonScalar | JsonScalar[]

    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    return []
  }

  return []
}

function parseStringArray(value: string): string[] {
  return parseJsonArray(value).filter((item): item is string => typeof item === 'string')
}

function parseNumberArray(value: string): number[] {
  return parseJsonArray(value).filter((item): item is number => typeof item === 'number')
}

export async function getPdbEntryPage(pdbId: string): Promise<PdbEntryPage | null> {
  const normalizedPdbId = pdbId.trim().toUpperCase()

  if (!normalizedPdbId) {
    return null
  }

  const [entryRow] = await db
    .select({
      entry: entries,
      metadata: entriesMetadata,
    })
    .from(entries)
    .leftJoin(entriesMetadata, eq(entries.pdbId, entriesMetadata.pdbId))
    .where(eq(entries.pdbId, normalizedPdbId))
    .limit(1)

  if (!entryRow) {
    return null
  }

  const [peptideRows, accessionRows, chainPairRows] = await Promise.all([
    db
      .select({
        peptide: peptides,
        metadata: peptidesMetadata,
      })
      .from(peptides)
      .leftJoin(
        peptidesMetadata,
        and(
          eq(peptides.pdbId, peptidesMetadata.pdbId),
          eq(peptides.entityId, peptidesMetadata.entityId)
        )
      )
      .where(eq(peptides.pdbId, normalizedPdbId))
      .orderBy(asc(peptides.entityId)),
    db
      .select()
      .from(peptidesAccessions)
      .where(eq(peptidesAccessions.pdbId, normalizedPdbId))
      .orderBy(asc(peptidesAccessions.entityId), asc(peptidesAccessions.accession)),
    db
      .select()
      .from(chainPairs)
      .where(eq(chainPairs.pdbId, normalizedPdbId))
      .orderBy(
        asc(chainPairs.peptideEntityId),
        asc(chainPairs.peptideChainId),
        asc(chainPairs.receptorChainId)
      ),
  ])

  const accessionsByEntityId = new Map<string, string[]>()

  for (const accessionRow of accessionRows) {
    const accessions = accessionsByEntityId.get(accessionRow.entityId) ?? []
    accessions.push(accessionRow.accession)
    accessionsByEntityId.set(accessionRow.entityId, accessions)
  }

  const chainPairsByPeptideEntityId = new Map<string, PdbEntryChainPair[]>()

  for (const chainPairRow of chainPairRows) {
    const peptideChainPairs = chainPairsByPeptideEntityId.get(chainPairRow.peptideEntityId) ?? []

    peptideChainPairs.push({
      chainPairId: chainPairRow.chainPairId,
      peptideChainId: chainPairRow.peptideChainId,
      peptideSequence: chainPairRow.peptideSequence,
      peptideResidueNames: parseStringArray(chainPairRow.peptideResidueNamesJson),
      receptorEntityId: chainPairRow.receptorEntityId,
      receptorChainId: chainPairRow.receptorChainId,
      receptorSequence: chainPairRow.receptorSequence,
      receptorResidueNames: parseStringArray(chainPairRow.receptorResidueNamesJson),
    })

    chainPairsByPeptideEntityId.set(chainPairRow.peptideEntityId, peptideChainPairs)
  }

  return {
    entry: {
      pdbId: entryRow.entry.pdbId,
      assemblyFileStem: entryRow.entry.assemblyFileStem,
      title: entryRow.metadata?.title ?? null,
      experimentalMethods: entryRow.metadata
        ? parseStringArray(entryRow.metadata.experimentalMethodsJson)
        : [],
      resolutionCombined: entryRow.metadata
        ? parseJsonArray(entryRow.metadata.resolutionCombinedJson)
        : [],
      bestResolution: entryRow.metadata?.bestResolution ?? null,
      depositionDate: entryRow.metadata?.depositionDate ?? null,
      initialReleaseDate: entryRow.metadata?.initialReleaseDate ?? null,
    },
    peptides: peptideRows.map(({ peptide, metadata }) => ({
      pdbId: peptide.pdbId,
      entityId: peptide.entityId,
      sequence: peptide.sequence,
      residueNames: parseStringArray(peptide.residueNamesJson),
      entityName: metadata?.entityName ?? null,
      organismScientificNames: metadata
        ? parseStringArray(metadata.organismScientificNamesJson)
        : [],
      taxonomyIds: metadata ? parseNumberArray(metadata.taxonomyIdsJson) : [],
      accessions: accessionsByEntityId.get(peptide.entityId) ?? [],
      polymerType: metadata?.polymerType ?? null,
      sequenceLength: metadata?.sequenceLength ?? null,
      chainPairs: chainPairsByPeptideEntityId.get(peptide.entityId) ?? [],
    })),
  }
}
