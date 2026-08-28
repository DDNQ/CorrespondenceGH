export function assertServiceContract(service, requiredMethods, serviceName) {
  if (!service || typeof service !== 'object') {
    throw new Error(`${serviceName} service is not available.`)
  }

  requiredMethods.forEach((methodName) => {
    if (typeof service[methodName] !== 'function') {
      throw new Error(`${serviceName} service is missing required method "${methodName}".`)
    }
  })

  return service
}

export function createServiceContract(name, methods) {
  return Object.freeze({
    name,
    methods: Object.freeze(methods),
  })
}

export function getContractMethodNames(contract) {
  return Object.freeze(Object.keys(contract.methods))
}
