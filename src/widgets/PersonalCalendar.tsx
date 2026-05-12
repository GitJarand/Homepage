import { useState, useEffect } from 'react'
import { WidgetWrapper } from './WidgetWrapper'
import type { WidgetDataState } from './types'

interface CalendarEvent {
  id: string
  title: string
  date: string
}

function usePersonalCalendarData(): WidgetDataState<CalendarEvent[]> {
  const [state, _setState] = useState<WidgetDataState<CalendarEvent[]>>({
    data: null,
    status: 'idle',
    error: null,
  })

  useEffect(() => {
    // TODO: connect to Google Calendar / CalDAV / etc.
    // setState({ data: null, status: 'loading', error: null })
  }, [])

  return state
}

export function PersonalCalendar() {
  const { data, status, error } = usePersonalCalendarData()

  return (
    <WidgetWrapper title="Personal Calendar" status={status} error={error}>
      {data?.map((event) => (
        <div key={event.id}>{event.title}</div>
      ))}
    </WidgetWrapper>
  )
}
