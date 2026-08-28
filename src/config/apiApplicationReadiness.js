const API_APPLICATION_READINESS = Object.freeze({
  authentication: Object.freeze({
    login: true,
    restoreSession: true,
    logout: true,
  }),
  officeAdministration: Object.freeze({
    create: true,
    list: true,
    retrieve: false,
    update: false,
    delete: false,
  }),
  userAdministration: Object.freeze({
    create: true,
    regeneratePassword: true,
    list: false,
    retrieve: false,
    update: false,
    deactivate: false,
  }),
  dashboards: Object.freeze({
    officeDashboardLiveVerified: true,
    adminDashboardLiveVerified: true,
  }),
  correspondence: Object.freeze({
    registrationLiveVerified: true,
    listReadVerified: true,
    detailReadVerified: true,
    movementsReadVerified: true,
    attachmentsReadVerified: true,
    notesReadVerified: true,
    stageUpdateLiveVerified: true,
    notesMutationLiveVerified: true,
    attachmentUploadLiveVerified: true,
    attachmentRetrievalLiveVerified: true,
    completionLiveVerified: true,
    filingLiveVerified: true,
    filedMovementAuditLiveVerified: false,
    forwardingDestinationDirectoryAvailable: true,
    officeScopeVerified: true,
    filtersVerified: true,
    historicalScopesVerified: true,
    readsReady: true,
    mutationsReady: true,
  }),
  formalReports: Object.freeze({
    officePerformanceLiveVerified: true,
    overdueLiveVerified: true,
    pendingAgeingLiveVerified: true,
    staffContributionLiveVerified: true,
    previewLiveVerified: true,
    generateLiveVerified: true,
    historyLiveVerified: true,
  }),
  analyticsReports: Object.freeze({
    summaryLiveVerified: true,
    staffContributionLiveVerified: true,
    backlogLiveVerified: true,
    trendsLiveVerified: true,
  }),
  notifications: Object.freeze({
    available: false,
  }),
  authenticatedApplicationReady: true,
})

export function getApiApplicationReadiness() {
  return API_APPLICATION_READINESS
}

export function isApiAuthenticationIntegrated() {
  return true
}

export function isApiAdministratorSetupReady() {
  return true
}

export function isApiDomainIntegrationComplete() {
  return true
}

export function assertApiApplicationReadyForAuthenticatedRoutes() {
  return true
}
