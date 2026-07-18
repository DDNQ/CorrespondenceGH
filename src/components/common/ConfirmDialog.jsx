import Modal from './Modal'

function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="button button--secondary" onClick={onClose}>
            {cancelLabel}
          </button>
          <button type="button" className="button button--primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="modal-card__description">{description}</p>
    </Modal>
  )
}

export default ConfirmDialog
