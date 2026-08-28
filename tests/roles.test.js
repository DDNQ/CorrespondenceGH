import test from 'node:test'
import assert from 'node:assert/strict'

import {
  USER_ROLES,
  canAccessOfficeReports,
  canManageUsersAndOffices,
  canPerformOfficeWorkflow,
  canRegisterCorrespondence,
  canViewSystemAudit,
  getUserRoleLabel,
  hasAnyRole,
  normalizeUserRole,
} from '../src/constants/roles.js'
import { getDefaultRouteForRole, normalizeAuthenticatedUser } from '../src/utils/auth.js'
import { getUsers } from '../src/data/users.js'

test('normalizeUserRole aligns canonical and legacy values', () => {
  assert.equal(normalizeUserRole('OFFICE_USER'), USER_ROLES.OFFICE_USER)
  assert.equal(normalizeUserRole('SUPERVISOR'), USER_ROLES.SUPERVISOR)
  assert.equal(normalizeUserRole('ADMIN'), USER_ROLES.ADMIN)
  assert.equal(normalizeUserRole('OFFICE_SUPERVISOR'), USER_ROLES.SUPERVISOR)
  assert.equal(normalizeUserRole('SYSTEM_ADMIN'), USER_ROLES.ADMIN)
  assert.equal(normalizeUserRole('unknown'), null)
  assert.equal(normalizeUserRole(''), null)
})

test('getUserRoleLabel returns approved labels', () => {
  assert.equal(getUserRoleLabel(USER_ROLES.OFFICE_USER), 'Office User')
  assert.equal(getUserRoleLabel(USER_ROLES.SUPERVISOR), 'Office Supervisor')
  assert.equal(getUserRoleLabel(USER_ROLES.ADMIN), 'System Administrator')
})

test('permission helpers enforce approved access rules', () => {
  const officeUser = { role: USER_ROLES.OFFICE_USER }
  const supervisor = { role: USER_ROLES.SUPERVISOR }
  const admin = { role: USER_ROLES.ADMIN }

  assert.equal(canAccessOfficeReports(officeUser), false)
  assert.equal(canAccessOfficeReports(supervisor), true)
  assert.equal(canAccessOfficeReports(admin), false)

  assert.equal(canManageUsersAndOffices(admin), true)
  assert.equal(canManageUsersAndOffices(supervisor), false)
  assert.equal(canViewSystemAudit(admin), true)

  assert.equal(canPerformOfficeWorkflow(officeUser), true)
  assert.equal(canPerformOfficeWorkflow(supervisor), true)
  assert.equal(canPerformOfficeWorkflow(admin), false)

  assert.equal(canRegisterCorrespondence(officeUser), true)
  assert.equal(canRegisterCorrespondence(supervisor), true)
  assert.equal(canRegisterCorrespondence(admin), false)
})

test('route helpers deny unknown roles and direct canonical users correctly', () => {
  assert.equal(getDefaultRouteForRole(USER_ROLES.OFFICE_USER), '/dashboard')
  assert.equal(getDefaultRouteForRole(USER_ROLES.SUPERVISOR), '/dashboard')
  assert.equal(getDefaultRouteForRole(USER_ROLES.ADMIN), '/admin/dashboard')

  assert.equal(
    hasAnyRole({ role: USER_ROLES.OFFICE_USER }, [USER_ROLES.OFFICE_USER, USER_ROLES.SUPERVISOR]),
    true,
  )
  assert.equal(
    hasAnyRole({ role: USER_ROLES.SUPERVISOR }, [USER_ROLES.ADMIN]),
    false,
  )
  assert.equal(
    hasAnyRole({ role: 'UNKNOWN_ROLE' }, [USER_ROLES.OFFICE_USER, USER_ROLES.SUPERVISOR]),
    false,
  )
})

test('authenticated users are normalized to backend-aligned role values', () => {
  const normalizedSupervisor = normalizeAuthenticatedUser({ role: 'OFFICE_SUPERVISOR' })
  const normalizedAdmin = normalizeAuthenticatedUser({ role: 'SYSTEM_ADMIN' })
  const invalidUser = normalizeAuthenticatedUser({ role: 'UNKNOWN_ROLE' })

  assert.equal(normalizedSupervisor?.role, USER_ROLES.SUPERVISOR)
  assert.equal(normalizedAdmin?.role, USER_ROLES.ADMIN)
  assert.equal(invalidUser, null)
})

test('seeded users expose only canonical role values', () => {
  const users = getUsers()

  assert.ok(users.length >= 3)
  assert.ok(users.every((user) => Object.values(USER_ROLES).includes(user.role)))
  assert.deepEqual(
    new Set(users.map((user) => user.role)),
    new Set([USER_ROLES.OFFICE_USER, USER_ROLES.SUPERVISOR, USER_ROLES.ADMIN]),
  )
})
