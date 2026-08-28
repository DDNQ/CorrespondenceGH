import { createServiceContract } from './serviceContractUtils.js'

export const reportServiceContract = createServiceContract('reports', {
  getOfficeReportWorkspace: {
    params: ['currentUser'],
    returns: 'report workspace metadata',
    mutates: false,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
  getOfficeSummaryReport: {
    params: ['officeId', 'filters?'],
    returns: 'canonical office summary report',
    mutates: false,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
  getOfficeStaffContributionReport: {
    params: ['officeId'],
    returns: 'canonical staff contribution report',
    mutates: false,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
  getOfficeBacklogReport: {
    params: ['officeId'],
    returns: 'canonical backlog report',
    mutates: false,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
  getOfficeTrendsReport: {
    params: ['officeId'],
    returns: 'canonical trends report',
    mutates: false,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
  generateFormalReportPreview: {
    params: ['currentUser', 'configuration'],
    returns: 'canonical formal report preview',
    mutates: false,
    apiSupported: true,
    errors: ['validation errors', 'generation errors'],
  },
  generateFormalReport: {
    params: ['currentUser', 'configuration'],
    returns: 'canonical generated formal report',
    mutates: true,
    apiSupported: true,
    errors: ['validation errors', 'transport errors', 'generation errors'],
  },
  listFormalReportsHistory: {
    params: ['options?'],
    returns: 'formal report history entries',
    mutates: false,
    apiSupported: true,
    errors: ['transport errors'],
  },
  getFormalReportById: {
    params: ['reportId', 'options?'],
    returns: 'canonical formal report record',
    mutates: false,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
})
