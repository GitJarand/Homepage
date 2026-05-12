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
}
