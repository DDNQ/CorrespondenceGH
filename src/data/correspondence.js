import { addAuditLog } from './auditLogs'

const baseCorrespondence = [
  {
    id: 'corr-0012',
    reference: 'MRH/CON/2026/0012',
    subject: 'Periodic Maintenance Contract for N1 Highway',
    documentType: 'Contract',
    sender: 'Ghana Highway Authority',
    direction: 'Incoming',
    externalReference: 'GHA/PROC/24/07',
    priority: 'High',
    currentOffice: 'Legal Directorate',
    currentStage: 'Legal review and contract compliance assessment',
    status: 'In Progress',
    dateReceived: '12 Jul 2026',
    arrivedAtCurrentOffice: '14 Jul 2026, 9:14 AM',
    forwardedFromOfficeId: 'office-registry',
    forwardedFromOfficeName: 'Central Registry',
    forwardedToOfficeId: 'office-legal',
    forwardedToOfficeName: 'Legal Directorate',
    forwardedAt: '14 Jul 2026, 8:55 AM',
    forwardedByUserId: 'user-grace-boateng',
    forwardedByUserName: 'Grace Boateng',
    receiptStatus: 'Acknowledged',
    receivedAt: '14 Jul 2026, 9:14 AM',
    receivedByUserId: 'user-kojo-asare',
    receivedByUserName: 'Kojo Asare',
    receivedByOfficeId: 'office-legal',
    receivedByOfficeName: 'Legal Directorate',
    receiptNote: 'Receipt acknowledged and opened for legal review.',
    deadline: '18 Jul 2026',
    stageDeadline: '18 Jul 2026',
    overallCompletionDate: '22 Jul 2026',
    timeSpentInOffice: '2 days',
    timeRemaining: '1 day 7 hrs',
    deadlineState: 'due-soon',
    dateGroup: 'recent',
    registeringOffice: 'Central Registry',
    routeToOffice: 'Legal Directorate',
    requiredAction:
      'Review contract terms, liability clauses, and statutory compliance requirements before forwarding.',
    administrativeNotes:
      'Originating procurement file already attached to the incoming package.',
    currentHandler: 'Ama Mensah',
    journey: [
      {
        id: 'journey-0012-1',
        title: 'Registered by Central Registry',
        description: 'Initial correspondence record created and logged by the registry.',
        actionType: 'Registered',
        office: 'Central Registry',
        officeId: 'office-registry',
        actor: 'Grace Boateng',
        actorId: 'user-grace-boateng',
        time: '12 Jul 2026, 10:12 AM',
        state: 'done',
        note: 'Supporting procurement papers were received with the main contract package.',
      },
      {
        id: 'journey-0012-2',
        title: 'Classified by Central Registry',
        description: 'Classified for legal review after registry examination of the received contract set.',
        actionType: 'Stage Updated',
        office: 'Central Registry',
        officeId: 'office-registry',
        actor: 'Grace Boateng',
        actorId: 'user-grace-boateng',
        time: '12 Jul 2026, 11:05 AM',
        state: 'done',
        note: 'Registry marked the file for legal routing and priority handling.',
      },
      {
        id: 'journey-0012-3',
        title: 'Forwarded from Central Registry to Legal Directorate',
        description: 'Forwarded for legal review and contract compliance assessment.',
        actionType: 'Forwarded',
        office: 'Central Registry',
        officeId: 'office-registry',
        actor: 'Grace Boateng',
        actorId: 'user-grace-boateng',
        time: '14 Jul 2026, 8:55 AM',
        fromOffice: 'Central Registry',
        toOffice: 'Legal Directorate',
        state: 'done',
        note: 'Kindly review contract terms and confirm statutory compliance.',
      },
      {
        id: 'journey-0012-4',
        title: 'Received by Legal Directorate',
        description: 'The Legal Directorate acknowledged receipt and opened the review stage.',
        actionType: 'Received',
        office: 'Legal Directorate',
        officeId: 'office-legal',
        actor: 'Kojo Asare',
        actorId: 'user-kojo-asare',
        time: '14 Jul 2026, 9:14 AM',
        fromOffice: 'Central Registry',
        toOffice: 'Legal Directorate',
        state: 'done',
      },
      {
        id: 'journey-0012-5',
        title: 'Stage updated to Legal review',
        description: 'Legal review and contract compliance assessment commenced.',
        actionType: 'Stage Updated',
        office: 'Legal Directorate',
        officeId: 'office-legal',
        actor: 'Ama Mensah',
        actorId: 'user-ama-mensah',
        time: '15 Jul 2026, 9:18 AM',
        state: 'current',
        note: 'Initial legal review commenced and compliance points were flagged.',
      },
    ],
    actions: [
      {
        id: 'action-0012-1',
        type: 'Registered',
        actionType: 'Registered',
        title: 'Correspondence registered',
        description: 'Correspondence registered by Grace Boateng on behalf of Central Registry.',
        actor: 'Grace Boateng',
        actorId: 'user-grace-boateng',
        office: 'Central Registry',
        officeId: 'office-registry',
        officeName: 'Central Registry',
        role: 'OFFICE_USER',
        userId: 'user-grace-boateng',
        userName: 'Grace Boateng',
        timestamp: '12 Jul 2026, 10:12 AM',
        newValue: 'Registered',
      },
      {
        id: 'action-0012-2',
        type: 'Stage Updated',
        actionType: 'Stage Updated',
        title: 'Classification completed',
        description: 'Registry classification completed before routing to the Legal Directorate.',
        actor: 'Grace Boateng',
        actorId: 'user-grace-boateng',
        office: 'Central Registry',
        officeId: 'office-registry',
        officeName: 'Central Registry',
        role: 'OFFICE_USER',
        userId: 'user-grace-boateng',
        userName: 'Grace Boateng',
        previousValue: 'Registered',
        newValue: 'Initial classification',
        note: 'Registry marked the file for legal routing and priority handling.',
        timestamp: '12 Jul 2026, 11:05 AM',
      },
      {
        id: 'action-0012-3',
        type: 'Forwarded',
        actionType: 'Forwarded',
        title: 'Forwarded to Legal Directorate',
        description: 'Forwarded by Grace Boateng on behalf of Central Registry.',
        actor: 'Grace Boateng',
        actorId: 'user-grace-boateng',
        office: 'Central Registry',
        officeId: 'office-registry',
        officeName: 'Central Registry',
        role: 'OFFICE_USER',
        userId: 'user-grace-boateng',
        userName: 'Grace Boateng',
        previousValue: 'Central Registry',
        newValue: 'Legal Directorate',
        note: 'Kindly review contract terms and confirm statutory compliance.',
        timestamp: '14 Jul 2026, 9:14 AM',
      },
      {
        id: 'action-0012-4',
        type: 'Received',
        actionType: 'Received',
        title: 'Received by Legal Directorate',
        description: 'Receipt acknowledged by Kojo Asare on behalf of Legal Directorate.',
        actor: 'Kojo Asare',
        actorId: 'user-kojo-asare',
        office: 'Legal Directorate',
        officeId: 'office-legal',
        officeName: 'Legal Directorate',
        role: 'OFFICE_USER',
        userId: 'user-kojo-asare',
        userName: 'Kojo Asare',
        previousValue: 'Central Registry',
        newValue: 'Legal Directorate',
        timestamp: '14 Jul 2026, 9:14 AM',
      },
      {
        id: 'action-0012-5',
        type: 'Stage Updated',
        actionType: 'Stage Updated',
        title: 'Current stage updated',
        description: 'Stage updated by Ama Mensah on behalf of Legal Directorate.',
        actor: 'Ama Mensah',
        actorId: 'user-ama-mensah',
        office: 'Legal Directorate',
        officeId: 'office-legal',
        officeName: 'Legal Directorate',
        role: 'OFFICE_SUPERVISOR',
        userId: 'user-ama-mensah',
        userName: 'Ama Mensah',
        previousValue: 'Initial classification',
        newValue: 'Legal review and contract compliance assessment',
        note: 'Initial legal review commenced and compliance points were flagged.',
        timestamp: '15 Jul 2026, 9:18 AM',
      },
    ],
    attachments: [
      {
        id: 'att-0012',
        fileName: 'periodic_maintenance_contract.pdf',
        fileType: 'PDF',
        type: 'PDF',
        mimeType: 'application/pdf',
        description: 'Primary correspondence attachment',
        uploadedByUserId: 'user-grace-boateng',
        uploadedByUserName: 'Grace Boateng',
        uploadedBy: 'Grace Boateng',
        uploadedByOfficeId: 'office-registry',
        uploadedByOfficeName: 'Central Registry',
        office: 'Central Registry',
        uploadedAt: '12 Jul 2026, 10:12 AM',
        date: '12 Jul 2026, 10:12 AM',
        size: '1.8 MB',
        fileUrl: '/sample-documents/periodic_maintenance_contract.pdf',
        fileObject: null,
        isTemporary: false,
      },
    ],
    notes: [
      {
        id: 'note-0012-1',
        author: 'Ama Mensah',
        office: 'Legal Directorate',
        date: '15 Jul 2026, 9:18 AM',
        body:
          'Initial legal review commenced. Contract clauses requiring further attention have been identified.',
      },
    ],
  },
  {
    id: 'corr-0088',
    reference: 'MRH/LET/2026/0088',
    subject: 'Road Safety Petition from Community Leaders',
    documentType: 'Letter',
    sender: 'N1 Corridor Community Leaders',
    direction: 'Incoming',
    externalReference: 'N1-CLC-2026-11',
    priority: 'Normal',
    currentOffice: 'Legal Directorate',
    currentStage: 'Awaiting legal assessment and routing decision',
    status: 'Awaiting Action',
    dateReceived: '14 Jul 2026',
    arrivedAtCurrentOffice: '14 Jul 2026, 1:30 PM',
    deadline: '20 Jul 2026',
    stageDeadline: '20 Jul 2026',
    overallCompletionDate: '24 Jul 2026',
    timeSpentInOffice: '2 days',
    timeRemaining: '4 days',
    deadlineState: 'normal',
    dateGroup: 'recent',
    registeringOffice: 'Central Registry',
    routeToOffice: 'Legal Directorate',
    requiredAction: 'Review petition content and determine the appropriate office response route.',
    administrativeNotes: 'Community leaders requested acknowledgement within three working days.',
    journey: [],
    actions: [],
    attachments: [
      {
        id: 'att-0088',
        fileName: 'road_safety_petition.pdf',
        type: 'PDF',
        uploadedBy: 'Grace Boateng',
        office: 'Central Registry',
        date: '14 Jul 2026, 1:10 PM',
        size: '950 KB',
      },
    ],
    notes: [],
  },
  {
    id: 'corr-0061',
    reference: 'MRH/MEM/2026/0061',
    subject: 'Request for Legal Opinion on Contractor Dispute',
    documentType: 'Memo',
    sender: 'Procurement Directorate',
    direction: 'Internal',
    externalReference: 'PROC/CONT/216',
    priority: 'Urgent',
    currentOffice: 'Legal Directorate',
    currentStage: 'Legal opinion preparation',
    status: 'Overdue',
    dateReceived: '11 Jul 2026',
    arrivedAtCurrentOffice: '11 Jul 2026, 10:05 AM',
    deadline: '14 Jul 2026',
    stageDeadline: '14 Jul 2026',
    overallCompletionDate: '16 Jul 2026',
    timeSpentInOffice: '5 days',
    timeRemaining: '1 day overdue',
    deadlineState: 'overdue',
    dateGroup: 'recent',
    registeringOffice: 'Procurement Directorate',
    routeToOffice: 'Legal Directorate',
    requiredAction: 'Prepare legal opinion on dispute exposure and contractual remedies.',
    administrativeNotes: 'Supporting records received in two batches.',
    journey: [],
    actions: [],
    attachments: [
      {
        id: 'att-0061',
        fileName: 'contractor_dispute_memo.docx',
        type: 'DOCX',
        uploadedBy: 'Kojo Asare',
        office: 'Procurement Directorate',
        date: '11 Jul 2026, 9:50 AM',
        size: '620 KB',
      },
    ],
    notes: [
      {
        id: 'note-0061-1',
        author: 'Grace Arthur',
        office: 'Legal Directorate',
        date: '14 Jul 2026, 3:24 PM',
        body: 'Awaiting one final supporting annex before issuing the legal opinion.',
      },
    ],
  },
  {
    id: 'corr-0031',
    reference: 'MRH/REP/2026/0031',
    subject: 'Structural Assessment of Bridge Rehabilitation Project',
    documentType: 'Report',
    sender: 'Highway Planning Directorate',
    direction: 'Internal',
    externalReference: 'HPL/BRG/2026/03',
    priority: 'High',
    currentOffice: 'Legal Directorate',
    currentStage: 'Review of contractual implications and liability clauses',
    status: 'In Progress',
    dateReceived: '13 Jul 2026',
    arrivedAtCurrentOffice: '13 Jul 2026, 8:40 AM',
    deadline: '19 Jul 2026',
    stageDeadline: '19 Jul 2026',
    overallCompletionDate: '25 Jul 2026',
    timeSpentInOffice: '3 days',
    timeRemaining: '3 days',
    deadlineState: 'normal',
    dateGroup: 'recent',
    registeringOffice: 'Highway Planning Directorate',
    routeToOffice: 'Legal Directorate',
    requiredAction: 'Review risk exposure and liability implications arising from assessment findings.',
    administrativeNotes: 'Chief Director requested a short executive note after legal review.',
    journey: [],
    actions: [],
    attachments: [],
    notes: [],
  },
  {
    id: 'corr-0017',
    reference: 'MRH/CON/2026/0017',
    subject: 'Consultancy Agreement for Feasibility Study',
    documentType: 'Contract',
    sender: 'Office of the Chief Director',
    direction: 'Internal',
    externalReference: 'OCD/FS/2026/19',
    priority: 'Normal',
    currentOffice: 'Legal Directorate',
    currentStage: 'Initial classification and legal review preparation',
    status: 'Received',
    dateReceived: '15 Jul 2026',
    arrivedAtCurrentOffice: '15 Jul 2026, 8:15 AM',
    forwardedFromOfficeId: 'office-chief-director',
    forwardedFromOfficeName: 'Office of the Chief Director',
    forwardedToOfficeId: 'office-legal',
    forwardedToOfficeName: 'Legal Directorate',
    forwardedAt: '15 Jul 2026, 8:15 AM',
    forwardedByUserId: 'user-chief-director-admin',
    forwardedByUserName: 'Office of the Chief Director Admin',
    receiptStatus: 'Pending',
    receivedAt: null,
    receivedByUserId: null,
    receivedByUserName: null,
    receivedByOfficeId: null,
    receivedByOfficeName: null,
    receiptNote: '',
    deadline: '21 Jul 2026',
    stageDeadline: '21 Jul 2026',
    overallCompletionDate: '28 Jul 2026',
    timeSpentInOffice: '1 day',
    timeRemaining: '6 days',
    deadlineState: 'normal',
    dateGroup: 'recent',
    registeringOffice: 'Office of the Chief Director',
    routeToOffice: 'Legal Directorate',
    requiredAction: 'Prepare legal review for consultancy engagement and procurement compliance.',
    administrativeNotes: 'Initial routing approved directly from the Office of the Chief Director.',
    journey: [],
    actions: [],
    attachments: [],
    notes: [],
  },
  {
    id: 'corr-0049',
    reference: 'MRH/MEM/2026/0049',
    subject: 'Clarification on Contract Variation Approval Procedure',
    documentType: 'Memo',
    sender: 'Finance Directorate',
    direction: 'Internal',
    externalReference: 'FIN/CV/049',
    priority: 'Normal',
    currentOffice: 'Office of the Chief Director',
    currentStage: 'Forwarded after completion of legal review',
    status: 'Forwarded',
    dateReceived: '10 Jul 2026',
    arrivedAtCurrentOffice: '12 Jul 2026, 9:00 AM',
    deadline: '17 Jul 2026',
    stageDeadline: '17 Jul 2026',
    overallCompletionDate: '17 Jul 2026',
    timeSpentInOffice: 'Forwarded',
    timeRemaining: 'Forwarded today',
    deadlineState: 'normal',
    dateGroup: 'older',
    registeringOffice: 'Finance Directorate',
    routeToOffice: 'Office of the Chief Director',
    requiredAction: 'Provide procedural clarification after legal review.',
    administrativeNotes: '',
    journey: [],
    actions: [],
    attachments: [],
    notes: [],
  },
  {
    id: 'corr-0042',
    reference: 'MRH/LET/2026/0042',
    subject: 'Response to Request for Right-of-Way Clarification',
    documentType: 'Letter',
    sender: 'Survey and Mapping Division',
    direction: 'Incoming',
    externalReference: 'SMD/ROW/42',
    priority: 'Normal',
    currentOffice: 'Legal Directorate',
    currentStage: 'Legal response completed',
    status: 'Completed',
    dateReceived: '07 Jul 2026',
    arrivedAtCurrentOffice: '08 Jul 2026, 10:20 AM',
    deadline: '12 Jul 2026',
    stageDeadline: '12 Jul 2026',
    overallCompletionDate: '12 Jul 2026',
    timeSpentInOffice: 'Completed',
    timeRemaining: 'Completed',
    deadlineState: 'completed',
    dateGroup: 'older',
    registeringOffice: 'Central Registry',
    routeToOffice: 'Legal Directorate',
    requiredAction: 'Prepare legal clarification and response note.',
    administrativeNotes: '',
    journey: [],
    actions: [],
    attachments: [],
    notes: [],
  },
  {
    id: 'corr-0018',
    reference: 'MRH/REP/2026/0018',
    subject: 'Quarterly Road Maintenance Performance Report',
    documentType: 'Report',
    sender: 'Highway Maintenance Directorate',
    direction: 'Internal',
    externalReference: 'HMD/Q2/18',
    priority: 'Normal',
    currentOffice: 'Records Office',
    currentStage: 'Filed after completion',
    status: 'Filed',
    dateReceived: '01 Jul 2026',
    arrivedAtCurrentOffice: '02 Jul 2026, 2:10 PM',
    deadline: '08 Jul 2026',
    stageDeadline: '08 Jul 2026',
    overallCompletionDate: '08 Jul 2026',
    timeSpentInOffice: 'Filed',
    timeRemaining: 'Filed',
    deadlineState: 'filed',
    dateGroup: 'older',
    registeringOffice: 'Highway Maintenance Directorate',
    routeToOffice: 'Records Office',
    requiredAction: 'File final report after office review completion.',
    administrativeNotes: '',
    journey: [],
    actions: [],
    attachments: [],
    notes: [],
  },
]

