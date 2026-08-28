import { createServiceContract } from './serviceContractUtils.js'

export const correspondenceServiceContract = createServiceContract('correspondence', {
  createCorrespondence: {
    params: ['input', 'currentUser'],
    returns: 'canonical correspondence',
    mutates: true,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
  listCorrespondence: {
    params: ['params?'],
    returns: '{ records, pagination, sourceEnvelope }',
    mutates: false,
    apiSupported: true,
    errors: ['transport errors'],
  },
  getCorrespondenceById: {
    params: ['correspondenceId'],
    returns: 'canonical correspondence | null',
    mutates: false,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
  getCorrespondenceByReference: {
    params: ['referenceNumber'],
    returns: 'canonical correspondence | null',
    mutates: false,
    apiSupported: false,
    errors: ['validation errors'],
  },
  forwardCorrespondence: {
    params: ['correspondenceId', 'input'],
    returns: 'canonical response',
    mutates: true,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
  updateCorrespondenceStage: {
    params: ['correspondenceId', 'input'],
    returns: 'canonical response',
    mutates: true,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
  completeCorrespondence: {
    params: ['correspondenceId', 'input?'],
    returns: 'canonical response',
    mutates: true,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
  fileCorrespondence: {
    params: ['correspondenceId', 'input?'],
    returns: 'canonical response',
    mutates: true,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
  listCorrespondenceMovements: {
    params: ['correspondenceId'],
    returns: 'canonical movement[]',
    mutates: false,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
})
