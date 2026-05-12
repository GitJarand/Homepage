import { WidgetWrapper } from './WidgetWrapper'

interface PlaceholderProps {
  title: string
}

export function Placeholder({ title }: PlaceholderProps) {
  return (
    <WidgetWrapper title={title} status="idle">
      <span />
    </WidgetWrapper>
  )
}
