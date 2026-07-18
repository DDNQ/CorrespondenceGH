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
  Lock,
  Settings,
  Shield,
  UsersRound,
} from 'lucide-react'

import { ROLES } from '../constants/roles'

export const correspondenceStatusLinks = [
  { label: 'All', to: '/correspondence?status=all', status: 'all', icon: Files },
  { label: 'Registered', to: '/correspondence?status=registered', status: 'registered', icon: FileInput },
  { label: 'Received', to: '/correspondence?status=received', status: 'received', icon: Bell },
  { label: 'In Progress', to: '/correspondence?status=in-progress', status: 'in-progress', icon: FileClock },
  { label: 'Awaiting Action', to: '/correspondence?status=awaiting-action', status: 'awaiting-action', icon: FileSearch },
  { label: 'Forwarded', to: '/correspondence?status=forwarded', status: 'forwarded', icon: FileUp },
  { label: 'Completed', to: '/correspondence?status=completed', status: 'completed', icon: FolderCheck },
  { label: 'Filed', to: '/correspondence?status=filed', status: 'filed', icon: FileStack },
  { label: 'Overdue', to: '/correspondence?status=overdue', status: 'overdue', icon: Bell },
]

export const navigationByRole = {
  [ROLES.OFFICE_USER]: {
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
  [ROLES.OFFICE_SUPERVISOR]: {
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
  [ROLES.SYSTEM_ADMIN]: {
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
          { label: 'Audit Log', to: '/admin/audit-log', icon: Lock },
        ],
      },
    ],
    footer: [],
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

const statusLabels = new Map(
  correspondenceStatusLinks.map((link) => [link.status, `Correspondence / ${link.label}`]),
)

export function getPageLabel(pathname, searchParams) {
  if (pathname.startsWith('/correspondence/') && pathname !== '/correspondence/new') {
    return 'Correspondence / Details'
  }

  if (pathname === '/correspondence') {
    const status = searchParams.get('status')
    return statusLabels.get(status) ?? pageTitles.get(pathname) ?? 'Correspondence'
  }

  return pageTitles.get(pathname) ?? 'Correspondence Management System'
}
