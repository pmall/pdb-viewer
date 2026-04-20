'use client'

import { useState } from 'react'
import type { PdbEntryChainPair } from '@/db/queries/entries'
import { dispatchPdbChainPairFocus } from '@/components/pdb/chainPairFocusEvent'
import { ResidueSequence } from '@/components/pdb/ResidueSequence'

type ChainPairAccordionProps = {
  chainPairs: PdbEntryChainPair[]
}

function toggleChainPair(openChainPairIds: Set<number>, chainPairId: number): Set<number> {
  const nextOpenChainPairIds = new Set(openChainPairIds)

  if (nextOpenChainPairIds.has(chainPairId)) {
    nextOpenChainPairIds.delete(chainPairId)
  } else {
    nextOpenChainPairIds.add(chainPairId)
  }

  return nextOpenChainPairIds
}

export function ChainPairAccordion({ chainPairs }: ChainPairAccordionProps) {
  const [openChainPairIds, setOpenChainPairIds] = useState<Set<number>>(() => new Set())

  if (chainPairs.length === 0) {
    return <p className="text-sm text-[#5f675f]">No curated chain pairs for this peptide.</p>
  }

  return (
    <div className="flex flex-col">
      {chainPairs.map((chainPair, index) => {
        const isOpen = openChainPairIds.has(chainPair.chainPairId)
        const sequencePanelId = `chain-pair-sequences-${chainPair.chainPairId}`

        return (
          <div key={chainPair.chainPairId}>
            {index > 0 ? <hr className="my-4 border-[#aebbc3]" /> : null}
            <article id={`chain-pair-${chainPair.chainPairId}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded bg-[#dcebe3] px-2 py-1 font-semibold text-[#174b37]">
                    Chain {chainPair.peptideChainId}
                  </span>
                  <span className="rounded bg-[#f4d8dd] px-2 py-1 font-semibold text-[#6a1f2f]">
                    Chain {chainPair.receptorChainId}
                  </span>
                  <span className="rounded border border-[#d6dee3] px-2 py-1 text-[#4f5951]">
                    Entity {chainPair.receptorEntityId}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={sequencePanelId}
                    onClick={() => {
                      setOpenChainPairIds((currentOpenChainPairIds) =>
                        toggleChainPair(currentOpenChainPairIds, chainPair.chainPairId)
                      )
                    }}
                    className="h-9 w-fit rounded-lg border border-[#9eabb2] bg-white px-3 text-sm font-semibold text-[#26312a] transition hover:bg-[#f5f7f9] focus:ring-2 focus:ring-[#1f6f54] focus:outline-none"
                  >
                    {isOpen ? 'Hide sequence' : 'Display sequence'}
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatchPdbChainPairFocus(chainPair)}
                    className="h-9 w-fit rounded-lg bg-[#174b37] px-3 text-sm font-semibold text-white transition hover:bg-[#0f3929] focus:ring-2 focus:ring-[#1f6f54] focus:outline-none"
                  >
                    Focus
                  </button>
                </div>
              </div>

              {isOpen ? (
                <div id={sequencePanelId} className="mt-4 grid gap-4">
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-[#2f3831]">Peptide residues</h4>
                    <div className="mt-2">
                      <ResidueSequence
                        sequence={chainPair.peptideSequence}
                        residueNames={chainPair.peptideResidueNames}
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-[#2f3831]">Target residues</h4>
                    <div className="mt-2">
                      <ResidueSequence
                        sequence={chainPair.receptorSequence}
                        residueNames={chainPair.receptorResidueNames}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          </div>
        )
      })}
    </div>
  )
}
