import ApiCorrespondenceListWorkspace from '../../components/correspondence/ApiCorrespondenceListWorkspace.jsx'
import { useAuth } from '../../context/useAuth.js'

function CorrespondenceListPage() {
  const { currentUser } = useAuth()

  return <ApiCorrespondenceListWorkspace currentUser={currentUser} />
}

export default CorrespondenceListPage
