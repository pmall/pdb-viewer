'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Component, Stage, StructureComponent } from 'ngl'
import type { PdbEntryChainPair } from '@/db/queries/entries'
import {
  PDB_CHAIN_PAIR_FOCUS_EVENT,
  type PdbChainPairFocusDetail,
} from '@/components/pdb/chainPairFocusEvent'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const PEPTIDE_COLOR = '#1f8f5f'
const TARGET_COLOR = '#d35a6a'
const CONTEXT_COLOR = '#fbfcfc'
const RCSB_DOWNLOAD_BASE_URL = 'https://files.rcsb.org/download'
const RCSB_STRUCTURE_BASE_URL = 'https://www.rcsb.org/structure'
const RCSB_3D_VIEW_BASE_URL = 'https://www.rcsb.org/3d-view'

type PdbStructureViewerProps = {
  pdbId: string
  assemblyFileName: string
  chainPairs: PdbEntryChainPair[]
}

type ViewerStatus = 'idle' | 'loading' | 'ready' | 'error'

type StructureChainIdentifier = {
  chainname: string
  chainid: string
}

type ChainPairSelections = {
  peptideSelection: string | null
  receptorSelection: string | null
  combinedSelection: string | null
}

function hasKnownStructureExtension(fileName: string): boolean {
  return /\.(bcif|cif|ent|mmtf|pdb)(\.gz)?$/i.test(fileName)
}

function getAssemblyDownloadFileName(assemblyFileName: string): string {
  if (hasKnownStructureExtension(assemblyFileName)) {
    return assemblyFileName
  }

  return `${assemblyFileName}.cif.gz`
}

function getRcsbAssemblyUrl(pdbId: string, assemblyFileName: string): string {
  const assemblyId = assemblyFileName.match(/assembly(\d+)/i)?.[1]

  if (assemblyId) {
    return `${RCSB_3D_VIEW_BASE_URL}/${pdbId}/${assemblyId}`
  }

  return `${RCSB_STRUCTURE_BASE_URL}/${pdbId}`
}

function chainSelection(chainId: string): string {
  return `:${chainId.replaceAll("'", '')}`
}

function joinChainSelections(chainNames: string[]): string | null {
  const selections = Array.from(new Set(chainNames)).map(chainSelection)

  return selections.length > 0 ? selections.join(' or ') : null
}

function resolveCuratedChainSelection(
  structureChains: StructureChainIdentifier[],
  curatedChainId: string
): string | null {
  const chainIdMatches = structureChains
    .filter((chain) => chain.chainid === curatedChainId)
    .map((chain) => chain.chainname)

  if (chainIdMatches.length > 0) {
    return joinChainSelections(chainIdMatches)
  }

  const chainNameMatches = structureChains
    .filter((chain) => chain.chainname === curatedChainId)
    .map((chain) => chain.chainname)

  return joinChainSelections(chainNameMatches)
}

function getStructureChainIdentifiers(component: StructureComponent): StructureChainIdentifier[] {
  const structureChains: StructureChainIdentifier[] = []

  component.structure.eachChain((chain) => {
    structureChains.push({
      chainname: chain.chainname,
      chainid: chain.chainid,
    })
  })

  return structureChains
}

function resolveChainPairSelections(
  component: StructureComponent,
  chainPair: PdbEntryChainPair
): ChainPairSelections {
  const structureChains = getStructureChainIdentifiers(component)
  const peptideSelection = resolveCuratedChainSelection(structureChains, chainPair.peptideChainId)
  const receptorSelection = resolveCuratedChainSelection(structureChains, chainPair.receptorChainId)
  const combinedSelection =
    peptideSelection && receptorSelection ? `${peptideSelection} or ${receptorSelection}` : null

  return {
    peptideSelection,
    receptorSelection,
    combinedSelection,
  }
}

function isStructureComponent(component: Component | void): component is StructureComponent {
  return Boolean(component && component.type === 'structure')
}

