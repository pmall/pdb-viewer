import type { PdbEntryPage, PdbEntryPeptide } from '@/db/queries/entries'
import { ChainPairAccordion } from '@/components/pdb/ChainPairAccordion'
import { ResidueSequence } from '@/components/pdb/ResidueSequence'

type PdbEntryDetailsProps = {
  entryPage: PdbEntryPage
}

function formatValue(value: string | number | boolean | null): string {
  if (value === null) {
    return 'Not reported'
  }

  return String(value)
}

function formatResolution(resolution: number | null): string {
  if (resolution === null) {
    return 'Not reported'
  }

  return `${resolution.toFixed(2)} A`
}

function formatList(values: Array<string | number>): string {
  if (values.length === 0) {
    return 'Not reported'
  }

  return values.join(', ')
}

function EntryMetadata({ entry }: { entry: PdbEntryPage['entry'] }) {
  return (
    <section className="border border-[#d6dee3] bg-white p-5">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-[#426352] uppercase">PDB metadata</p>
        <h1 className="text-3xl leading-tight font-semibold text-[#171717] sm:text-4xl">
          {entry.pdbId}
        </h1>
        <p className="text-lg leading-8 text-[#444b45]">{entry.title ?? 'Untitled entry'}</p>
      </div>

      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-[#2f3831]">Assembly file</dt>
          <dd className="mt-1 text-[#555f58]">{entry.assemblyFileStem}</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#2f3831]">Resolution</dt>
          <dd className="mt-1 text-[#555f58]">{formatResolution(entry.bestResolution)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#2f3831]">Experimental methods</dt>
          <dd className="mt-1 text-[#555f58]">{formatList(entry.experimentalMethods)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#2f3831]">Resolution values</dt>
          <dd className="mt-1 text-[#555f58]">
            {entry.resolutionCombined.length > 0
              ? entry.resolutionCombined.map(formatValue).join(', ')
              : 'Not reported'}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-[#2f3831]">Deposited</dt>
          <dd className="mt-1 text-[#555f58]">{entry.depositionDate ?? 'Not reported'}</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#2f3831]">Released</dt>
          <dd className="mt-1 text-[#555f58]">{entry.initialReleaseDate ?? 'Not reported'}</dd>
        </div>
      </dl>
    </section>
  )
}

function PeptideEntity({ peptide }: { peptide: PdbEntryPeptide }) {
  return (
    <article className="border border-[#d6dee3] bg-white p-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-[#426352] uppercase">
          Peptide entity {peptide.entityId}
        </p>
        <h2 className="text-2xl leading-tight font-semibold">
          {peptide.entityName ?? 'Unnamed peptide entity'}
        </h2>
        <p className="text-sm text-[#555f58]">
          {peptide.polymerType ?? 'Polymer type not reported'} ·{' '}
          {peptide.sequenceLength === null
            ? 'Sequence length not reported'
            : `${peptide.sequenceLength} residues`}
        </p>
      </div>

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-[#2f3831]">Organisms</dt>
          <dd className="mt-1 text-[#555f58]">{formatList(peptide.organismScientificNames)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#2f3831]">Taxonomy IDs</dt>
          <dd className="mt-1 text-[#555f58]">{formatList(peptide.taxonomyIds)}</dd>
        </div>
      </dl>

      <div className="mt-6">
        <h3 className="text-base font-semibold">Peptide sequence</h3>
        <p className="mt-1 text-sm text-[#5f675f]">
          Click a residue to compare the one-letter code with the three-letter residue name.
        </p>
        <div className="mt-3">
          <ResidueSequence sequence={peptide.sequence} residueNames={peptide.residueNames} />
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-base font-semibold">Curated chain pairs</h3>
        <div className="mt-3">
          <ChainPairAccordion chainPairs={peptide.chainPairs} />
        </div>
      </div>
    </article>
  )
}

export function PdbEntryDetails({ entryPage }: PdbEntryDetailsProps) {
  return (
    <div className="flex flex-col gap-6">
      <EntryMetadata entry={entryPage.entry} />
      <section className="flex flex-col gap-4">
        {entryPage.peptides.map((peptide) => (
          <PeptideEntity key={peptide.entityId} peptide={peptide} />
        ))}
      </section>
    </div>
  )
}
