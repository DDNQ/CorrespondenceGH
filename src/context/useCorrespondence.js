import { useContext } from 'react'

import CorrespondenceContext from './correspondence-context'

export function useCorrespondence() {
  const context = useContext(CorrespondenceContext)

  if (!context) {
    throw new Error('useCorrespondence must be used within a CorrespondenceProvider')
  }

  return context
}
