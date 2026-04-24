'use client'

import type { PdbEntryChainPair } from '@/db/queries/entries'
import { dispatchPdbChainPairFocus } from '@/components/pdb/chainPairFocusEvent'
import { ResidueSequence } from '@/components/pdb/ResidueSequence'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

type ChainPairAccordionProps = {
  chainPairs: PdbEntryChainPair[]
}

function ChainPairHeader({ chainPair }: { chainPair: PdbEntryChainPair }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-[#dcebe3] text-[#174b37] hover:bg-[#dcebe3]">
            Chain {chainPair.peptideChainId}
          </Badge>
          <Badge className="bg-[#f4d8dd] text-[#6a1f2f] hover:bg-[#f4d8dd]">
            Chain {chainPair.receptorChainId}
          </Badge>
          <Badge variant="outline" className="border-[#d6dee3] bg-white text-[#4f5951]">
            Entity {chainPair.receptorEntityId}
          </Badge>
        </div>
      </div>

      <div className="flex shrink-0 items-center">
        <Button
          type="button"
          size="sm"
          className="cursor-pointer bg-[#174b37] text-white hover:bg-[#0f3929]"
          onClick={() => dispatchPdbChainPairFocus(chainPair)}
        >
          Focus
        </Button>
      </div>
    </header>
  )
}

function SequenceSection({
  title,
  sequence,
  residueNames,
}: {
  title: string
  sequence: string
  residueNames: string[]
}) {
  return (
    <section className="min-w-0">
      <h4 className="text-sm font-semibold text-[#2f3831]">{title}</h4>
      <div className="mt-2">
        <ResidueSequence sequence={sequence} residueNames={residueNames} />
      </div>
    </section>
  )
}

function ChainPairCard({ chainPair }: { chainPair: PdbEntryChainPair }) {
  return (
    <Card className="border border-[#d6dee3] bg-[#fbfcfc] py-0 shadow-none ring-0">
      <CardHeader className="px-4 py-4">
        <ChainPairHeader chainPair={chainPair} />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid gap-5">
          <SequenceSection
            title="Peptide residues"
            sequence={chainPair.peptideSequence}
            residueNames={chainPair.peptideResidueNames}
          />
          <SequenceSection
            title="Target residues"
            sequence={chainPair.receptorSequence}
            residueNames={chainPair.receptorResidueNames}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function ChainPairAccordion({ chainPairs }: ChainPairAccordionProps) {
  if (chainPairs.length === 0) {
    return <p className="text-sm text-[#5f675f]">No curated chain pairs for this peptide.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {chainPairs.map((chainPair) => (
        <ChainPairCard key={chainPair.chainPairId} chainPair={chainPair} />
      ))}
    </div>
  )
}
