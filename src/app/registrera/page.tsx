import { Suspense } from 'react'
import AuthShell from '../AuthShell'
import RegisterForm from './RegisterForm'

export const metadata = { title: 'Skapa konto – Hela Laget' }

export default function RegisterPage() {
  return (
    <AuthShell
      title="Skapa konto"
      subtitle="När kontot är skapat ansöker du om att gå med i ditt lag, och lagets admin godkänner dig."
    >
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  )
}
