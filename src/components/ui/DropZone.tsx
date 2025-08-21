import React, { useCallback, useState } from 'react';

interface DropZoneProps {
  onDrop: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onDrop,
  accept = '.heic,.heif,image/*',
  multiple = true,
  maxSize = 50 * 1024 * 1024, // 50MB default
  disabled = false,
  className = '',
  children,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(false);
      }
    },
    [disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const valid: File[] = [];
      const errors: string[] = [];

      files.forEach((file) => {
        if (maxSize && file.size > maxSize) {
          errors.push(
            `${file.name} exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`
          );
        } else if (
          accept &&
          !accept.split(',').some((type) => {
            const trimmed = type.trim();
            if (trimmed.startsWith('.')) {
              return file.name.toLowerCase().endsWith(trimmed.toLowerCase());
            }
            if (trimmed.includes('*')) {
              const prefix = trimmed.split('*')[0];
              return file.type.startsWith(prefix);
            }
            return file.type === trimmed;
          })
        ) {
          errors.push(`${file.name} is not an accepted file type`);
        } else {
          valid.push(file);
        }
      });

      return { valid, errors };
    },
    [accept, maxSize]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      const filesToProcess = multiple ? droppedFiles : droppedFiles.slice(0, 1);

      const { valid, errors } = validateFiles(filesToProcess);

      if (errors.length > 0) {
        setError(errors.join(', '));
        setTimeout(() => setError(null), 5000);
      }

      if (valid.length > 0) {
        onDrop(valid);
      }
    },
    [disabled, multiple, onDrop, validateFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || !e.target.files) return;

      const selectedFiles = Array.from(e.target.files);
      const { valid, errors } = validateFiles(selectedFiles);

      if (errors.length > 0) {
        setError(errors.join(', '));
        setTimeout(() => setError(null), 5000);
      }

      if (valid.length > 0) {
        onDrop(valid);
      }

      e.target.value = '';
    },
    [disabled, onDrop, validateFiles]
  );

  return (
    <div
      className={`dropzone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''} ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragging ? '#4a90e2' : '#ccc'}`,
        borderRadius: '8px',
        padding: '40px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: isDragging ? '#f0f8ff' : 'transparent',
        transition: 'all 0.3s ease',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input
        type="file"
        id="file-input"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInput}
        disabled={disabled}
        style={{ display: 'none' }}
      />

      <label
        htmlFor="file-input"
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'block',
        }}
      >
        {children || (
          <div>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ margin: '0 auto 16px', opacity: 0.5 }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>
              {isDragging ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
              or click to select files
            </p>
            <p style={{ fontSize: '12px', color: '#999' }}>
              Accepted formats: HEIC, HEIF, and other image formats
            </p>
            {maxSize && (
              <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                Maximum file size: {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            )}
          </div>
        )}
      </label>

      {error && (
        <div
          style={{
            marginTop: '16px',
            padding: '8px 12px',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default DropZone;