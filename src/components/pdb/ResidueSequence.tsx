'use client'

import { useEffect, useId, useRef, useState } from 'react'

type ResidueSequenceProps = {
  sequence: string
  residueNames: string[]
}

type TooltipState = {
  label: string
  residueKey: string
  x: number
  y: number
}

function getResidueLabel(index: number, residue: string, residueName: string): string {
  return `${index + 1}: ${residue} / ${residueName}`
}

function getTooltipPosition(element: HTMLElement): Pick<TooltipState, 'x' | 'y'> {
  const rect = element.getBoundingClientRect()

  return {
    x: rect.left + rect.width / 2,
    y: rect.top,
  }
}

export function ResidueSequence({ sequence, residueNames }: ResidueSequenceProps) {
  const tooltipId = useId()
  const sequenceRef = useRef<HTMLElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    if (!tooltip) {
      return
    }

    function closeTooltip(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        sequenceRef.current &&
        sequenceRef.current.contains(event.target)
      ) {
        return
      }

      setTooltip(null)
    }

    function closeTooltipOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setTooltip(null)
      }
    }

    document.addEventListener('click', closeTooltip)
    document.addEventListener('keydown', closeTooltipOnEscape)

    return () => {
      document.removeEventListener('click', closeTooltip)
      document.removeEventListener('keydown', closeTooltipOnEscape)
    }
  }, [tooltip])

  if (!sequence) {
    return <span className="text-[#5f675f]">No sequence reported.</span>
  }

  return (
    <>
      <code
        ref={sequenceRef}
        className="flex max-h-48 min-w-0 flex-wrap gap-x-1 gap-y-2 overflow-y-auto rounded-md border border-[#d6dee3] bg-[#f8fafb] p-3 text-sm leading-7 break-all text-[#1f2520]"
      >
        {Array.from(sequence).map((residue, index) => {
          const residueName = residueNames[index] ?? 'Unknown residue'
          const residueLabel = getResidueLabel(index, residue, residueName)
          const residueKey = `${residue}-${index}`
          const isSelected = tooltip?.residueKey === residueKey

          return (
            <button
              key={residueKey}
              type="button"
              aria-describedby={isSelected ? tooltipId : undefined}
              aria-expanded={isSelected}
              aria-label={residueLabel}
              onClick={(event) => {
                event.stopPropagation()
                setTooltip({
                  label: residueLabel,
                  residueKey,
                  ...getTooltipPosition(event.currentTarget),
                })
              }}
              className="min-w-4 rounded border border-transparent px-0.5 text-center font-mono hover:border-[#8eb4a2] hover:bg-white focus:border-[#8eb4a2] focus:bg-white focus:outline-none"
            >
              {residue}
            </button>
          )
        })}
      </code>

      {tooltip ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none fixed z-50 max-w-56 -translate-x-1/2 -translate-y-full rounded-md bg-[#1f2520] px-2 py-1 font-sans text-xs leading-5 text-white shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
          }}
        >
          {tooltip.label}
        </span>
      ) : null}
    </>
  )
}
