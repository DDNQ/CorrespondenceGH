import { createServiceContract } from './serviceContractUtils.js'

export const officeServiceContract = createServiceContract('offices', {
  listOffices: {
    params: [],
    returns: 'canonical office[]',
    mutates: false,
    apiSupported: true,
    errors: ['transport errors', 'contract errors'],
  },
  getOfficeById: {
    params: ['officeId'],
    returns: 'canonical office | null',
    mutates: false,
    apiSupported: false,
    errors: ['validation errors'],
  },
  createOffice: {
    params: ['input'],
    returns: 'canonical office',
    mutates: true,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
})
