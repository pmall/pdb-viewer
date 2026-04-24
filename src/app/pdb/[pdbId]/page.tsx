import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PdbEntryDetails } from '@/components/pdb/PdbEntryDetails'
import { PdbStructureViewer } from '@/components/pdb/PdbStructureViewer'
import { Button } from '@/components/ui/button'
import { getPdbEntryPage } from '@/db/queries/entries'

type PdbEntryRouteProps = {
  params: Promise<{
    pdbId: string
  }>
}

export default async function PdbEntryPage({ params }: PdbEntryRouteProps) {
  const { pdbId } = await params
  const entryPage = await getPdbEntryPage(pdbId)

  if (!entryPage) {
    notFound()
  }

  const chainPairs = entryPage.peptides.flatMap((peptide) => peptide.chainPairs)

  return (
    <main className="min-h-screen bg-[#f5f7f9] text-[#171717]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8 lg:px-12">
        <Button asChild variant="link" className="w-fit px-0 text-sm font-semibold text-[#0c5f46]">
          <Link href="/">Back to search</Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)] lg:items-start">
          <div className="min-w-0 break-words">
            <PdbEntryDetails entryPage={entryPage} />
          </div>
          <div className="min-w-0 lg:sticky lg:top-6">
            <PdbStructureViewer
              pdbId={entryPage.entry.pdbId}
              assemblyFileName={entryPage.entry.assemblyFileStem}
              chainPairs={chainPairs}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
