/**
 * ============================================================
 * FileUploadInput.jsx — Resume file upload component
 * ============================================================
 *
 * A styled, accessible drag-and-drop file input for uploading
 * a candidate's resume. Supports:
 *   • Click-to-select via hidden <input type="file">
 *   • Drag-and-drop with visual feedback
 *   • File type validation (PDF, DOC, DOCX)
 *   • File size validation (max 5 MB)
 *   • Clear/reset
 *
 * PROPS
 * ─────
 *   onFileSelect(file)  — called when a valid file is chosen
 *   selectedFile        — currently selected File object (or null)
 *   disabled            — disables the input (e.g. while uploading)
 *
 * WHY NOT set Content-Type manually?
 * ────────────────────────────────────
 * When you pass a FormData object to axios, the browser automatically
 * sets Content-Type to `multipart/form-data; boundary=<...>`.
 * The boundary string is auto-generated and critical — if you manually
 * set Content-Type: 'multipart/form-data', the boundary is missing and
 * the server cannot parse the request body.
 * ============================================================
 */
import { useRef, useState } from 'react'

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx'
const MAX_SIZE_MB = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

const FileUploadInput = ({ onFileSelect, selectedFile, disabled = false }) => {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)

  const validate = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Only PDF, DOC, or DOCX files are accepted.'
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File is too large. Maximum size is ${MAX_SIZE_MB} MB.`
    }
    return null
  }

  const handleFile = (file) => {
    setError(null)
    const validationError = validate(file)
    if (validationError) {
      setError(validationError)
      return
    }
    onFileSelect(file)
  }

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so same file can be re-selected after a clear
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleClear = (e) => {
    e.stopPropagation()
    setError(null)
    onFileSelect(null)
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const getFileIcon = (type) => {
    if (type === 'application/pdf') return '📄'
    return '📝'
  }

  const isActive = isDragging && !disabled

  return (
    <div>
      {/* ── Drop zone ─────────────────────────────────────────────────────── */}
      <div
        id="resume-upload-zone"
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload resume — click or drag and drop"
        style={{
          ...dropZoneStyles.base,
          ...(isActive ? dropZoneStyles.dragging : {}),
          ...(selectedFile ? dropZoneStyles.hasFile : {}),
          ...(disabled ? dropZoneStyles.disabled : {}),
          ...(error ? dropZoneStyles.error : {}),
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          style={{ display: 'none' }}
          onChange={handleInputChange}
          disabled={disabled}
          aria-hidden="true"
        />

        {selectedFile ? (
          /* ── Selected file preview ─────────────────────────────────── */
          <div style={dropZoneStyles.filePreview}>
            <span style={{ fontSize: '1.75rem' }}>{getFileIcon(selectedFile.type)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={dropZoneStyles.fileName}>{selectedFile.name}</p>
              <p style={dropZoneStyles.fileMeta}>{formatSize(selectedFile.size)}</p>
            </div>
            {!disabled && (
              <button
                id="resume-clear-btn"
                type="button"
                style={dropZoneStyles.clearBtn}
                onClick={handleClear}
                title="Remove file"
                aria-label="Remove selected file"
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          /* ── Empty state ────────────────────────────────────────────── */
          <div style={dropZoneStyles.emptyState}>
            <span style={{ fontSize: '2rem' }}>{isActive ? '📂' : '📎'}</span>
            <p style={dropZoneStyles.emptyTitle}>
              {isActive ? 'Drop it here!' : 'Drop your resume or click to browse'}
            </p>
            <p style={dropZoneStyles.emptyHint}>
              PDF, DOC, or DOCX · Max {MAX_SIZE_MB} MB
            </p>
          </div>
        )}
      </div>

      {/* ── Validation error ──────────────────────────────────────────────── */}
      {error && (
        <p style={dropZoneStyles.errorMsg} role="alert" aria-live="polite">
          ⚠ {error}
        </p>
      )}
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const dropZoneStyles = {
  base: {
    border: '2px dashed #cbd5e1',
    borderRadius: '12px',
    padding: '1.5rem',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
    background: '#f8fafc',
    userSelect: 'none',
    outline: 'none',
  },
  dragging: {
    borderColor: '#6366f1',
    background: '#eef2ff',
  },
  hasFile: {
    borderColor: '#a3e635',
    background: '#f7fee7',
    borderStyle: 'solid',
  },
  disabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
  },
  error: {
    borderColor: '#fca5a5',
    background: '#fef2f2',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
  },
  emptyTitle: {
    margin: 0,
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#475569',
  },
  emptyHint: {
    margin: 0,
    fontSize: '0.775rem',
    color: '#94a3b8',
  },
  filePreview: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  fileName: {
    margin: 0,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#1e293b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileMeta: {
    margin: '2px 0 0',
    fontSize: '0.775rem',
    color: '#64748b',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    fontSize: '1rem',
    padding: '4px',
    lineHeight: 1,
    borderRadius: '4px',
    flexShrink: 0,
  },
  errorMsg: {
    marginTop: '0.5rem',
    fontSize: '0.8rem',
    color: '#dc2626',
    margin: '0.4rem 0 0',
  },
}

export default FileUploadInput
