import { FileImage, FileText, RefreshCw, Upload, X } from 'lucide-react'
import { useRef } from 'react'
import {
  ATTACHMENT_INPUT_ACCEPT,
  canPreviewAttachment,
  formatFileSize,
  getAttachmentViewUrl,
  isImageAttachment,
  isPdfAttachment,
  isWordAttachment,
} from '../../utils/attachments.js'

function getAttachmentTypeLabel(file) {
  if (isPdfAttachment(file)) {
    return 'PDF document'
  }

  if (isWordAttachment(file)) {
    const extension = String(file?.extension ?? '').trim().toUpperCase()
    return extension ? `${extension} document` : 'Word document'
  }

  if (isImageAttachment(file)) {
    return 'Image document'
  }

  return 'Attachment'
}

function FileUploadField({
  id,
  file,
  error,
  accept,
  inputRef,
  onChange,
  onRemove,
  disabled = false,
  emptyLabel = 'Choose document',
  emptyHint = 'PDF, DOC, DOCX, JPG, JPEG or PNG up to 10 MB',
  replaceLabel = 'Replace',
  removeLabel = 'Remove',
  showInlinePreview = true,
}) {
  const internalInputRef = useRef(null)
  const attachmentName = file?.originalFilename || file?.filename || file?.fileName || file?.name
  const previewUrl = getAttachmentViewUrl(file)
  const canPreviewSelectedAttachment = Boolean(file && previewUrl && canPreviewAttachment(file))
  const attachmentTypeLabel = getAttachmentTypeLabel(file)

  const handleInputRef = (node) => {
    internalInputRef.current = node

    if (typeof inputRef === 'function') {
      inputRef(node)
    }
  }

  const handleReplace = () => {
    internalInputRef.current?.click()
  }

  return (
    <div className="file-upload-field">
      <input
        ref={handleInputRef}
        id={id}
        type="file"
        className="sr-only"
        accept={accept || ATTACHMENT_INPUT_ACCEPT}
        onChange={onChange}
        disabled={disabled}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
      />
      {!file ? (
        <label
          htmlFor={id}
          className={`file-upload-field__dropzone${error ? ' file-upload-field__dropzone--error' : ''}${disabled ? ' file-upload-field__dropzone--disabled' : ''}`}
        >
          <Upload size={20} aria-hidden="true" />
          <strong>{emptyLabel}</strong>
          {emptyHint ? <span>{emptyHint}</span> : null}
        </label>
      ) : null}

      {file ? (
        <div className="file-upload-field__selected-stack">
          {showInlinePreview && canPreviewSelectedAttachment ? (
            <div
              className={`file-upload-field__preview${isPdfAttachment(file) ? ' file-upload-field__preview--pdf' : ' file-upload-field__preview--image'}`}
            >
              {isPdfAttachment(file) ? (
                <iframe title={`${attachmentName} preview`} src={previewUrl} />
              ) : (
                <img src={previewUrl} alt={`${attachmentName} preview`} />
              )}
            </div>
          ) : showInlinePreview ? (
            <div
              className="file-upload-field__preview file-upload-field__preview--document"
              role="group"
              aria-label={`${attachmentName} preview`}
            >
              <span className="file-upload-field__preview-icon">
                {isImageAttachment(file) ? (
                  <FileImage size={24} aria-hidden="true" />
                ) : (
                  <FileText size={24} aria-hidden="true" />
                )}
              </span>
              <div className="file-upload-field__preview-copy">
                <strong>{attachmentName}</strong>
                <p>{attachmentTypeLabel}</p>
                <p>{file.sizeLabel || formatFileSize(file.sizeBytes ?? file.size)}</p>
              </div>
            </div>
          ) : null}

          <div className="file-upload-field__selected">
            <div className="file-upload-field__file-meta">
              <span className="file-upload-field__file-icon">
                <FileText size={16} aria-hidden="true" />
              </span>
              <div>
                <strong>{attachmentName}</strong>
                <p>
                  {attachmentTypeLabel} ·{' '}
                  {file.sizeLabel || formatFileSize(file.sizeBytes ?? file.size)}
                </p>
              </div>
            </div>
            <div className="file-upload-field__actions">
              <button
                type="button"
                className="button button--secondary file-upload-field__replace"
                onClick={handleReplace}
                aria-label={`Replace ${attachmentName}`}
                disabled={disabled}
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>{replaceLabel}</span>
              </button>
              <button
                type="button"
                className="button button--ghost file-upload-field__remove"
                onClick={onRemove}
                aria-label={`${removeLabel} ${attachmentName}`}
                disabled={disabled}
              >
                <X size={14} aria-hidden="true" />
                <span>{removeLabel}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p id={`${id}-error`} className="form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default FileUploadField
