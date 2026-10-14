import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { listAllAnnotations, listBooks } from '../lib/db'
import { routes } from '../lib/router'
import type { Route } from '../lib/router'
import { useNarrow } from '../lib/useNarrow'
import type { Annotation, Book } from '../lib/types'
import './BottomDock.css'

type Active = Route['name']

export function BottomDock({ active }: { active: Active }) {
  const phone = useNarrow(767)
  const native = Capacitor.getPlatform() === 'ios'
  if (!phone && !native) return null
  return <Dock active={active} />
}

function Dock({ active }: { active: Active }) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [books, setBooks] = useState<Book[]>([])
  const [notes, setNotes] = useState<Annotation[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!searchOpen) return
    void Promise.all([listBooks(), listAllAnnotations()]).then(([nextBooks, nextNotes]) => {
      setBooks(nextBooks)
      setNotes(nextNotes)
    })
    inputRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    if (!menuOpen && !searchOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setSearchOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen, searchOpen])

  const needle = query.trim().toLowerCase()
  const bookHits = useMemo(() => {
    if (!needle) return []
    return books
      .filter((book) => [book.title, book.author, book.fileName].join('\n').toLowerCase().includes(needle))
      .slice(0, 8)
  }, [books, needle])
  const noteHits = useMemo(() => {
    if (!needle) return []
    const titles = new Map(books.map((book) => [book.id, book.title]))
    return notes
      .filter((note) => [note.text, note.comment ?? '', titles.get(note.bookId) ?? ''].join('\n').toLowerCase().includes(needle))
      .slice(0, 8)
  }, [books, needle, notes])

  function closeAll() {
    setMenuOpen(false)
    setSearchOpen(false)
  }

  const items: { name: Active; href: string; label: string }[] = [
    { name: 'home', href: routes.home, label: t('nav.home') },
    { name: 'notes', href: routes.notes, label: t('nav.notes') },
    { name: 'shelf', href: routes.shelf, label: t('nav.shelf') },
    { name: 'me', href: routes.me, label: t('nav.me') },
  ]

  return (
    <>
      {(menuOpen || searchOpen) && <button type="button" className="dock-backdrop" aria-label={t('dock.close')} onClick={closeAll} />}
      {searchOpen && (
        <div className="dock-results" role="listbox" aria-label={t('dock.search')}>
          {!needle && <p className="dock-hint">{t('dock.searchHint')}</p>}
          {needle && bookHits.length === 0 && noteHits.length === 0 && <p className="dock-hint">{t('dock.searchEmpty')}</p>}
          {bookHits.length > 0 && (
            <section>
              <p className="dock-kicker">{t('dock.books')}</p>
              <ul>
                {bookHits.map((book) => (
                  <li key={book.id}>
                    <a href={routes.reader(book.id)} onClick={closeAll}>
                      <strong>{book.title || book.fileName}</strong>
                      {book.author && <span>{book.author}</span>}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {noteHits.length > 0 && (
            <section>
              <p className="dock-kicker">{t('dock.notes')}</p>
              <ul>
                {noteHits.map((note) => (
                  <li key={note.id}>
                    <a href={routes.reader(note.bookId, note.id)} onClick={closeAll}>
                      <strong>{note.comment || note.text}</strong>
                      <span>{books.find((book) => book.id === note.bookId)?.title || note.text}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
      <div className="bottom-dock" ref={rootRef}>
        <form
          className={`dock-search${searchOpen ? ' open' : ''}`}
          onSubmit={(event) => {
            event.preventDefault()
            setSearchOpen(true)
          }}
        >
          <SearchIcon />
          <input
            ref={inputRef}
            type="search"
            value={query}
            placeholder={t('dock.search')}
            aria-label={t('dock.search')}
            onFocus={() => {
              setMenuOpen(false)
              setSearchOpen(true)
            }}
            onChange={(event) => {
              setQuery(event.target.value)
              setSearchOpen(true)
            }}
          />
        </form>
        <div className="dock-menu">
          {menuOpen && (
            <nav className="dock-popover" aria-label={t('dock.menu')}>
              {items.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={active === item.name ? 'on' : undefined}
                  aria-current={active === item.name ? 'page' : undefined}
                  onClick={closeAll}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          )}
          <button
            type="button"
            className={`dock-trigger${menuOpen ? ' open' : ''}`}
            aria-label={menuOpen ? t('dock.close') : t('dock.menu')}
            aria-expanded={menuOpen}
            onClick={() => {
              setSearchOpen(false)
              setMenuOpen((value) => !value)
            }}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>
    </>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M16 16.5 20.5 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7.5h14M5 12h14M5 16.5h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
