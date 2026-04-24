import type { PdbEntryPage, PdbEntryPeptide } from '@/db/queries/entries'
import { ChainPairAccordion } from '@/components/pdb/ChainPairAccordion'
import { ResidueSequence } from '@/components/pdb/ResidueSequence'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

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
    <Card className="border border-[#d6dee3] bg-white py-0 shadow-none ring-0">
      <CardHeader className="gap-3 border-b border-[#d6dee3] px-5 py-5">
        <Badge variant="outline" className="w-fit uppercase">
          PDB metadata
        </Badge>
        <div className="flex flex-col gap-3">
          <CardTitle className="text-3xl leading-tight font-semibold text-[#171717] sm:text-4xl">
            {entry.pdbId}
          </CardTitle>
          <p className="text-lg leading-8 text-[#444b45]">{entry.title ?? 'Untitled entry'}</p>
        </div>
      </CardHeader>
      <CardContent className="px-5 py-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
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
      </CardContent>
    </Card>
  )
}

function PeptideEntity({ peptide }: { peptide: PdbEntryPeptide }) {
  return (
    <>
      <CardHeader className="px-5 py-5">
        <AccordionTrigger className="gap-4 py-0 hover:no-underline">
          <div className="flex min-w-0 flex-1 flex-col gap-3 pr-4 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Peptide entity {peptide.entityId}</Badge>
              <Badge variant="outline">{peptide.polymerType ?? 'Polymer type not reported'}</Badge>
              <Badge variant="outline">
                {peptide.sequenceLength === null
                  ? 'Sequence length not reported'
                  : `${peptide.sequenceLength} residues`}
              </Badge>
            </div>
            <div className="min-w-0">
              <CardTitle className="text-2xl leading-tight font-semibold text-[#171717]">
                {peptide.entityName ?? 'Unnamed peptide entity'}
              </CardTitle>
            </div>
          </div>
        </AccordionTrigger>
      </CardHeader>
      <AccordionContent className="px-5 pb-5">
        <Separator className="mb-5 bg-[#d6dee3]" />

        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-[#2f3831]">Organisms</dt>
            <dd className="mt-1 text-[#555f58]">{formatList(peptide.organismScientificNames)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[#2f3831]">Taxonomy IDs</dt>
            <dd className="mt-1 text-[#555f58]">{formatList(peptide.taxonomyIds)}</dd>
          </div>
        </dl>

        <Card className="mt-6 border border-[#d6dee3] bg-[#fbfcfc] py-0 shadow-none ring-0">
          <CardHeader className="gap-2 px-4 py-4">
            <CardTitle className="text-base font-semibold text-[#171717]">
              Peptide sequence
            </CardTitle>
            <p className="text-sm text-[#5f675f]">
              Click a residue to compare the one-letter code with the three-letter residue name.
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResidueSequence sequence={peptide.sequence} residueNames={peptide.residueNames} />
          </CardContent>
        </Card>

        <div className="mt-6">
          <h3 className="text-base font-semibold">Curated chain pairs</h3>
          <div className="mt-3">
            <ChainPairAccordion chainPairs={peptide.chainPairs} />
          </div>
        </div>
      </AccordionContent>
    </>
  )
}

export function PdbEntryDetails({ entryPage }: PdbEntryDetailsProps) {
  return (
    <div className="flex flex-col gap-6">
      <EntryMetadata entry={entryPage.entry} />
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[#171717]">Peptide entities</h2>
          <Badge variant="outline">
            {entryPage.peptides.length} {entryPage.peptides.length === 1 ? 'entity' : 'entities'}
          </Badge>
        </div>
        <Accordion type="multiple" className="gap-4">
          {entryPage.peptides.map((peptide) => (
            <AccordionItem key={peptide.entityId} value={peptide.entityId} className="border-0">
              <Card className="overflow-hidden border border-[#d6dee3] bg-white py-0 shadow-none ring-0">
                <PeptideEntity peptide={peptide} />
              </Card>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  )
}
