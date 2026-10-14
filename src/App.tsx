import { useEffect } from 'react'
import { BottomDock } from './components/BottomDock'
import { useHashRoute } from './lib/router'
import { HomePage } from './pages/HomePage'
import { MePage } from './pages/MePage'
import { NotesPage } from './pages/NotesPage'
import { ReaderPage } from './pages/ReaderPage'
import { ShelfPage } from './pages/ShelfPage'

function App() {
  const route = useHashRoute()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])
  if (route.name === 'reader') {
    return <ReaderPage key={`${route.bookId}:${route.noteId ?? ''}`} bookId={route.bookId} noteId={route.noteId} />
  }
  const page = route.name === 'shelf' ? <ShelfPage /> : route.name === 'notes' ? <NotesPage /> : route.name === 'me' ? <MePage /> : <HomePage />
  return (
    <div className="app-shell">
      {page}
      <BottomDock active={route.name} />
    </div>
  )
}

export default App
