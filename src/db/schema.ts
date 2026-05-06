import {
  boolean,
  doublePrecision,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  unique,
} from 'drizzle-orm/pg-core'

export const entries = pgTable('entries', {
  pdbId: text('pdb_id').primaryKey().notNull(),
  assemblyFileStem: text('assembly_file_stem').notNull(),
})

export const entriesMetadata = pgTable(
  'entries_metadata',
  {
    pdbId: text('pdb_id').primaryKey().notNull(),
    title: text().notNull(),
    experimentalMethodsJson: text('experimental_methods_json').notNull(),
    resolutionCombinedJson: text('resolution_combined_json').notNull(),
    bestResolution: doublePrecision('best_resolution'),
    depositionDate: text('deposition_date'),
    initialReleaseDate: text('initial_release_date'),
  },
  (table) => [
    foreignKey({
      columns: [table.pdbId],
      foreignColumns: [entries.pdbId],
      name: 'entries_metadata_pdb_id_fkey',
    }),
  ]
)

export const chainPairs = pgTable(
  'chain_pairs',
  {
    chainPairId: integer('chain_pair_id').primaryKey().notNull(),
    pdbId: text('pdb_id').notNull(),
    peptideEntityId: text('peptide_entity_id').notNull(),
    peptideChainId: text('peptide_chain_id').notNull(),
    peptideSequence: text('peptide_sequence').notNull(),
    peptideResidueNamesJson: text('peptide_residue_names_json').notNull(),
    peptideBindingStart: integer('peptide_binding_start').notNull(),
    peptideBindingStop: integer('peptide_binding_stop').notNull(),
    receptorEntityId: text('receptor_entity_id').notNull(),
    receptorChainId: text('receptor_chain_id').notNull(),
    receptorSequence: text('receptor_sequence').notNull(),
    receptorResidueNamesJson: text('receptor_residue_names_json').notNull(),
    receptorBindingStart: integer('receptor_binding_start').notNull(),
    receptorBindingStop: integer('receptor_binding_stop').notNull(),
  },
  (table) => [
    index('idx_chain_pairs__pdb_id_peptide_entity_id').using(
      'btree',
      table.pdbId.asc().nullsLast().op('text_ops'),
      table.peptideEntityId.asc().nullsLast().op('text_ops')
    ),
    index('idx_chain_pairs__pdb_id_receptor_entity_id').using(
      'btree',
      table.pdbId.asc().nullsLast().op('text_ops'),
      table.receptorEntityId.asc().nullsLast().op('text_ops')
    ),
    index('idx_chain_pairs__peptide_chain_id').using(
      'btree',
      table.peptideChainId.asc().nullsLast().op('text_ops')
    ),
    index('idx_chain_pairs__receptor_chain_id').using(
      'btree',
      table.receptorChainId.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.pdbId],
      foreignColumns: [entries.pdbId],
      name: 'chain_pairs_pdb_id_fkey',
    }),
    foreignKey({
      columns: [table.pdbId, table.peptideEntityId],
      foreignColumns: [peptides.pdbId, peptides.entityId],
      name: 'chain_pairs_pdb_id_peptide_entity_id_fkey',
    }),
    unique('chain_pairs_pdb_id_peptide_entity_id_peptide_chain_id_recep_key').on(
      table.pdbId,
      table.peptideEntityId,
      table.peptideChainId,
      table.receptorEntityId,
      table.receptorChainId
    ),
  ]
)

export const uniprotMetadata = pgTable('uniprot_metadata', {
  accession: text().primaryKey().notNull(),
  reviewed: boolean().notNull(),
  recommendedName: text('recommended_name').notNull(),
  geneNamesJson: text('gene_names_json').notNull(),
  organismScientificName: text('organism_scientific_name').notNull(),
  taxonomyId: integer('taxonomy_id'),
  functionText: text('function_text').notNull(),
  subcellularLocationsJson: text('subcellular_locations_json').notNull(),
  keywordsJson: text('keywords_json').notNull(),
  goTermsJson: text('go_terms_json').notNull(),
  interproIdsJson: text('interpro_ids_json').notNull(),
  pfamIdsJson: text('pfam_ids_json').notNull(),
})

export const searchTerms = pgTable(
  'search_terms',
  {
    searchTermId: integer('search_term_id').primaryKey().notNull(),
    term: text().notNull(),
    termKind: text('term_kind').notNull(),
    rankWeight: integer('rank_weight').notNull(),
  },
  (table) => [
    index('idx_search_terms__term_kind').using(
      'btree',
      table.termKind.asc().nullsLast().op('text_ops')
    ),
    index('idx_search_terms__term_trgm').using(
      'gin',
      table.term.asc().nullsLast().op('gin_trgm_ops')
    ),
    unique('search_terms_term_key').on(table.term),
  ]
)