let correspondenceRecords = baseCorrespondence.map((record) => ({
  ...record,
  journey: record.journey.map((item) => ({ ...item })),
  actions: record.actions.map((item) => ({ ...item })),
  attachments: record.attachments.map((item) => ({ ...item })),
  notes: record.notes.map((item) => ({ ...item })),
}))

export const statusOptions = [
  'All',
  'Registered',
  'Received',
  'In Progress',
  'Awaiting Action',
  'Forwarded',
  'Completed',
  'Filed',
  'Overdue',
]

export const statusParamMap = {
  all: 'All',
  registered: 'Registered',
  received: 'Received',
  'in-progress': 'In Progress',
  'awaiting-action': 'Awaiting Action',
  forwarded: 'Forwarded',
  completed: 'Completed',
  filed: 'Filed',
  overdue: 'Overdue',
}

export const mockCorrespondence = baseCorrespondence

export const documentTypeOptions = [
  'All document types',
  'Contract',
  'Letter',
  'Memo',
  'Report',
]
export const priorityOptions = ['All priorities', 'Normal', 'High', 'Urgent']
export const dateGroupOptions = ['Any date', 'Recently received', 'Older records']
export const registrationDocumentTypeOptions = ['Contract', 'Letter', 'Memo', 'Report']
export const registrationDirectionOptions = ['Incoming', 'Outgoing', 'Internal']
export const registrationPriorityOptions = ['Normal', 'High', 'Urgent']
export const registrationStageOptions = [
  'Initial classification',
  'Initial legal review',
  'Awaiting action',
  'Director review',
  'Technical assessment',
  'Financial review',
  'Procurement review',
]
export const workflowStageOptions = [
  'Initial classification',
  'Initial legal review',
  'Awaiting action',
  'Director review',
  'Technical assessment',
  'Financial review',
  'Procurement review',
  'Legal opinion preparation',
  'Contract compliance assessment',
  'Ready for forwarding',
]

