'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useRequestJoin } from '../../hooks/backend/account'
import { setSquadCookie } from '../../lib/squad-cookie'
import { Button } from '../../lib/shadcn/button'
import { PageHeader } from './shared'

/** Inbjudningslänk /join/<kod>: skickar ansökan direkt. */
export default function JoinByLink() {
  const { code } = useParams<{ code: string }>()
  const { trigger: requestJoin } = useRequestJoin()
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    requestJoin({ code })
      .then((res) => {
        if (res.status === 'approved') {
          setSquadCookie(res.squadId)
          window.location.href = '/'
          return
        }
        setResult({
          ok: true,
          text: `Din ansökan till ${res.organizationName} ${res.squadName} är skickad. Du får tillgång när lagets admin har godkänt den.`,
        })
      })
      .catch((e: Error) => setResult({ ok: false, text: e.message }))
  }, [code, requestJoin])

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader title="Gå med i lag" subtitle="Hela Laget" back={false} />
      <div className="p-6 flex flex-col gap-4">
        {!result ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Skickar ansökan …
          </p>
        ) : (
          <p className={result.ok ? 'text-sm' : 'text-sm text-destructive'}>{result.text}</p>
        )}
        {result && (
          <Button asChild variant="outline">
            <Link href="/lag">Till Mina lag</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
