import { useEffect, useRef } from 'react'

function getFocusableElements(container) {
  if (!container) {
    return []
  }

  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  )
}

function Modal({ isOpen, title, children, actions, onClose }) {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const previousActiveElementRef = useRef(null)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    previousActiveElementRef.current = document.activeElement
    const focusableElements = getFocusableElements(dialogRef.current)
    focusableElements[0]?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current?.()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const elements = getFocusableElements(dialogRef.current)

      if (!elements.length) {
        return
      }

      const firstElement = elements[0]
      const lastElement = elements[elements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousActiveElementRef.current?.focus?.()
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-card__header">
          <h2>{title}</h2>
          <button type="button" className="modal-card__close" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="modal-card__body">{children}</div>
        {actions ? <div className="modal-card__actions">{actions}</div> : null}
      </div>
    </div>
  )
}

export default Modal
