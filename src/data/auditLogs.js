const baseAuditLogs = [
  {
    id: 'audit-001',
    type: 'Registered',
    title: 'Correspondence registered',
    description: 'MRH/CON/2026/0017 — Consultancy Agreement for Feasibility Study',
    reference: 'MRH/CON/2026/0017',
    user: 'Grace Boateng',
    office: 'Central Registry',
    role: 'Office User',
    time: 'Today, 8:15 AM',
    dateGroup: 'Today',
  },
  {
    id: 'audit-002',
    type: 'Forwarded',
    title: 'Correspondence forwarded',
    description: 'MRH/REP/2026/0031 routed from Highway Planning Directorate to Legal Directorate',
    reference: 'MRH/REP/2026/0031',
    user: 'Kojo Asare',
    office: 'Highway Planning Directorate',
    role: 'Office Supervisor',
    time: 'Today, 9:42 AM',
    dateGroup: 'Today',
  },
  {
    id: 'audit-003',
    type: 'Stage Updated',
    title: 'Current stage updated',
    description: 'MRH/CON/2026/0012 stage updated to legal review and compliance assessment',
    reference: 'MRH/CON/2026/0012',
    user: 'Ama Mensah',
    office: 'Legal Directorate',
    role: 'Office User',
    time: 'Today, 11:05 AM',
    dateGroup: 'Today',
  },
  {
    id: 'audit-004',
    type: 'Completed',
    title: 'Office stage completed',
    description: 'MRH/LET/2026/0042 marked completed after legal response preparation',
    reference: 'MRH/LET/2026/0042',
    user: 'Kwesi Boateng',
    office: 'Legal Directorate',
    role: 'Office Supervisor',
    time: 'Yesterday, 2:30 PM',
    dateGroup: 'Yesterday',
  },
  {
    id: 'audit-005',
    type: 'Security',
    title: 'Password reset by administrator',
    description: 'Temporary password created for an inactive Finance Directorate account',
    reference: 'Account Access',
    user: 'Esi Owusu',
    office: 'ICT Directorate',
    role: 'System Administrator',
    time: 'Yesterday, 10:22 AM',
    dateGroup: 'Yesterday',
  },
]

let auditLogs = baseAuditLogs.map((entry) => ({ ...entry }))

export function getAuditLogs() {
  return auditLogs.map((entry) => ({ ...entry }))
}

export function addAuditLog(entry) {
  auditLogs = [{ ...entry }, ...auditLogs]
}
