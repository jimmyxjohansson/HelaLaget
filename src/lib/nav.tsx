'use client'

import { forwardRef, useMemo, type ComponentProps } from 'react'
import NextLink from 'next/link'
import { usePathname as useNextPathname, useRouter as useNextRouter } from 'next/navigation'
import { ACCOUNT_ROOTS, ANY_SQUAD, TEAM_ROOTS } from './team-routes'

export { ANY_SQUAD, TEAM_ROOTS }

/**
 * Lagets sidor ligger under lagets namn i adressen, t.ex.
 * /skabersjo-if-p-13/matches. Vyerna skriver sökvägar utan laget ("/matches");
 * Link, useRouter och usePathname här lägger till och tar bort det.
 */

let currentSlug: string | null = null

export function setCurrentSlug(slug: string | null) {
  currentSlug = slug
}

export function getCurrentSlug() {
  return currentSlug
}

function firstSegment(path: string) {
  return path.split(/[/?#]/)[1] ?? ''
}

/** "/matches/3" → "/skabersjo-if-p-13/matches/3". Kontosidor och externa länkar lämnas. */
export function teamPath(path: string, slug: string | null = currentSlug) {
  if (!slug || !path.startsWith('/') || path.startsWith('//')) return path
  const first = firstSegment(path)
  if (ACCOUNT_ROOTS.includes(first) || first === slug) return path
  const rest = path === '/' ? '' : path.startsWith('/?') || path.startsWith('/#') ? path.slice(1) : path
  return `/${slug}${rest}`
}

/** "/skabersjo-if-p-13/matches/3" → "/matches/3". */
export function stripTeam(pathname: string) {
  const first = firstSegment(pathname)
  if (!first || ACCOUNT_ROOTS.includes(first) || TEAM_ROOTS.includes(first)) return pathname
  return pathname.slice(first.length + 1) || '/'
}

/** Lagets namn i adressen, eller null på kontosidor och gamla adresser. */
export function slugFromPath(pathname: string) {
  const first = firstSegment(pathname)
  if (!first || ACCOUNT_ROOTS.includes(first) || TEAM_ROOTS.includes(first)) return null
  return decodeURIComponent(first)
}

type LinkProps = ComponentProps<typeof NextLink>

/** next/link som lägger till lagets namn i adressen. */
const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ href, ...props }, ref) {
  const target = typeof href === 'string' ? teamPath(href) : href
  return <NextLink ref={ref} href={target} {...props} />
})
export default Link

/** useRouter som lägger till lagets namn i adressen vid push och replace. */
export function useRouter() {
  const router = useNextRouter()
  return useMemo(
    () => {
      type Nav = (href: string, ...rest: unknown[]) => void
      const push = router.push as Nav
      const replace = router.replace as Nav
      return {
        ...router,
        push: (href: string, ...rest: unknown[]) => push(teamPath(href), ...rest),
        replace: (href: string, ...rest: unknown[]) => replace(teamPath(href), ...rest),
      }
    },
    [router],
  )
}

/** usePathname utan lagets namn, t.ex. "/matches/3". */
export function usePathname() {
  const pathname = useNextPathname()
  return pathname == null ? pathname : stripTeam(pathname)
}
