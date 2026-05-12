import type { WidgetDefinition } from './types'
import { PersonalCalendar } from './PersonalCalendar'
import { WorkCalendar } from './WorkCalendar'
import { Notes } from './Notes'
import { Visual } from './Visual'
import { Placeholder } from './Placeholder'

export const widgets: WidgetDefinition[] = [
  {
    id: 'personal-calendar',
    title: 'Personal Calendar',
    description: 'Upcoming personal events',
    component: PersonalCalendar,
  },
  {
    id: 'work-calendar',
    title: 'Work Calendar',
    description: 'Upcoming work meetings and events',
    component: WorkCalendar,
  },
  {
    id: 'notes',
    title: 'Notes',
    description: 'Recent notes',
    component: Notes,
  },
  {
    id: 'visual',
    title: 'Visual',
    description: 'Visual information feed',
    component: Visual,
  },
  {
    id: 'placeholder-5',
    title: 'Slot 5',
    description: 'Available',
    component: () => <Placeholder title="Slot 5" />,
  },
  {
    id: 'placeholder-6',
    title: 'Slot 6',
    description: 'Available',
    component: () => <Placeholder title="Slot 6" />,
  },
  {
    id: 'placeholder-7',
    title: 'Slot 7',
    description: 'Available',
    component: () => <Placeholder title="Slot 7" />,
  },
  {
    id: 'placeholder-8',
    title: 'Slot 8',
    description: 'Available',
    component: () => <Placeholder title="Slot 8" />,
  },
]
