import { useState, useEffect } from 'react'
import { WidgetWrapper } from './WidgetWrapper'
import type { WidgetDataState } from './types'

interface WorkEvent {
  id: string
  title: string
  start: string
  end: string
  attendees?: string[]
}

function useWorkCalendarData(): WidgetDataState<WorkEvent[]> {
  const [state, _setState] = useState<WidgetDataState<WorkEvent[]>>({
    data: null,
    status: 'idle',
    error: null,
  })

  useEffect(() => {
    // TODO: connect to Outlook / Google Workspace / etc.
    // setState({ data: null, status: 'loading', error: null })
  }, [])

  return state
}

export function WorkCalendar() {
  const { data, status, error } = useWorkCalendarData()

  return (
    <WidgetWrapper title="Work Calendar" logo="💼" status={status} error={error}>
      {data?.map((event) => (
        <div key={event.id}>{event.title}</div>
      ))}
    </WidgetWrapper>
  )
}
