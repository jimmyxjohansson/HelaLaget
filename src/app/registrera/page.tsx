import { Suspense } from 'react'
import RegisterForm from './RegisterForm'

export const metadata = { title: 'Skapa konto – Hela Laget' }

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-sm">
        <h1 className="text-xl font-bold">Skapa konto</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Efter att du skapat kontot ansöker du om att gå med i ditt lag med lagets kod.
        </p>
        <Suspense fallback={null}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  )
}
