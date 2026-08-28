import {
  Bell,
  ClipboardList,
  FileClock,
  FileInput,
  FilePlus2,
  FileSearch,
  FileStack,
  FileUp,
  Files,
  FolderCheck,
  Gauge,
  Settings,
  Shield,
  UsersRound,
} from 'lucide-react'

import { USER_ROLES } from '../constants/roles'
import {
  buildSearchParamsForSidebarFilter,
  getCorrespondenceSidebarFilters,
  resolveCorrespondenceListView,
} from './correspondenceListView.js'

const correspondenceStatusIcons = Object.freeze({
  all: Files,
  registered: FileInput,
  received: Bell,
  'in-progress': FileClock,
  'awaiting-action': FileSearch,
  forwarded: FileUp,
  completed: FolderCheck,
  filed: FileStack,
  overdue: Bell,
})

export const correspondenceStatusLinks = getCorrespondenceSidebarFilters().map((filter) => ({
  label: filter.label,
  to: `/correspondence?${buildSearchParamsForSidebarFilter(filter.id).toString()}`,
  status: filter.statusParam,
  scope: filter.scope,
  icon: correspondenceStatusIcons[filter.id],
}))

export const navigationByRole = {
  [USER_ROLES.OFFICE_USER]: {
    primary: [{ label: 'Dashboard', to: '/dashboard', icon: Gauge }],
    sections: [
      {
        title: 'Correspondence',
        items: [
          { label: 'All Correspondence', to: '/correspondence', icon: ClipboardList, children: correspondenceStatusLinks },
        ],
      },
      {
        title: 'Actions',
        items: [{ label: 'Register New', to: '/correspondence/new', icon: FilePlus2 }],
      },
    ],
    footer: [{ label: 'Settings', to: '/settings', icon: Settings }],
  },
  [USER_ROLES.SUPERVISOR]: {
    primary: [{ label: 'Dashboard', to: '/dashboard', icon: Gauge }],
    sections: [
      {
        title: 'Correspondence',
        items: [
          { label: 'All Correspondence', to: '/correspondence', icon: ClipboardList, children: correspondenceStatusLinks },
        ],
      },
      {
        title: 'Actions',
        items: [{ label: 'Register New', to: '/correspondence/new', icon: FilePlus2 }],
      },
      {
        title: 'Reports',
        items: [{ label: 'Office Reports', to: '/reports', icon: Shield }],
      },
    ],
    footer: [{ label: 'Settings', to: '/settings', icon: Settings }],
  },
  [USER_ROLES.ADMIN]: {
    primary: [{ label: 'Dashboard', to: '/admin/dashboard', icon: Gauge }],
    sections: [
      {
        title: 'Correspondence Oversight',
        items: [
          { label: 'All Correspondence', to: '/correspondence', icon: ClipboardList, children: correspondenceStatusLinks },
        ],
      },
      {
        title: 'Administration',
        items: [
          { label: 'Users & Offices', to: '/admin/users-offices', icon: UsersRound },
        ],
      },
    ],
    footer: [{ label: 'Settings', to: '/settings', icon: Settings }],
  },
}

const pageTitles = new Map([
  ['/dashboard', 'Dashboard'],
  ['/admin/dashboard', 'Administrator Dashboard'],
  ['/correspondence', 'All Correspondence'],
  ['/correspondence/new', 'Correspondence / Register New'],
  ['/notifications', 'Notifications'],
  ['/settings', 'Settings / Account & Preferences'],
  ['/reports', 'Office Reports'],
  ['/admin/users-offices', 'Users & Offices'],
  ['/admin/audit-log', 'Audit Log'],
])

export function getPageLabel(pathname, searchParams) {
  if (pathname.startsWith('/correspondence/') && pathname !== '/correspondence/new') {
    return 'Correspondence / Details'
  }

  if (pathname === '/correspondence') {
    const viewState = resolveCorrespondenceListView(searchParams)
    return `Correspondence / ${viewState.pageTitle.replace(/ Correspondence$/, '')}`
  }

  return pageTitles.get(pathname) ?? 'Correspondence Management System'
}
