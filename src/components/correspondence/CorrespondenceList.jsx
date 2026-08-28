import CorrespondenceListItem from './CorrespondenceListItem'

function CorrespondenceList({ records, highlightedReference = '', onOpenRecord }) {
  return (
    <div className="correspondence-list" role="list">
      {records.map((record) => (
        <CorrespondenceListItem
          key={record.id}
          record={record}
          isHighlighted={record.referenceNumber === highlightedReference}
          onOpen={() => onOpenRecord(record.referenceNumber)}
        />
      ))}
    </div>
  )
}

export default CorrespondenceList
