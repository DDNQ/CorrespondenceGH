import { getApiApplicationReadiness } from '../../config/apiApplicationReadiness.js'
import { getCorrespondenceListQuerySupport } from './validators/correspondenceReadValidators.js'

export function getCorrespondenceReadCapabilityRegistry() {
  const readiness = getApiApplicationReadiness()
  const listQuerySupport = getCorrespondenceListQuerySupport()

  return {
    list: {
      prepared: readiness.correspondence.listReadVerified,
      verified: readiness.correspondence.listReadVerified,
      query: listQuerySupport,
    },
    detail: {
      prepared: readiness.correspondence.detailReadVerified,
      verified: readiness.correspondence.detailReadVerified,
    },
    movements: {
      prepared: readiness.correspondence.movementsReadVerified,
      verified: readiness.correspondence.movementsReadVerified,
    },
    attachments: {
      prepared: readiness.correspondence.attachmentsReadVerified,
      verified: readiness.correspondence.attachmentsReadVerified,
    },
    notes: {
      prepared: readiness.correspondence.notesReadVerified,
      verified: readiness.correspondence.notesReadVerified,
    },
    historicalScopesVerified: readiness.correspondence.historicalScopesVerified,
    officeScopeVerified: readiness.correspondence.officeScopeVerified,
    readsReady: readiness.correspondence.readsReady,
    mutationsReady: readiness.correspondence.mutationsReady,
  }
}
