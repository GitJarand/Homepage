import type { WidgetDefinition } from './types'

export type OrderedWidget = WidgetDefinition
import { PersonalCalendar } from './PersonalCalendar'
import { WorkCalendar } from './WorkCalendar'
import { Notes } from './Notes'
import { Visual } from './Visual'
import { Packages } from './Packages'
import { YouTube } from './YouTube'
import { Placeholder } from './Placeholder'
import { News } from './News'

export const widgets: WidgetDefinition[] = [
  // ── Row 1: 6 small cards ──────────────────────────────────────────────────
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
    id: 'placeholder-6',
    title: 'Slot 6',
    description: 'Available',
    component: () => <Placeholder title="Slot 6" />,
    color: 'rgba(255, 149, 0, 0.10)',        colorDark: 'rgba(255, 149, 0, 0.18)',
  },

  // ── Row 2+: tall section ──────────────────────────────────────────────────
  {
    id: 'youtube',
    title: 'YouTube',
    description: 'Latest videos from your channels',
    component: YouTube,
    colSpan: 2,
    rowSpan: 3,
    color: 'rgba(255, 59, 48, 0.08)',        colorDark: 'rgba(255, 59, 48, 0.16)',
  },
  {
    id: 'news-vg',
    title: 'VG',
    description: 'Latest news from VG',
    component: News,
    rowSpan: 3,
    color: 'rgba(255, 59, 48, 0.08)',        colorDark: 'rgba(255, 59, 48, 0.14)',
  },
  {
    id: 'news-nrk',
    title: 'NRK',
    description: 'Latest news from NRK',
    component: () => <News source="nrk" label="NRK" />,
    rowSpan: 3,
    color: 'rgba(0, 122, 255, 0.08)',        colorDark: 'rgba(0, 122, 255, 0.14)',
  },
  {
    id: 'rss-feed-1',
    title: 'RSS Feed 1',
    description: 'RSS feed — coming soon',
    component: () => <Placeholder title="RSS Feed 1" />,
    rowSpan: 3,
    color: 'rgba(52, 199, 89, 0.08)',        colorDark: 'rgba(52, 199, 89, 0.14)',
  },
  {
    id: 'rss-feed-2',
    title: 'RSS Feed 2',
    description: 'RSS feed — coming soon',
    component: () => <Placeholder title="RSS Feed 2" />,
    rowSpan: 3,
    color: 'rgba(175, 82, 222, 0.08)',       colorDark: 'rgba(175, 82, 222, 0.14)',
  },

  // ── Backfill below YouTube (dense placement) ──────────────────────────────
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
