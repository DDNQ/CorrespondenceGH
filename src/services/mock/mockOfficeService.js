import { offices as seededOffices, getOfficeById as lookupOfficeById } from '../../data/offices.js'
import { normalizeOffice } from '../../utils/offices.js'
import { createApiError } from '../api/errors.js'

let officeRecords = seededOffices.map((office) => ({ ...office }))

function cloneOffice(office) {
  return normalizeOffice({ ...office })
}

export async function listOffices() {
  return officeRecords.map((office) => cloneOffice(office))
}

export async function getOfficeById(officeId) {
  if (typeof officeId !== 'string' || !officeId.trim()) {
    return null
  }

  const office = officeRecords.find((item) => item.id === officeId.trim()) ?? lookupOfficeById(officeId)
  return office ? cloneOffice(office) : null
}

export async function createOffice(input = {}) {
  const name = String(input.name ?? '').trim()
  const code = String(input.code ?? '').trim()

  if (!name || !code) {
    throw createApiError('Office name and code are required.', {
      code: 'VALIDATION_ERROR',
      status: 422,
      details: {
        ...(name ? {} : { name: 'Office name is required.' }),
        ...(code ? {} : { code: 'Office code is required.' }),
      },
    })
  }

  const office = normalizeOffice({
    id: `office-${Date.now()}`,
    name,
    code,
    status: 'Active',
  })

  officeRecords = [office, ...officeRecords]
  return office
}

export const mockOfficeService = Object.freeze({
  listOffices,
  getOfficeById,
  createOffice,
})
