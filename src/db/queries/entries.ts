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
  targetsAccessions,
  uniprotMetadata,
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
  receptorAccessions: PdbEntryUniprotAccession[]
}

export type PdbEntryPeptide = {
  pdbId: string
  entityId: string
  sequence: string
  residueNames: string[]
  entityName: string | null
  organismScientificNames: string[]
  taxonomyIds: number[]
  accessions: PdbEntryUniprotAccession[]
  polymerType: string | null
  sequenceLength: number | null
  chainPairs: PdbEntryChainPair[]
}

export type PdbEntryUniprotAccession = {
  accession: string
  reviewed: boolean | null
  recommendedName: string | null
  geneNames: string[]
  organismScientificName: string | null
  taxonomyId: number | null
  functionText: string | null
  subcellularLocations: string[]
  keywords: string[]
  goTerms: string[]
  interproIds: string[]
  pfamIds: string[]
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

function mapUniprotAccession(
  accession: string,
  metadata: typeof uniprotMetadata.$inferSelect | null
): PdbEntryUniprotAccession {
  return {
    accession,
    reviewed: metadata ? metadata.reviewed === 1 : null,
    recommendedName: metadata?.recommendedName ?? null,
    geneNames: metadata ? parseStringArray(metadata.geneNamesJson) : [],
    organismScientificName: metadata?.organismScientificName ?? null,
    taxonomyId: metadata?.taxonomyId ?? null,
    functionText: metadata?.functionText ?? null,
    subcellularLocations: metadata ? parseStringArray(metadata.subcellularLocationsJson) : [],
    keywords: metadata ? parseStringArray(metadata.keywordsJson) : [],
    goTerms: metadata ? parseStringArray(metadata.goTermsJson) : [],
    interproIds: metadata ? parseStringArray(metadata.interproIdsJson) : [],
    pfamIds: metadata ? parseStringArray(metadata.pfamIdsJson) : [],
  }
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

  const [peptideRows, peptideAccessionRows, targetAccessionRows, chainPairRows] = await Promise.all(
    [
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
        .select({
          entityId: peptidesAccessions.entityId,
          accession: peptidesAccessions.accession,
          metadata: uniprotMetadata,
        })
        .from(peptidesAccessions)
        .leftJoin(uniprotMetadata, eq(peptidesAccessions.accession, uniprotMetadata.accession))
        .where(eq(peptidesAccessions.pdbId, normalizedPdbId))
        .orderBy(asc(peptidesAccessions.entityId), asc(peptidesAccessions.accession)),
      db
        .select({
          entityId: targetsAccessions.entityId,
          accession: targetsAccessions.accession,
          metadata: uniprotMetadata,
        })
        .from(targetsAccessions)
        .leftJoin(uniprotMetadata, eq(targetsAccessions.accession, uniprotMetadata.accession))
        .where(eq(targetsAccessions.pdbId, normalizedPdbId))
        .orderBy(asc(targetsAccessions.entityId), asc(targetsAccessions.accession)),
      db
        .select()
        .from(chainPairs)
        .where(eq(chainPairs.pdbId, normalizedPdbId))
        .orderBy(
          asc(chainPairs.peptideEntityId),
          asc(chainPairs.peptideChainId),
          asc(chainPairs.receptorChainId)
        ),
    ]
  )

  const peptideAccessionsByEntityId = new Map<string, PdbEntryUniprotAccession[]>()

  for (const accessionRow of peptideAccessionRows) {
    const accessions = peptideAccessionsByEntityId.get(accessionRow.entityId) ?? []
    accessions.push(mapUniprotAccession(accessionRow.accession, accessionRow.metadata))
    peptideAccessionsByEntityId.set(accessionRow.entityId, accessions)
  }

  const targetAccessionsByEntityId = new Map<string, PdbEntryUniprotAccession[]>()

  for (const accessionRow of targetAccessionRows) {
    const accessions = targetAccessionsByEntityId.get(accessionRow.entityId) ?? []
    accessions.push(mapUniprotAccession(accessionRow.accession, accessionRow.metadata))
    targetAccessionsByEntityId.set(accessionRow.entityId, accessions)
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
      receptorAccessions: targetAccessionsByEntityId.get(chainPairRow.receptorEntityId) ?? [],
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
      accessions: peptideAccessionsByEntityId.get(peptide.entityId) ?? [],
      polymerType: metadata?.polymerType ?? null,
      sequenceLength: metadata?.sequenceLength ?? null,
      chainPairs: chainPairsByPeptideEntityId.get(peptide.entityId) ?? [],
    })),
  }
}
