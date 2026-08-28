import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  buildOfficeDirectoryRows,
  filterAdminUsers,
  filterOfficeDirectory,
  getAdminIdentityPresentation,
  getAdminUserDisplayName,
  getAdminUserLastLoginLabel,
  getAdminUserOfficeLabel,
  getAdminUserSecondaryEmail,
  summarizeOfficeDirectory,
  summarizeUserDirectory,
} from '../src/utils/adminUsersOffices.js'

const apiAdminSetupPagePath = path.resolve('src/pages/admin/ApiAdminSetupPage.jsx')

const offices = [
  { id: 'office-legal', name: 'Legal Directorate', code: 'LEG', status: 'Active' },
  { id: 'office-finance', name: 'Finance Directorate', code: 'FIN', status: 'Active' },
]

const users = [
  {
    id: 'user-1',
    fullName: 'Ama Mensah',
    email: 'ama.mensah@legal.mrh.gov.gh',
    role: 'OFFICE_USER',
    office: offices[0],
    accountStatus: 'Active',
    lastLogin: '2026-08-22T10:00:00.000Z',
  },
  {
    id: 'user-2',
    fullName: 'Kwesi Boateng',
    email: 'kwesi.boateng@legal.mrh.gov.gh',
    role: 'SUPERVISOR',
    office: offices[0],
    accountStatus: 'Active',
    lastLogin: '2026-08-22T11:00:00.000Z',
  },
  {
    id: 'user-3',
    fullName: 'Esi Owusu',
    email: 'esi.owusu@mrh.gov.gh',
    role: 'ADMIN',
    office: null,
    accountStatus: 'Inactive',
    lastLogin: 'Not yet signed in',
  },
]

test('admin directory helpers summarize and filter real users without prototype values', () => {
  const summary = summarizeUserDirectory(users)

  assert.deepEqual(summary, {
    totalUsers: 3,
    activeUsers: 2,
    administrators: 1,
    officesRepresented: 1,
  })

  assert.equal(filterAdminUsers(users, { query: 'ama', role: '', officeId: '', status: '' }).length, 1)
  assert.equal(filterAdminUsers(users, { query: '', role: 'ADMIN', officeId: '', status: '' }).length, 1)
  assert.equal(filterAdminUsers(users, { query: '', role: '', officeId: 'office-legal', status: '' }).length, 2)
  assert.equal(filterAdminUsers(users, { query: '', role: '', officeId: '', status: 'Inactive' }).length, 1)
})

test('admin office helpers build directory rows from real offices, user counts, and admin summary breakdown', () => {
  const officeRows = buildOfficeDirectoryRows(offices, users, [
    {
      office_id: 'office-legal',
      office_name: 'Legal Directorate',
      office_code: 'LEG',
      active_count: 7,
      overdue_count: 2,
      user_count: 2,
    },
  ])
  const summary = summarizeOfficeDirectory(officeRows)

  assert.equal(officeRows[0].officeName, 'Finance Directorate')
  assert.equal(officeRows[1].officeName, 'Legal Directorate')
  assert.equal(officeRows[1].assignedUsers, 2)
  assert.equal(officeRows[1].activeCorrespondence, 7)
  assert.equal(summary.totalOffices, 2)
  assert.equal(summary.activeOffices, 2)
  assert.equal(summary.assignedUsers, 2)
  assert.equal(summary.activeCorrespondence, 7)

  const filtered = filterOfficeDirectory(officeRows, {
    query: 'legal',
    status: 'Active',
  })
  assert.equal(filtered.length, 1)
  assert.equal(filtered[0].officeCode, 'LEG')
})

test('admin identity helper treats null-office administrators as administrator access instead of missing data', () => {
  assert.deepEqual(
    getAdminIdentityPresentation({
      fullName: 'Esi Owusu',
      role: 'ADMIN',
      office: null,
    }),
    {
      secondaryLine: 'System Administrator',
      tertiaryLine: 'Administrator Access',
    },
  )
})

test('admin user presentation formats last login and uses safe admin fallbacks', () => {
  assert.equal(
    getAdminUserLastLoginLabel({
      lastLogin: '2026-08-21T19:26:22.922982Z',
    }),
    '21 Aug 2026, 19:26',
  )
  assert.equal(getAdminUserLastLoginLabel({ lastLogin: null }), 'Not yet signed in')
  assert.equal(
    getAdminUserOfficeLabel({
      role: 'ADMIN',
      office: null,
    }),
    'System-wide',
  )
  assert.equal(
    getAdminUserDisplayName({
      role: 'ADMIN',
      fullName: '',
      firstName: '',
      middleName: '',
      lastName: '',
      email: 'admin@mrh.gov.gh',
    }),
    'System Administrator',
  )
  assert.equal(
    getAdminUserSecondaryEmail({
      role: 'ADMIN',
      fullName: '',
      firstName: '',
      middleName: '',
      lastName: '',
      email: 'admin@mrh.gov.gh',
    }),
    'admin@mrh.gov.gh',
  )
  assert.equal(
    getAdminUserSecondaryEmail({
      role: 'OFFICE_USER',
      fullName: 'Ama Mensah',
      email: 'ama.mensah@legal.mrh.gov.gh',
    }),
    'ama.mensah@legal.mrh.gov.gh',
  )
})

test('restored users and offices page removes developer-only controls and restores approved management UI labels', () => {
  const source = readFileSync(apiAdminSetupPagePath, 'utf8')

  assert.ok(source.includes('Users & Offices'))
  assert.ok(source.includes('System Users'))
  assert.ok(source.includes('Office Directory'))
  assert.ok(source.includes('Add User'))
  assert.ok(source.includes('Add Office'))
  assert.ok(source.includes('Regenerate Password'))
  assert.equal(source.includes('Backend User ID'), false)
  assert.equal(source.includes('Offices created in this session'), false)
  assert.equal(source.includes('Available Administration Actions'), false)
  assert.equal(source.includes('created in this session'), false)
  assert.equal(source.includes('System administration is limited to authorised user, office and access management actions.'), false)
  assert.equal(source.includes('User directory for system administration.'), false)
  assert.equal(source.includes('Office records currently available to the system.'), false)
  assert.equal(source.includes('Active user accounts'), false)
  assert.equal(source.includes('label="Active Correspondence"'), false)
  assert.equal(source.includes('<th>Active Correspondence</th>'), false)
  assert.equal(source.includes('<th>Action</th>'), false)
  assert.ok(source.includes('label="Total Offices"'))
  assert.ok(source.includes('label="Active Offices"'))
  assert.ok(source.includes('label="Assigned Users"'))
  assert.ok(source.includes('<th>Office</th>'))
  assert.ok(source.includes('<th>Code</th>'))
  assert.ok(source.includes('<th>Users</th>'))
  assert.ok(source.includes('<th>Status</th>'))
})