export function normalizeStatusParam(statusParam) {
  return statusParamMap[statusParam] ?? 'All'
}

export function getCorrespondenceRecords() {
  return correspondenceRecords.map((record) => ({
    ...record,
    journey: record.journey.map((item) => ({ ...item })),
    actions: record.actions.map((item) => ({ ...item })),
    attachments: record.attachments.map((item) => ({ ...item })),
    notes: record.notes.map((item) => ({ ...item })),
  }))
}

export function getCorrespondenceByReference(reference) {
  const normalizedReference = decodeURIComponent(reference)

  const record = correspondenceRecords.find(
    (item) => item.reference.toLowerCase() === normalizedReference.toLowerCase(),
  )

  if (!record) {
    return null
  }

  return {
    ...record,
    journey: record.journey.map((item) => ({ ...item })),
    actions: record.actions.map((item) => ({ ...item })),
    attachments: record.attachments.map((item) => ({ ...item })),
    notes: record.notes.map((item) => ({ ...item })),
  }
}

function getDocumentCode(documentType) {
  return {
    Contract: 'CON',
    Letter: 'LET',
    Memo: 'MEM',
    Report: 'REP',
  }[documentType] ?? 'DOC'
}

export function generateNextReference(documentType = 'Contract') {
  const currentYear = '2026'
  const matchingRecords = correspondenceRecords.filter((record) =>
    record.reference.startsWith(`MRH/${getDocumentCode(documentType)}/${currentYear}/`),
  )
  const nextSequence = String(matchingRecords.length + 1).padStart(4, '0')

  return `MRH/${getDocumentCode(documentType)}/${currentYear}/${nextSequence}`
}

