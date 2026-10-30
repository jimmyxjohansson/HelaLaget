'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, UserPlus } from 'lucide-react'
import {
  useAddOrganizationAdmin,
  useAddSquadAdmin,
  useCreateOrganization,
  useCreateSquad,
  useGetOrganizations,
} from '../../hooks/backend/organizations'
import { Button } from '../../lib/shadcn/button'
import { Input } from '../../lib/shadcn/input'
import { ErrorText, PageHeader, Section } from './shared'

/** Föreningar och lag. Superadmin skapar föreningar; föreningsadmins skapar lag. */
export default function Organizations() {
  const orgs = useGetOrganizations()
  const createOrg = useCreateOrganization()
  const createSquad = useCreateSquad()
  const addOrgAdmin = useAddOrganizationAdmin()
  const addSquadAdmin = useAddSquadAdmin()

  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [newOrg, setNewOrg] = useState({ name: '', adminEmail: '' })
  const [newSquad, setNewSquad] = useState<Record<number, { name: string; adminEmail: string }>>({})
  const [orgAdminEmail, setOrgAdminEmail] = useState<Record<number, string>>({})
  const [squadAdminEmail, setSquadAdminEmail] = useState<Record<number, string>>({})

  useEffect(() => {
    orgs.trigger().catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function run(action: () => Promise<unknown>, done: string, reset?: () => void) {
    setError(null)
    setNotice(null)
    try {
      await action()
      reset?.()
      setNotice(done)
      await orgs.trigger()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel.')
    }
  }

  const data = orgs.data
  const busy = createOrg.loading || createSquad.loading || addOrgAdmin.loading || addSquadAdmin.loading

  return (
    <div className="flex flex-col min-h-full pb-8">
      <PageHeader title="Föreningar" subtitle="Hela Laget" />
      <div className="px-4 pt-3">
        <ErrorText>{error}</ErrorText>
        {notice && <p className="text-sm text-success">{notice}</p>}
      </div>

      {!data && orgs.loading && (
        <div className="p-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {data?.organizations.map((o) => (
        <Section key={o.id} title={o.name}>
          <p className="text-xs text-muted-foreground mb-3">
            Föreningsadmins: {o.admins?.length ? o.admins.join(', ') : 'inga'}
          </p>

          <ul className="flex flex-col gap-3 mb-4">
            {(o.squads ?? []).map((s) => (
              <li key={s.id} className="rounded-lg border border-border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.members} medlemmar{s.pending ? `, ${s.pending} väntar` : ''}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Admins: {s.admins?.length ? s.admins.join(', ') : 'ingen – lägg till nedan'}
                </p>
                <form
                  className="flex gap-2 mt-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const email = squadAdminEmail[s.id] ?? ''
                    run(
                      () => addSquadAdmin.trigger({ squadId: s.id, email }),
                      `${email} är nu admin i ${s.name}.`,
                      () => setSquadAdminEmail((m) => ({ ...m, [s.id]: '' })),
                    )
                  }}
                >
                  <Input
                    type="email"
                    placeholder="E-post för ny lagadmin"
                    value={squadAdminEmail[s.id] ?? ''}
                    onChange={(e) => setSquadAdminEmail((m) => ({ ...m, [s.id]: e.target.value }))}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" variant="outline" disabled={busy || !squadAdminEmail[s.id]}>
                    <UserPlus /> Admin
                  </Button>
                </form>
              </li>
            ))}
          </ul>

          <form
            className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3"
            onSubmit={(e) => {
              e.preventDefault()
              const v = newSquad[o.id] ?? { name: '', adminEmail: '' }
              run(
                () => createSquad.trigger({ organizationId: o.id, name: v.name, adminEmail: v.adminEmail || null }),
                `Laget ${v.name} är skapat.`,
                () => setNewSquad((m) => ({ ...m, [o.id]: { name: '', adminEmail: '' } })),
              )
            }}
          >
            <p className="text-sm font-medium">Nytt lag i {o.name}</p>
            <Input
              placeholder="Lagets namn, t.ex. F12"
              value={newSquad[o.id]?.name ?? ''}
              onChange={(e) => setNewSquad((m) => ({ ...m, [o.id]: { ...(m[o.id] ?? { adminEmail: '' }), name: e.target.value } }))}
            />
            <Input
              type="email"
              placeholder="E-post för lagets admin (valfritt)"
              value={newSquad[o.id]?.adminEmail ?? ''}
              onChange={(e) =>
                setNewSquad((m) => ({ ...m, [o.id]: { ...(m[o.id] ?? { name: '' }), adminEmail: e.target.value } }))
              }
            />
            <Button type="submit" size="sm" disabled={busy || !newSquad[o.id]?.name?.trim()}>
              <Plus /> Skapa lag
            </Button>
          </form>

          {data.isSuperadmin && (
            <form
              className="flex gap-2 mt-3"
              onSubmit={(e) => {
                e.preventDefault()
                const email = orgAdminEmail[o.id] ?? ''
                run(
                  () => addOrganizationAdmin(o.id, email),
                  `${email} är nu föreningsadmin i ${o.name}.`,
                  () => setOrgAdminEmail((m) => ({ ...m, [o.id]: '' })),
                )
              }}
            >
              <Input
                type="email"
                placeholder="E-post för ny föreningsadmin"
                value={orgAdminEmail[o.id] ?? ''}
                onChange={(e) => setOrgAdminEmail((m) => ({ ...m, [o.id]: e.target.value }))}
                className="h-8 text-sm"
              />
              <Button size="sm" variant="outline" disabled={busy || !orgAdminEmail[o.id]}>
                <UserPlus /> Föreningsadmin
              </Button>
            </form>
          )}
        </Section>
      ))}

      {data?.isSuperadmin && (
        <Section title="Ny förening">
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              run(
                () => createOrg.trigger({ name: newOrg.name, adminEmail: newOrg.adminEmail || null }),
                `Föreningen ${newOrg.name} är skapad. Lägg till ett lag i den ovan.`,
                () => setNewOrg({ name: '', adminEmail: '' }),
              )
            }}
          >
            <Input placeholder="Föreningens namn" value={newOrg.name} onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })} />
            <Input
              type="email"
              placeholder="E-post för föreningsadmin (valfritt)"
              value={newOrg.adminEmail}
              onChange={(e) => setNewOrg({ ...newOrg, adminEmail: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Admins måste ha registrerat ett konto i appen innan de kan läggas till.
            </p>
            <Button type="submit" disabled={busy || !newOrg.name.trim()}>
              <Plus /> Skapa förening
            </Button>
          </form>
        </Section>
      )}
    </div>
  )

  function addOrganizationAdmin(organizationId: number, email: string) {
    return addOrgAdmin.trigger({ organizationId, email })
  }
}
