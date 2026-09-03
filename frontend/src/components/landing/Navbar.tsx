'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu,
  X,
  Bot,
  LayoutDashboard,
  Map,
  StickyNote,
  User,
  LogOut,
  ChevronDown,
  BookOpen,
  Calendar,
  CreditCard,
} from 'lucide-react'
import { isAuthenticated, getUser, logout } from '@/lib/auth-client'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [logged, setLogged] = useState(false)
  const [userName, setUserName] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const authed = isAuthenticated()
    setLogged(authed)
    if (authed) {
      const user = getUser()
      if (user?.nome) setUserName(user.nome.split(' ')[0])
    }
  }, [pathname])

  /* ── close dropdown on outside click ── */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-more-menu]')) {
        setMoreOpen(false)
      }
    }
    if (moreOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [moreOpen])

  /* ── body scroll lock when drawer open ── */
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      return () => {
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [open])

  /* ── ESC to close ── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false)
    },
    [open],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const isAuthPage =
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/cadastro') ||
    pathname?.startsWith('/esqueci-senha') ||
    pathname?.startsWith('/redefinir-senha') ||
    pathname?.startsWith('/verificacao')
  if (isAuthPage) return null

  const closeDrawer = () => setOpen(false)

  const navLink = (href: string, label: string, icon: React.ReactNode) => {
    const isActive = pathname === href
    return (
      <Link
        href={href}
        onClick={closeDrawer}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
          isActive
            ? 'bg-accent/10 text-accent'
            : 'text-secondary hover:bg-white/5 hover:text-primary'
        }`}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {label}
      </Link>
    )
  }

  return (
    <>
      {/* ════════════════ HEADER ════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-[1100] border-b border-border/50 bg-primary/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-primary">
            <img src="/logo.png" alt="AutoAssist" className="h-22 w-auto" />
          </Link>

          {/* ── Desktop nav ── */}
          <div className="hidden items-center gap-1 md:flex">
            {logged ? (
              <>
                {navLink('/dashboard', 'Dashboard', <LayoutDashboard className="h-4 w-4" />)}
                {navLink('/chat', 'Chat', <Bot className="h-4 w-4" />)}
                {navLink('/planos', 'Planos', <CreditCard className="h-4 w-4" />)}

                <div className="relative" data-more-menu>
                  <button
                    onClick={() => setMoreOpen(!moreOpen)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                      moreOpen
                        ? 'bg-accent/10 text-accent'
                        : 'text-secondary hover:bg-white/5 hover:text-primary'
                    }`}
                  >
                    Mais
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        moreOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {moreOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-zinc-700 py-1.5 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150 z-[1200]"
                      style={{ backgroundColor: '#18181b' }}
                    >
                      <div className="px-1.5">
                        {navLink('/anotacoes', 'Anotações', <StickyNote className="h-4 w-4" />)}
                        {navLink('/maps', 'Mapa', <Map className="h-4 w-4" />)}
                        {navLink('/biblioteca', 'Biblioteca', <BookOpen className="h-4 w-4" />)}
                        {navLink('/eventos', 'Eventos', <Calendar className="h-4 w-4" />)}
                      </div>
                      <div className="mx-3 my-1.5 h-px bg-border/40" />
                      <div className="px-1.5">
                        <button
                          onClick={() => {
                            setMoreOpen(false)
                            logout()
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-danger/10 hover:text-danger"
                        >
                          <LogOut className="h-4 w-4" />
                          Sair
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <Link
                  href="/perfil"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent transition-colors duration-150 hover:bg-accent/30"
                >
                  {userName.charAt(0).toUpperCase()}
                </Link>
              </>
            ) : (
              <>
                {navLink('/chat', 'Chat', <Bot className="h-4 w-4" />)}
                {navLink('/planos', 'Planos', <CreditCard className="h-4 w-4" />)}
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-white/5 hover:text-primary"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                >
                  Criar Conta
                </Link>
              </>
            )}
          </div>

          {/* ── Hamburger (mobile) ── */}
          <button
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-white/5 hover:text-primary md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </nav>
      </header>

      {/* ════════════════ DRAWER (outside header) ════════════════ */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 z-[1300] flex h-dvh w-72 flex-col border-l border-border/50 bg-primary shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
      >
        {/* ── Drawer header (fixed, no scroll) ── */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 px-5">
          <span className="text-sm font-semibold text-primary">Menu</span>
          <button
            onClick={closeDrawer}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-white/5 hover:text-primary"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Drawer content (scrollable) ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          {/* Navigation links */}
          <div className="flex flex-col gap-1">
            {logged ? (
              <>
                {navLink('/dashboard', 'Dashboard', <LayoutDashboard className="h-4 w-4" />)}
                {navLink('/chat', 'Chat', <Bot className="h-4 w-4" />)}
                {navLink('/planos', 'Planos', <CreditCard className="h-4 w-4" />)}
                {navLink('/anotacoes', 'Anotações', <StickyNote className="h-4 w-4" />)}
                {navLink('/maps', 'Mapa', <Map className="h-4 w-4" />)}
                {navLink('/biblioteca', 'Biblioteca', <BookOpen className="h-4 w-4" />)}
                {navLink('/eventos', 'Eventos', <Calendar className="h-4 w-4" />)}
                {navLink('/perfil', 'Perfil', <User className="h-4 w-4" />)}
              </>
            ) : (
              <>
                {navLink('/chat', 'Chat', <Bot className="h-4 w-4" />)}
                {navLink('/planos', 'Planos', <CreditCard className="h-4 w-4" />)}
              </>
            )}
          </div>
        </div>

        {/* ── Drawer footer (fixed, no scroll) ── */}
        <div className="shrink-0 border-t border-border/50 px-3 py-4">
          {logged ? (
            <div className="flex flex-col gap-3">
              {/* User profile */}
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="truncate text-sm font-medium text-primary">{userName}</span>
              </div>

              {/* Logout */}
              <button
                onClick={() => {
                  closeDrawer()
                  logout()
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                onClick={closeDrawer}
                className="rounded-lg px-3 py-2.5 text-center text-sm font-medium text-secondary transition-colors hover:bg-white/5 hover:text-primary"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                onClick={closeDrawer}
                className="rounded-lg bg-accent px-3 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Criar Conta
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
