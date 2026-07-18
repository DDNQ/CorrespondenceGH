import { FileText, Upload, X } from 'lucide-react'

function formatFileSize(sizeInBytes) {
  if (!sizeInBytes) {
    return '0 KB'
  }

  if (sizeInBytes >= 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`
}

function FileUploadField({ id, file, error, accept, inputRef, onChange, onRemove }) {
  return (
    <div className="file-upload-field">
      <input
        ref={inputRef}
        id={id}
        type="file"
        className="sr-only"
        accept={accept}
        onChange={onChange}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
      />
      <label htmlFor={id} className={`file-upload-field__dropzone${error ? ' file-upload-field__dropzone--error' : ''}`}>
        <Upload size={20} aria-hidden="true" />
        <strong>Choose a document</strong>
        <span>PDF, Word or image files up to 10 MB</span>
      </label>

      {file ? (
        <div className="file-upload-field__selected">
          <div className="file-upload-field__file-meta">
            <span className="file-upload-field__file-icon">
              <FileText size={16} aria-hidden="true" />
            </span>
            <div>
              <strong>{file.name}</strong>
              <p>{formatFileSize(file.size)}</p>
            </div>
          </div>
          <button type="button" className="button button--ghost file-upload-field__remove" onClick={onRemove}>
            <X size={14} aria-hidden="true" />
            <span>Remove</span>
          </button>
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
