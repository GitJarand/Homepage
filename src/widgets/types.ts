export type WidgetStatus = 'idle' | 'loading' | 'error' | 'success'

export interface WidgetDataState<T> {
  data: T | null
  status: WidgetStatus
  error: string | null
}

export interface WidgetDefinition {
  id: string
  title: string
  description: string
  component: React.ComponentType
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6
  rowSpan?: 1 | 2 | 3
  color?: string
  colorDark?: string
}
