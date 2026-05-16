import { useState, useEffect } from 'react'
import { WidgetWrapper } from './WidgetWrapper'
import type { WidgetDataState } from './types'

interface Note {
  id: string
  title: string
  preview: string
  updatedAt: string
}

function useNotesData(): WidgetDataState<Note[]> {
  const [state, _setState] = useState<WidgetDataState<Note[]>>({
    data: null,
    status: 'idle',
    error: null,
  })

  useEffect(() => {
    // TODO: connect to Notion / Obsidian / etc.
    // setState({ data: null, status: 'loading', error: null })
  }, [])

  return state
}

export function Notes() {
  const { data, status, error } = useNotesData()

  return (
    <WidgetWrapper title="Notes" logo="📝" status={status} error={error}>
      {data?.map((note) => (
        <div key={note.id}>{note.title}</div>
      ))}
    </WidgetWrapper>
  )
}
