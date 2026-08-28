import {
  USER_ROLES,
  USER_ROLE_LABELS,
  normalizeUserRole,
} from '../constants/roles.js'
import { getOfficeById } from './offices.js'

function normalizeMockUser(user) {
  const office =
    getOfficeById(user.office?.id ?? user.officeId ?? null) ??
    user.office ??
    null

  return {
    ...user,
    role: normalizeUserRole(user.role) ?? '',
    office,
    officeId: office?.id ?? null,
    officeName: office?.name ?? '',
    officeCode: office?.code ?? null,
    officeStatus: office?.status ?? null,
  }
}

export const users = [
  {
    id: 'user-legal-office',
    firstName: 'Ama',
    middleName: '',
    lastName: 'Mensah',
    fullName: 'Ama Mensah',
    email: 'ama.mensah@mrh.gov.gh',
    emailGeneratedBySystem: false,
    password: 'Password123',
    role: USER_ROLES.OFFICE_USER,
    office: getOfficeById('office-legal'),
    phoneNumber: '',
    status: 'Active',
    accountStatus: 'Active',
    lastLogin: 'Today, 8:05 AM',
  },
  {
    id: 'supervisor-legal-office',
    firstName: 'Kwesi',
    middleName: '',
    lastName: 'Boateng',
    fullName: 'Kwesi Boateng',
    email: 'kwesi.boateng@mrh.gov.gh',
    emailGeneratedBySystem: false,
    password: 'Password123',
    role: USER_ROLES.SUPERVISOR,
    office: getOfficeById('office-legal'),
    phoneNumber: '',
    status: 'Active',
    accountStatus: 'Active',
    lastLogin: 'Today, 7:48 AM',
  },
  {
    id: 'admin-ict-office',
    firstName: 'Esi',
    middleName: '',
    lastName: 'Owusu',
    fullName: 'Esi Owusu',
    email: 'esi.owusu@mrh.gov.gh',
    emailGeneratedBySystem: false,
    password: 'Password123',
    role: USER_ROLES.ADMIN,
    office: getOfficeById('office-ict'),
    phoneNumber: '',
    status: 'Active',
    accountStatus: 'Active',
    lastLogin: 'Today, 7:32 AM',
  },
  {
    id: 'user-finance-office',
    firstName: 'Grace',
    middleName: '',
    lastName: 'Arthur',
    fullName: 'Grace Arthur',
    email: 'grace.arthur@mrh.gov.gh',
    emailGeneratedBySystem: false,
    password: 'Password123',
    role: USER_ROLES.OFFICE_USER,
    office: getOfficeById('office-finance'),
    phoneNumber: '',
    status: 'Active',
    accountStatus: 'Active',
    lastLogin: 'Yesterday, 4:18 PM',
  },
  {
    id: 'supervisor-procurement-office',
    firstName: 'Kojo',
    middleName: '',
    lastName: 'Asare',
    fullName: 'Kojo Asare',
    email: 'kojo.asare@mrh.gov.gh',
    emailGeneratedBySystem: false,
    password: 'Password123',
    role: USER_ROLES.SUPERVISOR,
    office: getOfficeById('office-procurement'),
    phoneNumber: '',
    status: 'Inactive',
    accountStatus: 'Inactive',
    lastLogin: '14 Jul 2026, 11:40 AM',
  },
].map(normalizeMockUser)

export const mockUsers = users

export const roleOptions = [
  { value: USER_ROLES.OFFICE_USER, label: USER_ROLE_LABELS[USER_ROLES.OFFICE_USER] },
  { value: USER_ROLES.SUPERVISOR, label: USER_ROLE_LABELS[USER_ROLES.SUPERVISOR] },
  { value: USER_ROLES.ADMIN, label: USER_ROLE_LABELS[USER_ROLES.ADMIN] },
]

export function getUsers() {
  // TODO: Replace this seeded frontend-only user list with a backend GET /users endpoint.
  return users.map((user) => normalizeMockUser({ ...user }))
}
