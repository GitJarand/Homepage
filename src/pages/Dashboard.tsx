import { Card } from '@/components/ui/card'

const CARDS = [
  { id: 1, title: 'Card 1' },
  { id: 2, title: 'Card 2' },
  { id: 3, title: 'Card 3' },
  { id: 4, title: 'Card 4' },
  { id: 5, title: 'Card 5' },
  { id: 6, title: 'Card 6' },
  { id: 7, title: 'Card 7' },
  { id: 8, title: 'Card 8' },
]

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] p-8">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
        Homepage
      </h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => (
          <Card key={card.id} title={card.title} className="min-h-40">
            <p className="text-sm text-[var(--color-muted-foreground)]">Empty</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
