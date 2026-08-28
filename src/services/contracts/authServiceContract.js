import { createServiceContract } from './serviceContractUtils.js'

export const authServiceContract = createServiceContract('auth', {
  login: {
    params: ['credentials'],
    returns: 'canonical authenticated user',
    mutates: true,
    apiSupported: true,
    errors: ['invalid credentials', 'transport errors'],
  },
  refreshSession: {
    params: [],
    returns: 'canonical authenticated user or access token refresh result',
    mutates: true,
    apiSupported: true,
    errors: ['session expired', 'transport errors'],
  },
  getCurrentUser: {
    params: [],
    returns: 'canonical authenticated user or null',
    mutates: false,
    apiSupported: true,
    errors: ['transport errors'],
  },
  logout: {
    params: [],
    returns: 'void',
    mutates: true,
    apiSupported: false,
    errors: [],
  },
})
