import { createServiceContract } from './serviceContractUtils.js'

export const dashboardServiceContract = createServiceContract('dashboards', {
  getOfficeDashboardSummary: {
    params: [],
    returns: 'canonical office dashboard summary',
    mutates: false,
    apiSupported: true,
    errors: ['transport errors'],
  },
  getAdminDashboardSummary: {
    params: [],
    returns: 'canonical admin dashboard summary',
    mutates: false,
    apiSupported: true,
    errors: ['transport errors'],
  },
})
