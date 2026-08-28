import { createServiceContract } from './serviceContractUtils.js'

export const userAdminServiceContract = createServiceContract('users', {
  listUsers: {
    params: [],
    returns: 'canonical user[]',
    mutates: false,
    apiSupported: true,
    errors: [],
  },
  createUser: {
    params: ['input'],
    returns: '{ user, generatedPassword? }',
    mutates: true,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
  updateUser: {
    params: ['userId', 'input'],
    returns: '{ user }',
    mutates: true,
    apiSupported: false,
    errors: ['validation errors'],
  },
  regenerateUserPassword: {
    params: ['userId'],
    returns: '{ user, userId, email, generatedPassword }',
    mutates: true,
    apiSupported: true,
    errors: ['validation errors', 'transport errors'],
  },
  getExpectedEmailPreview: {
    params: ['input'],
    returns: 'string',
    mutates: false,
    apiSupported: false,
    errors: [],
  },
})
