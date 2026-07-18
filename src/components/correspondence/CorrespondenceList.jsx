import CorrespondenceListItem from './CorrespondenceListItem'

function CorrespondenceList({ records, highlightedReference = '', onOpenRecord }) {
  return (
    <div className="correspondence-list" role="list">
      {records.map((record) => (
        <CorrespondenceListItem
          key={record.id}
          record={record}
          isHighlighted={record.reference === highlightedReference}
          onOpen={() => onOpenRecord(record.reference)}
        />
      ))}
    </div>
  )
}

export default CorrespondenceList