export function addCorrespondenceRecord(formValues, currentUser) {
  const reference = generateNextReference(formValues.documentType)

  const newRecord = {
    id: `corr-${reference.split('/').pop()?.toLowerCase()}`,
    reference,
    subject: formValues.subject,
    documentType: formValues.documentType,
    sender: formValues.sender,
    direction: formValues.direction,
    externalReference: formValues.externalReference,
    priority: formValues.priority,
    currentOffice: formValues.routeToOffice,
    currentStage: formValues.initialStage,
    status: 'Registered',
    dateReceived: formValues.dateReceived,
    arrivedAtCurrentOffice: `${formValues.dateReceived}, 9:00 AM`,
    deadline: formValues.overallCompletionDate,
    stageDeadline: formValues.stageDeadline,
    overallCompletionDate: formValues.overallCompletionDate,
    timeSpentInOffice: 'New',
    timeRemaining: 'Pending review',
    deadlineState: 'normal',
    registeringOffice: currentUser.officeName,
    routeToOffice: formValues.routeToOffice,
    requiredAction: formValues.instructions,
    administrativeNotes: formValues.administrativeNotes,
    journey: [
      {
        title: `Registered by ${currentUser.officeName}`,
        description: `Recorded by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
        office: currentUser.officeName,
        actor: currentUser.fullName,
        time: `${formValues.dateReceived}, 9:00 AM`,
        state: 'done',
      },
      {
        title: `Forwarded to ${formValues.routeToOffice}`,
        description: `Initial route established for ${formValues.initialStage}.`,
        office: formValues.routeToOffice,
        actor: currentUser.fullName,
        time: `${formValues.dateReceived}, 9:05 AM`,
        state: 'current',
      },
    ],
    actions: [
      {
        type: 'Registered',
        title: 'Correspondence registered',
        description: `Recorded by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
        actor: currentUser.fullName,
        office: currentUser.officeName,
        role: currentUser.role,
        timestamp: `${formValues.dateReceived}, 9:00 AM`,
      },
    ],
    attachments: [
      {
        id: `att-${reference.toLowerCase()}`,
        fileName: formValues.attachmentName || 'correspondence_attachment.pdf',
        type: 'PDF',
        uploadedBy: currentUser.fullName,
        office: currentUser.officeName,
        date: `${formValues.dateReceived}, 9:00 AM`,
        size: 'Pending upload review',
      },
    ],
    notes: formValues.administrativeNotes
      ? [
          {
            id: `note-${reference.toLowerCase()}`,
            author: currentUser.fullName,
            office: currentUser.officeName,
            date: `${formValues.dateReceived}, 9:00 AM`,
            body: formValues.administrativeNotes,
          },
        ]
      : [],
  }

  correspondenceRecords = [newRecord, ...correspondenceRecords]

  addAuditLog({
    id: `audit-${reference.toLowerCase()}`,
    type: 'Registered',
    title: 'Correspondence registered',
    description: `${reference} — ${formValues.subject}`,
    reference,
    user: currentUser.fullName,
    office: currentUser.officeName,
    role: currentUser.role,
    time: `${formValues.dateReceived}, 9:00 AM`,
    dateGroup: 'Today',
  })

  return reference
}

