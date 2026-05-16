import { useState, useEffect } from 'react'
import { WidgetWrapper } from './WidgetWrapper'
import type { WidgetDataState } from './types'

interface VisualData {
  url: string
  alt: string
  caption?: string
}

function useVisualData(): WidgetDataState<VisualData> {
  const [state, _setState] = useState<WidgetDataState<VisualData>>({
    data: null,
    status: 'idle',
    error: null,
  })

  useEffect(() => {
    // TODO: connect to desired visual data source
    // setState({ data: null, status: 'loading', error: null })
  }, [])

  return state
}

export function Visual() {
  const { data, status, error } = useVisualData()

  return (
    <WidgetWrapper title="Visual" logo="🎨" status={status} error={error}>
      {data && (
        <img src={data.url} alt={data.alt} className="w-full rounded object-cover" />
      )}
    </WidgetWrapper>
  )
}
