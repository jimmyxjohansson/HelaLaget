import { Suspense } from 'react'
import LoginForm from './LoginForm'

export const metadata = { title: 'Logga in – Skabersjö IF' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-sm">
        <h1 className="text-xl font-bold">Skabersjö IF</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">Logga in för att fortsätta.</p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
