import {
  buildCorrespondenceInspectionPlan,
  CorrespondenceContractInspectionConfigError,
  summarizeContractInspectionPlan,
  validateCorrespondenceInspectionEnvironment,
} from './lib/correspondenceContractInspection.mjs'

async function main() {
  try {
    const config = validateCorrespondenceInspectionEnvironment(process.env)
    const plan = buildCorrespondenceInspectionPlan(config)
    console.log(summarizeContractInspectionPlan(plan))
    process.exitCode = 0
  } catch (error) {
    if (error instanceof CorrespondenceContractInspectionConfigError) {
      console.error('MRH correspondence contract inspection was not started.')
      console.error(error.message)
      console.error('Required environment variables:')
      console.error('- MRH_RUN_CORRESPONDENCE_INSPECTION=true')
      console.error('- MRH_CORRESPONDENCE_INSPECTION_BASE_URL (optional, defaults to the deployed API root)')
      console.error('- MRH_CORRESPONDENCE_INSPECTION_ID (optional, enables detail-only read planning)')
      process.exitCode = 1
      return
    }

    throw error
  }
}

main()
