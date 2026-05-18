import type { WidgetDefinition } from './types'

export type OrderedWidget = WidgetDefinition
import { PersonalCalendar } from './PersonalCalendar'
import { Notes } from './Notes'
import { Packages } from './Packages'
import { YouTube } from './YouTube'
import { News } from './News'
import { Clock } from './Clock'
import { Trakt } from './Trakt'
import { Football } from './Football'
import { Shopping } from './Shopping'
import { Electricity } from './Electricity'
import { FPL } from './FPL'
import { WorldCup } from './WorldCup'

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
    id: 'shopping',
    title: 'Shopping',
    description: 'Bring shopping list',
    component: Shopping,
    color: 'rgba(255, 149, 0, 0.10)',        colorDark: 'rgba(255, 149, 0, 0.18)',
  },
  {
    id: 'notes',
    title: 'Notes',
    description: 'Recent notes',
    component: Notes,
    color: 'rgba(255, 204, 0, 0.14)',        colorDark: 'rgba(255, 204, 0, 0.18)',
  },
  {
    id: 'packages',
    title: 'Packages',
    description: 'Package tracking',
    component: Packages,
    color: 'rgba(255, 59, 48, 0.12)',        colorDark: 'rgba(255, 59, 48, 0.20)',
  },
  {
    id: 'clock',
    title: 'Clock',
    description: 'Current time and date',
    component: Clock,
    color: 'rgba(0, 0, 0, 0)',               colorDark: 'rgba(0, 0, 0, 0)',
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
    component: () => <News fetchLimit={60} />,
    rowSpan: 3,
    color: 'rgba(255, 59, 48, 0.08)',        colorDark: 'rgba(255, 59, 48, 0.14)',
  },
  {
    id: 'news-nrk',
    title: 'NRK',
    description: 'Latest news from NRK',
    component: () => <News source="nrk" label="NRK" fetchLimit={60} />,
    rowSpan: 3,
    color: 'rgba(0, 122, 255, 0.08)',        colorDark: 'rgba(0, 122, 255, 0.14)',
  },
  {
    id: 'rss-feed-1',
    title: 'FPL / LFC / Soccer',
    description: 'Reddit: FantasyPL + LiverpoolFC + soccer',
    component: () => <News source="reddit-fpl-lfc" label="FPL / LFC / Soccer" fetchLimit={60} defaultHidden={['r/Gunners', 'r/MCFC', 'r/chelseafc', 'r/PremierLeague', 'r/reddevils', 'r/coys', 'r/soccer']} allSources={['r/FantasyPL', 'r/LiverpoolFC', 'r/soccer', 'r/Gunners', 'r/MCFC', 'r/chelseafc', 'r/PremierLeague', 'r/reddevils', 'r/coys']} />,
    rowSpan: 3,
    color: 'rgba(52, 199, 89, 0.08)',        colorDark: 'rgba(52, 199, 89, 0.14)',
  },
  {
    id: 'rss-feed-2',
    title: 'Tech & Gaming',
    description: 'Aggregated tech and gaming news',
    component: () => <News source="tech-gaming" label="Tech & Gaming" fetchLimit={60} />,
    rowSpan: 3,
    color: 'rgba(175, 82, 222, 0.08)',       colorDark: 'rgba(175, 82, 222, 0.14)',
  },

  // ── Backfill below YouTube (dense placement) ──────────────────────────────
  {
    id: 'trakt',
    title: 'Trakt',
    description: 'Latest releases watchlist',
    component: Trakt,
    color: 'rgba(237, 28, 36, 0.09)',        colorDark: 'rgba(237, 28, 36, 0.18)',
  },
  {
    id: 'electricity',
    title: 'Electricity',
    description: 'Spot price today',
    component: Electricity,
    color: 'rgba(255, 214, 10, 0.10)',     colorDark: 'rgba(255, 214, 10, 0.16)',
  },
  {
    id: 'football',
    title: 'Football',
    description: 'Upcoming Premier League, Champions League and Liverpool matches',
    component: Football,
    color: 'rgba(200, 16, 46, 0.08)',        colorDark: 'rgba(200, 16, 46, 0.16)',
  },
  {
    id: 'fpl',
    title: 'FPL',
    description: 'Fantasy Premier League — team, GW points and league standings',
    component: FPL,
    color: 'rgba(55, 0, 60, 0.07)',          colorDark: 'rgba(0, 255, 135, 0.07)',
  },
  {
    id: 'world-cup',
    title: 'World Cup 2026',
    description: 'FIFA World Cup 2026 — matches, groups and Norway',
    component: WorldCup,
    color: 'rgba(0, 122, 255, 0.08)',        colorDark: 'rgba(0, 122, 255, 0.15)',
  },
]
