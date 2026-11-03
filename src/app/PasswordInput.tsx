'use client'

import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Input } from '@/lib/shadcn/input'

/** Lösenordsfält med lås-ikon och knapp för att visa lösenordet. */
export default function PasswordInput(props: Omit<ComponentProps<typeof Input>, 'type'>) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input {...props} type={show ? 'text' : 'password'} className="h-11 pl-9 pr-10" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        aria-label={show ? 'Dölj lösenordet' : 'Visa lösenordet'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
