import { Suspense } from 'react'
import AuthShell from '../AuthShell'
import LoginForm from './LoginForm'

export const metadata = { title: 'Logga in – Hela Laget' }

export default function LoginPage() {
  return (
    <AuthShell title="Logga in" subtitle="Välkommen tillbaka!" footer="Glömt lösenordet? Kontakta lagets admin.">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}
