import { createServiceContract } from './serviceContractUtils.js'

export const noteServiceContract = createServiceContract('notes', {
  createNote: {
    params: ['correspondenceId', 'text'],
    returns: 'canonical note',
    mutates: true,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
  listNotes: {
    params: ['correspondenceId'],
    returns: 'canonical note[]',
    mutates: false,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
})
