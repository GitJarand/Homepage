import type { WidgetDefinition } from './types'

export type OrderedWidget = WidgetDefinition
import { PersonalCalendar } from './PersonalCalendar'
import { WorkCalendar } from './WorkCalendar'
import { Notes } from './Notes'
import { Visual } from './Visual'
import { Packages } from './Packages'
import { YouTube } from './YouTube'
import { Placeholder } from './Placeholder'

export const widgets: WidgetDefinition[] = [
  {
    id: 'personal-calendar',
    title: 'Personal Calendar',
    description: 'Upcoming personal events',
    component: PersonalCalendar,
    color: 'rgba(0, 122, 255, 0.13)',       colorDark: 'rgba(0, 122, 255, 0.22)',
  },
  {
    id: 'work-calendar',
    title: 'Work Calendar',
    description: 'Upcoming work meetings and events',
    component: WorkCalendar,
    color: 'rgba(52, 199, 89, 0.13)',        colorDark: 'rgba(52, 199, 89, 0.20)',
  },
  {
    id: 'notes',
    title: 'Notes',
    description: 'Recent notes',
    component: Notes,
    color: 'rgba(255, 204, 0, 0.14)',        colorDark: 'rgba(255, 204, 0, 0.18)',
  },
  {
    id: 'visual',
    title: 'Visual',
    description: 'Visual information feed',
    component: Visual,
    color: 'rgba(175, 82, 222, 0.12)',       colorDark: 'rgba(175, 82, 222, 0.22)',
  },
  {
    id: 'packages',
    title: 'Packages',
    description: 'Package tracking',
    component: Packages,
    color: 'rgba(255, 59, 48, 0.12)',        colorDark: 'rgba(255, 59, 48, 0.20)',
  },
  {
    id: 'youtube',
    title: 'YouTube',
    description: 'Latest videos from your channels',
    component: YouTube,
    color: 'rgba(255, 59, 48, 0.08)',        colorDark: 'rgba(255, 59, 48, 0.16)',
  },
  {
    id: 'placeholder-7',
    title: 'Slot 7',
    description: 'Available',
    component: () => <Placeholder title="Slot 7" />,
    color: 'rgba(52, 199, 89, 0.11)',        colorDark: 'rgba(52, 199, 89, 0.18)',
  },
  {
    id: 'placeholder-8',
    title: 'Slot 8',
    description: 'Available',
    component: () => <Placeholder title="Slot 8" />,
    color: 'rgba(255, 149, 0, 0.12)',        colorDark: 'rgba(255, 149, 0, 0.20)',
  },
]
