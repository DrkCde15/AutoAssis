import Link from 'next/link'

const productLinks = [
  { label: 'NOG IA', href: '/chat' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Planos', href: '/planos' },
  { label: 'B2B / API', href: '/b2b' },
]

const supportLinks = [
  { label: 'Dúvidas', href: '/duvidas' },
  { label: 'Blog', href: '/blog' },
  { label: 'Eventos', href: '/eventos' },
  { label: 'Feedback', href: '/feedback' },
]

const legalLinks = [
  { label: 'Termos de Uso', href: '/termos' },
  { label: 'Privacidade', href: '/privacidade' },
  { label: 'LGPD', href: '/lgpd' },
  { label: 'Analytics', href: '/analytics' },
]

export default function Footer() {
  return (
    <footer className="border-t border-border bg-primary">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-primary">
              <img src="/logo.png" alt="AutoAssist" className="h-10 w-auto" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Seu consultor automotivo inteligente. Diagnóstico, gestão e valor do
              seu veículo em um só lugar.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-primary">Produto</h4>
            <ul className="mt-4 space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-primary">Suporte</h4>
            <ul className="mt-4 space-y-2.5">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-primary">Legal</h4>
            <ul className="mt-4 space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-xs text-muted">
            &copy; 2026 AutoAssist. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted">
            Powered by{' '}
            <span className="font-medium text-secondary">NOG AI</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
