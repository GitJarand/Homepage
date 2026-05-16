import { WidgetWrapper } from './WidgetWrapper'

interface PlaceholderProps {
  title: string
}

export function Placeholder({ title }: PlaceholderProps) {
  return (
    <WidgetWrapper title={title} logo="🚧" status="idle">
      <span />
    </WidgetWrapper>
  )
}
