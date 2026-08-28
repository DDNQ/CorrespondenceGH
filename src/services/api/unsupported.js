export class UnsupportedApiOperationError extends Error {
  constructor(
    capability,
    message = 'This operation is not available through the current backend API.',
  ) {
    super(message)
    this.name = 'UnsupportedApiOperationError'
    this.code = 'API_OPERATION_UNAVAILABLE'
    this.capability = capability
    this.status = null
  }
}

export function createUnsupportedApiOperationError(capability, message) {
  return new UnsupportedApiOperationError(capability, message)
}