export function updateCorrespondenceStage(reference, updateValues, currentUser) {
  correspondenceRecords = correspondenceRecords.map((record) => {
    if (record.reference !== reference) {
      return record
    }

    const updatedRecord = {
      ...record,
      currentStage: updateValues.stage,
      stageDeadline: updateValues.stageDeadline,
      status: 'In Progress',
      actions: [
        {
          type: 'Stage Updated',
          title: 'Current stage updated',
          description: `Recorded by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
          actor: currentUser.fullName,
          office: currentUser.officeName,
          role: currentUser.role,
          timestamp: '16 Jul 2026, 10:15 AM',
        },
        ...record.actions,
      ],
      notes: updateValues.note
        ? [
            {
              id: `note-stage-${Date.now()}`,
              author: currentUser.fullName,
              office: currentUser.officeName,
              date: '16 Jul 2026, 10:15 AM',
              body: updateValues.note,
            },
            ...record.notes,
          ]
        : record.notes,
    }

    return updatedRecord
  })
}

export function forwardCorrespondence(reference, updateValues, currentUser) {
  correspondenceRecords = correspondenceRecords.map((record) => {
    if (record.reference !== reference) {
      return record
    }

    return {
      ...record,
      currentOffice: updateValues.destinationOffice,
      routeToOffice: updateValues.destinationOffice,
      status: 'Forwarded',
      timeRemaining: 'Forwarded today',
      actions: [
        {
          type: 'Forwarded',
          title: `Forwarded to ${updateValues.destinationOffice}`,
          description: `Recorded by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
          actor: currentUser.fullName,
          office: currentUser.officeName,
          role: currentUser.role,
          timestamp: '16 Jul 2026, 11:05 AM',
        },
        ...record.actions,
      ],
      notes: updateValues.instruction
        ? [
            {
              id: `note-forward-${Date.now()}`,
              author: currentUser.fullName,
              office: currentUser.officeName,
              date: '16 Jul 2026, 11:05 AM',
              body: updateValues.instruction,
            },
            ...record.notes,
          ]
        : record.notes,
    }
  })
}

export function completeCorrespondence(reference, currentUser) {
  correspondenceRecords = correspondenceRecords.map((record) => {
    if (record.reference !== reference) {
      return record
    }

    return {
      ...record,
      status: 'Completed',
      timeRemaining: 'Completed',
      deadlineState: 'normal',
      currentStage: 'Office action completed',
      actions: [
        {
          type: 'Completed',
          title: 'Office stage completed',
          description: `Recorded by ${currentUser.fullName} on behalf of ${currentUser.officeName}.`,
          actor: currentUser.fullName,
          office: currentUser.officeName,
          role: currentUser.role,
          timestamp: '16 Jul 2026, 11:40 AM',
        },
        ...record.actions,
      ],
    }
  })
}

export function addCorrespondenceNote(reference, noteBody, currentUser) {
  correspondenceRecords = correspondenceRecords.map((record) => {
    if (record.reference !== reference) {
      return record
    }

    return {
      ...record,
      notes: [
        {
          id: `note-${Date.now()}`,
          author: currentUser.fullName,
          office: currentUser.officeName,
          date: '16 Jul 2026, 12:05 PM',
          body: noteBody,
        },
        ...record.notes,
      ],
    }
  })
}