export function PdbStructureViewer({
  pdbId,
  assemblyFileName,
  chainPairs,
}: PdbStructureViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Stage | null>(null)
  const structureRef = useRef<StructureComponent | null>(null)
  const [status, setStatus] = useState<ViewerStatus>('idle')
  const [activeChainPairId, setActiveChainPairId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const activeChainPair = useMemo(
    () => chainPairs.find((chainPair) => chainPair.chainPairId === activeChainPairId) ?? null,
    [activeChainPairId, chainPairs]
  )
  const assemblyDownloadFileName = getAssemblyDownloadFileName(assemblyFileName)
  const assemblyFileUrl = `${RCSB_DOWNLOAD_BASE_URL}/${assemblyDownloadFileName}`
  const rcsbAssemblyUrl = getRcsbAssemblyUrl(pdbId, assemblyFileName)

  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null
    let isDisposed = false

    async function createStage() {
      if (!containerRef.current) {
        return
      }

      const { Stage: NglStage } = await import('ngl')

      if (isDisposed || !containerRef.current) {
        return
      }

      const stage = new NglStage(containerRef.current, {
        backgroundColor: 'white',
        clipNear: 0,
        fogNear: 70,
        fogFar: 100,
        quality: 'medium',
      })

      stageRef.current = stage
      resizeObserver = new ResizeObserver(() => stage.handleResize())
      resizeObserver.observe(containerRef.current)
      stage.handleResize()
    }

    createStage()

    return () => {
      isDisposed = true
      resizeObserver?.disconnect()
      stageRef.current?.dispose()
      stageRef.current = null
      structureRef.current = null
    }
  }, [])

  const showInitialStructure = useCallback((component: StructureComponent) => {
    component.removeAllRepresentations()
    component.addRepresentation('cartoon', {
      colorScheme: 'chainname',
      opacity: 1,
    })
  }, [])

  const resetStructure = useCallback(() => {
    const component = structureRef.current

    if (!component) {
      return
    }

    showInitialStructure(component)
    setActiveChainPairId(null)
    component.autoView(650)
  }, [showInitialStructure])

  const loadAssembly = useCallback(async (): Promise<StructureComponent | null> => {
    const stage = stageRef.current

    if (!stage) {
      setErrorMessage('The molecular viewer is still starting.')
      return null
    }

    if (structureRef.current) {
      return structureRef.current
    }

    setStatus('loading')
    setErrorMessage(null)

    try {
      const component = await stage.loadFile(assemblyFileUrl, {
        defaultRepresentation: false,
      })

      if (!isStructureComponent(component)) {
        throw new Error('The assembly file did not load as a structure.')
      }

      showInitialStructure(component)
      component.autoView(0)
      structureRef.current = component
      setStatus('ready')

      return component
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'The assembly file could not load.')
      return null
    }
  }, [assemblyFileUrl, showInitialStructure])

  const focusChainPair = useCallback(
    async (chainPair: PdbEntryChainPair) => {
      const component = await loadAssembly()

      if (!component) {
        return
      }

      const { peptideSelection, receptorSelection, combinedSelection } = resolveChainPairSelections(
        component,
        chainPair
      )

      if (!peptideSelection || !receptorSelection || !combinedSelection) {
        setErrorMessage('The loaded assembly does not contain both curated chains for this pair.')
        return
      }

      setErrorMessage(null)
      component.removeAllRepresentations()

      component.addRepresentation('cartoon', {
        colorScheme: 'uniform',
        colorValue: CONTEXT_COLOR,
        opacity: 0.02,
        transparent: true,
      })

      component.addRepresentation('cartoon', {
        sele: peptideSelection,
        colorScheme: 'uniform',
        colorValue: PEPTIDE_COLOR,
        opacity: 1,
      })
      component.addRepresentation('cartoon', {
        sele: receptorSelection,
        colorScheme: 'uniform',
        colorValue: TARGET_COLOR,
        opacity: 1,
      })
      component.addRepresentation('ball+stick', {
        sele: peptideSelection,
        colorScheme: 'uniform',
        colorValue: PEPTIDE_COLOR,
        radiusScale: 0.62,
      })
      component.addRepresentation('ball+stick', {
        sele: receptorSelection,
        colorScheme: 'uniform',
        colorValue: TARGET_COLOR,
        radiusScale: 0.62,
      })
      setActiveChainPairId(chainPair.chainPairId)
      component.autoView(combinedSelection, 650)
    },
    [loadAssembly]
  )

  useEffect(() => {
    function focusChainPairFromEvent(event: Event) {
      const { chainPair } = (event as CustomEvent<PdbChainPairFocusDetail>).detail

      void focusChainPair(chainPair)

      if (window.innerWidth < 1024 && containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    window.addEventListener(PDB_CHAIN_PAIR_FOCUS_EVENT, focusChainPairFromEvent)

    return () => {
      window.removeEventListener(PDB_CHAIN_PAIR_FOCUS_EVENT, focusChainPairFromEvent)
    }
  }, [focusChainPair])

  return (
    <aside className="flex flex-col gap-4">
      <Card className="border border-[#d6dee3] bg-white py-0 shadow-none ring-0">
        <CardHeader className="gap-3 border-b border-[#d6dee3] px-5 py-5">
          <Badge variant="outline" className="w-fit uppercase">
            Structure viewer
          </Badge>
          <div className="flex flex-col gap-3">
            <CardTitle className="text-2xl font-semibold text-[#171717]">
              {pdbId} assembly
            </CardTitle>
            <p className="text-sm leading-6 text-[#555f58]">
              Selecting a curated pair fades the full structure to near-white, colors the peptide
              green, and colors the target red.
            </p>
            <a
              href={rcsbAssemblyUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[#0c5f46] underline-offset-4 hover:underline focus:ring-2 focus:ring-[#1f6f54] focus:outline-none"
            >
              View source assembly at RCSB PDB
            </a>
          </div>
        </CardHeader>

        <CardContent className="px-5 py-5">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              className="cursor-pointer"
              onClick={() => {
                void loadAssembly()
              }}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Loading assembly...' : 'Load PDB assembly file'}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="cursor-pointer"
              onClick={resetStructure}
              disabled={status !== 'ready'}
            >
              Reset colors
            </Button>
          </div>

          <p className="mt-3 min-h-6 text-sm text-[#555f58]" aria-live="polite">
            {status === 'idle' ? 'The assembly loads only after you request it.' : null}
            {status === 'ready' && errorMessage ? errorMessage : null}
            {status === 'ready' && !errorMessage && activeChainPair
              ? `Focused peptide chain ${activeChainPair.peptideChainId} with target chain ${activeChainPair.receptorChainId}.`
              : null}
            {status === 'ready' && !errorMessage && !activeChainPair ? 'Assembly loaded.' : null}
            {status === 'error' ? (errorMessage ?? 'Assembly loading failed.') : null}
          </p>

          <div
            ref={containerRef}
            className="mt-5 h-[26rem] w-full overflow-hidden rounded-xl border border-[#c7d1d8] bg-white sm:h-[34rem] lg:h-[42rem]"
            aria-label={`${pdbId} molecular structure viewer`}
          />
        </CardContent>
      </Card>
    </aside>
  )
}
