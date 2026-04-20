'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Component, Stage, StructureComponent } from 'ngl'
import type { PdbEntryChainPair } from '@/db/queries/entries'
import {
  PDB_CHAIN_PAIR_FOCUS_EVENT,
  type PdbChainPairFocusDetail,
} from '@/components/pdb/chainPairFocusEvent'

const PEPTIDE_COLOR = '#1f8f5f'
const TARGET_COLOR = '#d35a6a'
const CONTEXT_COLOR = '#fbfcfc'
const RCSB_DOWNLOAD_BASE_URL = 'https://files.rcsb.org/download'

type PdbStructureViewerProps = {
  pdbId: string
  assemblyFileName: string
  chainPairs: PdbEntryChainPair[]
}

type ViewerStatus = 'idle' | 'loading' | 'ready' | 'error'

function hasKnownStructureExtension(fileName: string): boolean {
  return /\.(bcif|cif|ent|mmtf|pdb)(\.gz)?$/i.test(fileName)
}

function getAssemblyDownloadFileName(assemblyFileName: string): string {
  if (hasKnownStructureExtension(assemblyFileName)) {
    return assemblyFileName
  }

  return `${assemblyFileName}.cif.gz`
}

function chainSelection(chainId: string): string {
  return `:${chainId.replaceAll("'", '')}`
}

function chainPairSelection(chainPair: PdbEntryChainPair): string {
  return `${chainSelection(chainPair.peptideChainId)} or ${chainSelection(chainPair.receptorChainId)}`
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

      component.removeAllRepresentations()

      component.addRepresentation('cartoon', {
        colorScheme: 'uniform',
        colorValue: CONTEXT_COLOR,
        opacity: 0.02,
        transparent: true,
      })

      component.addRepresentation('cartoon', {
        sele: chainSelection(chainPair.peptideChainId),
        colorScheme: 'uniform',
        colorValue: PEPTIDE_COLOR,
        opacity: 1,
      })
      component.addRepresentation('cartoon', {
        sele: chainSelection(chainPair.receptorChainId),
        colorScheme: 'uniform',
        colorValue: TARGET_COLOR,
        opacity: 1,
      })
      component.addRepresentation('ball+stick', {
        sele: chainSelection(chainPair.peptideChainId),
        colorScheme: 'uniform',
        colorValue: PEPTIDE_COLOR,
        radiusScale: 0.62,
      })
      component.addRepresentation('ball+stick', {
        sele: chainSelection(chainPair.receptorChainId),
        colorScheme: 'uniform',
        colorValue: TARGET_COLOR,
        radiusScale: 0.62,
      })
      setActiveChainPairId(chainPair.chainPairId)
      component.autoView(chainPairSelection(chainPair), 650)
    },
    [loadAssembly]
  )

  useEffect(() => {
    function focusChainPairFromEvent(event: Event) {
      const { chainPair } = (event as CustomEvent<PdbChainPairFocusDetail>).detail

      void focusChainPair(chainPair)
    }

    window.addEventListener(PDB_CHAIN_PAIR_FOCUS_EVENT, focusChainPairFromEvent)

    return () => {
      window.removeEventListener(PDB_CHAIN_PAIR_FOCUS_EVENT, focusChainPairFromEvent)
    }
  }, [focusChainPair])

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
      <section className="border border-[#d6dee3] bg-white p-5">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-[#426352] uppercase">Structure viewer</p>
          <h2 className="text-2xl font-semibold">{pdbId} assembly</h2>
          <p className="text-sm leading-6 text-[#555f58]">
            Selecting a curated pair fades the full structure to near-white, colors the peptide
            green, and colors the target red.
          </p>
          <a
            href={assemblyFileUrl}
            className="text-sm text-[#0c5f46] underline-offset-4 hover:underline focus:ring-2 focus:ring-[#1f6f54] focus:outline-none"
          >
            {assemblyDownloadFileName}
          </a>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void loadAssembly()
            }}
            disabled={status === 'loading'}
            className="h-11 rounded-lg bg-[#174b37] px-4 text-sm font-semibold text-white transition hover:bg-[#0f3929] focus:ring-4 focus:ring-[#b7d5c7] focus:outline-none disabled:cursor-wait disabled:bg-[#7f9188]"
          >
            {status === 'loading' ? 'Loading assembly...' : 'Load PDB assembly file'}
          </button>
          <button
            type="button"
            onClick={resetStructure}
            disabled={status !== 'ready'}
            className="h-11 rounded-lg border border-[#9eabb2] bg-white px-4 text-sm font-semibold text-[#26312a] transition hover:bg-[#f5f7f9] focus:ring-4 focus:ring-[#b7d5c7] focus:outline-none disabled:cursor-not-allowed disabled:text-[#8a958f]"
          >
            Reset colors
          </button>
        </div>

        <p className="mt-3 min-h-6 text-sm text-[#555f58]" aria-live="polite">
          {status === 'idle' ? 'The assembly loads only after you request it.' : null}
          {status === 'ready' && activeChainPair
            ? `Focused peptide chain ${activeChainPair.peptideChainId} with target chain ${activeChainPair.receptorChainId}.`
            : null}
          {status === 'ready' && !activeChainPair ? 'Assembly loaded.' : null}
          {status === 'error' ? (errorMessage ?? 'Assembly loading failed.') : null}
        </p>

        <div
          ref={containerRef}
          className="mt-5 h-[26rem] w-full overflow-hidden border border-[#c7d1d8] bg-white sm:h-[34rem] lg:h-[42rem]"
          aria-label={`${pdbId} molecular structure viewer`}
        />
      </section>
    </aside>
  )
}
