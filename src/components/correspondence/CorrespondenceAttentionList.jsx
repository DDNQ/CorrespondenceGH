import CorrespondenceAttentionItem from './CorrespondenceAttentionItem'

function CorrespondenceAttentionList({ records }) {
  if (records.length === 0) {
    return (
      <div className="attention-empty-state">
        <h3>No correspondence requires attention</h3>
        <p>
          There are currently no active correspondence records requiring action from
          this office.
        </p>
      </div>
    )
  }

  return (
    <div className="attention-list">
      {records.map((record) => (
        <CorrespondenceAttentionItem key={record.id} record={record} />
      ))}
    </div>
  )
}

export default CorrespondenceAttentionList
