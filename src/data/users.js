import { ROLES } from '../constants/roles'

export const users = [
  {
    id: 'user-legal-office',
    fullName: 'Ama Mensah',
    email: 'ama.mensah@mrh.gov.gh',
    password: 'Password123',
    role: ROLES.OFFICE_USER,
    officeId: 'office-legal',
    officeName: 'Legal Directorate',
    status: 'Active',
    lastLogin: 'Today, 8:05 AM',
  },
  {
    id: 'supervisor-legal-office',
    fullName: 'Kwesi Boateng',
    email: 'kwesi.boateng@mrh.gov.gh',
    password: 'Password123',
    role: ROLES.OFFICE_SUPERVISOR,
    officeId: 'office-legal',
    officeName: 'Legal Directorate',
    status: 'Active',
    lastLogin: 'Today, 7:48 AM',
  },
  {
    id: 'admin-ict-office',
    fullName: 'Esi Owusu',
    email: 'esi.owusu@mrh.gov.gh',
    password: 'Password123',
    role: ROLES.SYSTEM_ADMIN,
    officeId: 'office-ict',
    officeName: 'ICT Directorate',
    status: 'Active',
    lastLogin: 'Today, 7:32 AM',
  },
  {
    id: 'user-finance-office',
    fullName: 'Grace Arthur',
    email: 'grace.arthur@mrh.gov.gh',
    password: 'Password123',
    role: ROLES.OFFICE_USER,
    officeId: 'office-finance',
    officeName: 'Finance Directorate',
    status: 'Active',
    lastLogin: 'Yesterday, 4:18 PM',
  },
  {
    id: 'supervisor-procurement-office',
    fullName: 'Kojo Asare',
    email: 'kojo.asare@mrh.gov.gh',
    password: 'Password123',
    role: ROLES.OFFICE_SUPERVISOR,
    officeId: 'office-procurement',
    officeName: 'Procurement Directorate',
    status: 'Inactive',
    lastLogin: '14 Jul 2026, 11:40 AM',
  },
]

export const mockUsers = users

export const roleOptions = [
  { value: ROLES.OFFICE_USER, label: 'Office User' },
  { value: ROLES.OFFICE_SUPERVISOR, label: 'Office Supervisor' },
  { value: ROLES.SYSTEM_ADMIN, label: 'System Administrator' },
]

let userRecords = users.map((user) => ({ ...user }))

export function getUsers() {
  return userRecords.map((user) => ({ ...user }))
}

export function saveUserRecord(userRecord) {
  const existingIndex = userRecords.findIndex((user) => user.id === userRecord.id)

  if (existingIndex >= 0) {
    userRecords[existingIndex] = { ...userRecords[existingIndex], ...userRecord }
  } else {
    userRecords = [{ ...userRecord }, ...userRecords]
  }
}
