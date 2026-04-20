import type { PdbEntryChainPair } from '@/db/queries/entries'

export const PDB_CHAIN_PAIR_FOCUS_EVENT = 'pdb-viewer:focus-chain-pair'

export type PdbChainPairFocusDetail = {
  chainPair: PdbEntryChainPair
}

export function dispatchPdbChainPairFocus(chainPair: PdbEntryChainPair): void {
  window.dispatchEvent(
    new CustomEvent<PdbChainPairFocusDetail>(PDB_CHAIN_PAIR_FOCUS_EVENT, {
      detail: {
        chainPair,
      },
    })
  )
}
