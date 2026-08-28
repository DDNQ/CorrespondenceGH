import {
  LiveAuthVerificationConfigError,
  formatLiveAuthVerificationSummary,
  runLiveAuthVerification,
  validateLiveAuthEnvironment,
} from './lib/liveAuthVerification.mjs'

async function main() {
  try {
    validateLiveAuthEnvironment(process.env)
  } catch (error) {
    if (error instanceof LiveAuthVerificationConfigError) {
      console.error('MRH live authentication verification was not started.')
      console.error(error.message)
      console.error('Required environment variables:')
      console.error('- MRH_RUN_LIVE_API_TESTS=true')
      console.error('- MRH_LIVE_TEST_EMAIL')
      console.error('- MRH_LIVE_TEST_PASSWORD')
      console.error('- MRH_LIVE_API_BASE_URL (optional, defaults to the deployed API root)')
      process.exitCode = 1
      return
    }

    throw error
  }

  try {
    const result = await runLiveAuthVerification()
    console.log(formatLiveAuthVerificationSummary(result))
    process.exitCode = result.overall.passed ? 0 : 1
  } catch (error) {
    console.error('MRH live authentication verification failed.')
    console.error(error?.message ?? 'Unexpected verification error.')
    process.exitCode = 1
  }
}

main()
