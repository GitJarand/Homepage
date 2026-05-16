import { useState } from 'react'

const EXPANDED_COLORS = [
  '#fef08a', '#86efac', '#93c5fd', '#f9a8d4', '#c4b5fd', '#fdba74',
]
const EXPANDED_BANDS = [
  '#ca8a04', '#16a34a', '#2563eb', '#db2777', '#7c3aed', '#ea580c',
]

interface Note {
  header: string
  body: string
}

function loadNotes(): Note[] {
  try {
    const stored = localStorage.getItem('homepage:notes')
    if (stored) {
      const parsed = JSON.parse(stored) as Note[]
      if (Array.isArray(parsed) && parsed.length === 6) return parsed
    }
  } catch {}
  return Array(6).fill(null).map(() => ({ header: '', body: '' }))
}

function saveNotes(notes: Note[]) {
  localStorage.setItem('homepage:notes', JSON.stringify(notes))
}

function notefontSize(text: string): number {
  const n = text.length
  if (n <=  5) return 16
  if (n <= 10) return 13
  if (n <= 18) return 11
  if (n <= 30) return  9
  return 7.5
}

export function Notes() {
  const [notes, setNotes] = useState<Note[]>(loadNotes)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  function updateNote(idx: number, patch: Partial<Note>) {
    setNotes(prev => {
      const next = prev.map((n, i) => i === idx ? { ...n, ...patch } : n)
      saveNotes(next)
      return next
    })
  }

  const active = activeIdx !== null ? notes[activeIdx] : null

  return (
    <div className="relative flex h-full flex-col px-4 pb-4 pt-3">

      {/* Header */}
      <div className="relative mb-3 flex shrink-0 flex-col items-center pb-3">
        <span className="text-2xl leading-none">📝</span>
      </div>

      {/* 3×2 post-it grid */}
      <div className="grid flex-1 grid-cols-3 grid-rows-2 gap-2">
        {notes.map((note, i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            className="relative overflow-hidden rounded text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:opacity-90 active:scale-95"
            style={{ backgroundColor: 'rgba(254, 240, 138, 0.38)' }}
          >
            {/* Header fills the whole note */}
            <div className="absolute inset-0 overflow-hidden p-1.5 pb-4 pr-3">
              {note.header
                ? <span
                    className="block break-words font-semibold leading-tight text-gray-800"
                    style={{ fontSize: `${notefontSize(note.header)}px` }}
                  >{note.header}</span>
                : <span className="text-[8px] text-gray-500/30">—</span>
              }
            </div>

            {/* Folded corner */}
            <div className="absolute bottom-0 right-0 h-5 w-5" style={{
              background: 'linear-gradient(315deg, rgba(0,0,0,0.14) 50%, transparent 50%)'
            }} />
            <div className="absolute bottom-0 right-0 h-4 w-4" style={{
              background: 'linear-gradient(315deg, rgba(255,255,255,0.55) 50%, transparent 50%)'
            }} />
          </button>
        ))}
      </div>

      {/* Expanded editor */}
      {activeIdx !== null && active !== null && (
        <div
          className="absolute inset-1.5 flex flex-col overflow-hidden rounded-lg shadow-2xl"
          style={{ backgroundColor: EXPANDED_COLORS[activeIdx] }}
        >
          {/* Sticky band */}
          <div className="h-3 w-full shrink-0 opacity-50" style={{ backgroundColor: EXPANDED_BANDS[activeIdx] }} />

          {/* Title + close */}
          <div className="flex items-center gap-1 px-3 pt-2 pb-1">
            <input
              autoFocus
              placeholder="Title"
              value={active.header}
              onChange={e => updateNote(activeIdx, { header: e.target.value })}
              className="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-gray-800 placeholder-gray-500/50 outline-none"
            />
            <button
              onClick={() => setActiveIdx(null)}
              className="shrink-0 rounded p-0.5 text-gray-500 hover:text-gray-900"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="mx-3 h-px bg-black/10" />

          <textarea
            placeholder="Write something..."
            value={active.body}
            onChange={e => updateNote(activeIdx, { body: e.target.value })}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-[12px] leading-relaxed text-gray-700 placeholder-gray-500/40 outline-none"
          />

          {/* Folded corner */}
          <div className="absolute bottom-0 right-0 h-8 w-8" style={{
            background: 'linear-gradient(315deg, rgba(0,0,0,0.15) 50%, transparent 50%)'
          }} />
          <div className="absolute bottom-0 right-0 h-6 w-6" style={{
            background: 'linear-gradient(315deg, rgba(255,255,255,0.55) 50%, transparent 50%)'
          }} />
        </div>
      )}
    </div>
  )
}
