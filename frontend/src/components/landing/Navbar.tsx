'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Bot, LayoutDashboard, Map, StickyNote, User, LogOut, ChevronDown, BookOpen, Calendar, MessageSquare } from 'lucide-react'
import { isAuthenticated, getUser, logout } from '@/lib/auth-client'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [logged, setLogged] = useState(false)
  const [userName, setUserName] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const pathname = usePathname()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const authed = isAuthenticated()
    setLogged(authed)
    if (authed) {
      const user = getUser()
      if (user?.nome) setUserName(user.nome.split(' ')[0])
    }
  }, [pathname])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    if (moreOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [moreOpen])

  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/cadastro') || pathname?.startsWith('/esqueci-senha') || pathname?.startsWith('/redefinir-senha') || pathname?.startsWith('/verificacao')
  if (isAuthPage) return null

  const navLink = (href: string, label: string, icon: React.ReactNode) => {
    const isActive = pathname === href
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
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
    <header className="fixed top-0 left-0 right-0 z-[1100] border-b border-border/50 bg-primary/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <img src="/logo.png" alt="AutoAssist" className="h-22 w-auto" />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {logged ? (
            <>
              {navLink('/dashboard', 'Dashboard', <LayoutDashboard className="h-4 w-4" />)}
              {navLink('/chat', 'Chat', <Bot className="h-4 w-4" />)}
              {navLink('/planos', 'Planos', null)}

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setMoreOpen(!moreOpen)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                    moreOpen
                      ? 'bg-accent/10 text-accent'
                      : 'text-secondary hover:bg-white/5 hover:text-primary'
                  }`}
                >
                  Mais
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
                </button>

                {moreOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-zinc-700 py-1.5 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150 z-[1200]" style={{ backgroundColor: "#18181b" }}>
                    <div className="px-1.5">
                      {navLink('/anotacoes', 'Anotações', <StickyNote className="h-4 w-4" />)}
                      {navLink('/maps', 'Mapa', <Map className="h-4 w-4" />)}
                      {navLink('/biblioteca', 'Biblioteca', <BookOpen className="h-4 w-4" />)}
                      {navLink('/eventos', 'Eventos', <Calendar className="h-4 w-4" />)}
                    </div>

                    <div className="mx-3 my-1.5 h-px bg-border/40" />

                    <div className="px-1.5">
                      <button
                        onClick={() => { setMoreOpen(false); logout(); }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-secondary transition-all duration-150 hover:bg-danger/10 hover:text-danger"
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
                className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent transition-all duration-150 hover:bg-accent/30"
              >
                {userName.charAt(0).toUpperCase()}
              </Link>
            </>
          ) : (
            <>
              {navLink('/chat', 'Chat', <Bot className="h-4 w-4" />)}
              {navLink('/planos', 'Planos', null)}
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-secondary transition-all duration-150 hover:bg-white/5 hover:text-primary"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-accent-hover"
              >
                Criar Conta
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="text-secondary md:hidden"
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border/50 bg-primary/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            {logged ? (
              <>
                {navLink('/dashboard', 'Dashboard', <LayoutDashboard className="h-4 w-4" />)}
                {navLink('/chat', 'Chat', <Bot className="h-4 w-4" />)}
                {navLink('/planos', 'Planos', null)}
                {navLink('/anotacoes', 'Anotações', <StickyNote className="h-4 w-4" />)}
                {navLink('/maps', 'Mapa', <Map className="h-4 w-4" />)}
                {navLink('/biblioteca', 'Biblioteca', <BookOpen className="h-4 w-4" />)}
                {navLink('/eventos', 'Eventos', <Calendar className="h-4 w-4" />)}
                {navLink('/perfil', 'Perfil', <User className="h-4 w-4" />)}
                <div className="my-2 h-px bg-border/40" />
                <button
                  onClick={() => { setOpen(false); logout(); }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-secondary transition-all duration-150 hover:bg-danger/10 hover:text-danger"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </>
            ) : (
              <>
                {navLink('/chat', 'Chat', <Bot className="h-4 w-4" />)}
                {navLink('/planos', 'Planos', null)}
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-secondary transition-all duration-150 hover:bg-white/5 hover:text-primary"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-lg bg-accent px-3 py-2.5 text-center text-sm font-medium text-white transition-all duration-150 hover:bg-accent-hover"
                >
                  Criar Conta
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