export const searchTermsTargets = pgTable(
  'search_terms_targets',
  {
    searchTermsTargetId: integer('search_terms_target_id').primaryKey().notNull(),
    searchTermId: integer('search_term_id').notNull(),
    pdbId: text('pdb_id').notNull(),
    entityId: text('entity_id').notNull(),
  },
  (table) => [
    index('idx_search_terms_targets__pdb_id_entity_id').using(
      'btree',
      table.pdbId.asc().nullsLast().op('text_ops'),
      table.entityId.asc().nullsLast().op('text_ops')
    ),
    index('idx_search_terms_targets__search_term_id').using(
      'btree',
      table.searchTermId.asc().nullsLast().op('int4_ops')
    ),
    foreignKey({
      columns: [table.searchTermId],
      foreignColumns: [searchTerms.searchTermId],
      name: 'search_terms_targets_search_term_id_fkey',
    }),
    foreignKey({
      columns: [table.pdbId],
      foreignColumns: [entries.pdbId],
      name: 'search_terms_targets_pdb_id_fkey',
    }),
    foreignKey({
      columns: [table.pdbId, table.entityId],
      foreignColumns: [targetsMetadata.pdbId, targetsMetadata.entityId],
      name: 'search_terms_targets_pdb_id_entity_id_fkey',
    }),
    unique('search_terms_targets_search_term_id_pdb_id_entity_id_key').on(
      table.searchTermId,
      table.pdbId,
      table.entityId
    ),
  ]
)

export const peptidesAccessions = pgTable(
  'peptides_accessions',
  {
    pdbId: text('pdb_id').notNull(),
    entityId: text('entity_id').notNull(),
    accession: text().notNull(),
  },
  (table) => [
    index('idx_peptides_accessions__accession').using(
      'btree',
      table.accession.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.pdbId, table.entityId],
      foreignColumns: [peptides.pdbId, peptides.entityId],
      name: 'peptides_accessions_pdb_id_entity_id_fkey',
    }),
    foreignKey({
      columns: [table.pdbId, table.entityId],
      foreignColumns: [peptidesMetadata.pdbId, peptidesMetadata.entityId],
      name: 'peptides_accessions_pdb_id_entity_id_fkey1',
    }),
    foreignKey({
      columns: [table.accession],
      foreignColumns: [uniprotMetadata.accession],
      name: 'peptides_accessions_accession_fkey',
    }),
    primaryKey({
      columns: [table.pdbId, table.entityId, table.accession],
      name: 'peptides_accessions_pkey',
    }),
  ]
)

export const targetsAccessions = pgTable(
  'targets_accessions',
  {
    pdbId: text('pdb_id').notNull(),
    entityId: text('entity_id').notNull(),
    accession: text().notNull(),
  },
  (table) => [
    index('idx_targets_accessions__accession').using(
      'btree',
      table.accession.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.pdbId, table.entityId],
      foreignColumns: [targetsMetadata.pdbId, targetsMetadata.entityId],
      name: 'targets_accessions_pdb_id_entity_id_fkey',
    }),
    foreignKey({
      columns: [table.accession],
      foreignColumns: [uniprotMetadata.accession],
      name: 'targets_accessions_accession_fkey',
    }),
    primaryKey({
      columns: [table.pdbId, table.entityId, table.accession],
      name: 'targets_accessions_pkey',
    }),
  ]
)

export const peptides = pgTable(
  'peptides',
  {
    pdbId: text('pdb_id').notNull(),
    entityId: text('entity_id').notNull(),
    sequence: text().notNull(),
    residueNamesJson: text('residue_names_json').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.pdbId],
      foreignColumns: [entries.pdbId],
      name: 'peptides_pdb_id_fkey',
    }),
    primaryKey({
      columns: [table.pdbId, table.entityId],
      name: 'peptides_pkey',
    }),
  ]
)

export const peptidesMetadata = pgTable(
  'peptides_metadata',
  {
    pdbId: text('pdb_id').notNull(),
    entityId: text('entity_id').notNull(),
    entityName: text('entity_name').notNull(),
    organismScientificNamesJson: text('organism_scientific_names_json').notNull(),
    taxonomyIdsJson: text('taxonomy_ids_json').notNull(),
    accessionsJson: text('accessions_json').notNull(),
    polymerType: text('polymer_type').notNull(),
    sequenceLength: integer('sequence_length'),
  },
  (table) => [
    index('idx_peptides_metadata__entity_name').using(
      'btree',
      table.entityName.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.pdbId, table.entityId],
      foreignColumns: [peptides.pdbId, peptides.entityId],
      name: 'peptides_metadata_pdb_id_entity_id_fkey',
    }),
    primaryKey({
      columns: [table.pdbId, table.entityId],
      name: 'peptides_metadata_pkey',
    }),
  ]
)

export const targetsMetadata = pgTable(
  'targets_metadata',
  {
    pdbId: text('pdb_id').notNull(),
    entityId: text('entity_id').notNull(),
    entityName: text('entity_name').notNull(),
    organismScientificNamesJson: text('organism_scientific_names_json').notNull(),
    taxonomyIdsJson: text('taxonomy_ids_json').notNull(),
    accessionsJson: text('accessions_json').notNull(),
    polymerType: text('polymer_type').notNull(),
    sequenceLength: integer('sequence_length'),
  },
  (table) => [
    index('idx_targets_metadata__entity_name').using(
      'btree',
      table.entityName.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.pdbId],
      foreignColumns: [entries.pdbId],
      name: 'targets_metadata_pdb_id_fkey',
    }),
    primaryKey({
      columns: [table.pdbId, table.entityId],
      name: 'targets_metadata_pkey',
    }),
  ]
)
