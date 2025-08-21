'use client';

import React, { useState } from 'react';
import DropZone from '../../components/ui/DropZone';
import styles from '../../components/ui/DropZone.module.css';

export default function TestDropZonePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState<Array<{ name: string; url: string }>>([]);

  const handleDrop = (droppedFiles: File[]) => {
    console.log('Files dropped:', droppedFiles);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleClear = () => {
    setFiles([]);
    setConvertedFiles([]);
  };

  const handleConvert = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    
    // Simulate conversion process
    setTimeout(() => {
      const converted = files.map((file) => ({
        name: file.name.replace(/\.(heic|heif)$/i, '.jpg'),
        url: URL.createObjectURL(file), // In real app, this would be the converted blob
      }));
      setConvertedFiles(converted);
      setIsProcessing(false);
    }, 2000);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '40px', textAlign: 'center' }}>
        DropZone Component Test
      </h1>

      <div style={{ display: 'grid', gap: '40px', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))' }}>
        {/* Default DropZone */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
            Default DropZone
          </h2>
          <DropZone 
            onDrop={handleDrop}
            className={styles.dropzone}
          />
        </div>

        {/* Custom DropZone */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
            Custom DropZone (Single File, HEIC/HEIF Only)
          </h2>
          <DropZone 
            onDrop={handleDrop}
            accept=".heic,.heif"
            multiple={false}
            maxSize={10 * 1024 * 1024} // 10MB
            className={styles.dropzone}
          >
            <div>
              <svg
                className={styles.uploadIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p className={styles.title}>Drop HEIC/HEIF Files Here</p>
              <p className={styles.subtitle}>Single file only, max 10MB</p>
              <button className={styles.button}>Select File</button>
            </div>
          </DropZone>
        </div>

        {/* Disabled DropZone */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
            Disabled DropZone
          </h2>
          <DropZone 
            onDrop={handleDrop}
            disabled={isProcessing}
            className={styles.dropzone}
          >
            <div style={{ opacity: isProcessing ? 0.5 : 1 }}>
              {isProcessing ? (
                <>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                  }} />
                  <p className={styles.title}>Processing...</p>
                  <p className={styles.subtitle}>Please wait while we convert your files</p>
                </>
              ) : (
                <>
                  <p className={styles.title}>Drop Zone Disabled During Processing</p>
                  <p className={styles.subtitle}>Try converting files to see this in action</p>
                </>
              )}
            </div>
          </DropZone>
        </div>

        {/* Small DropZone */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
            Compact DropZone
          </h2>
          <div style={{ maxWidth: '300px' }}>
            <DropZone 
              onDrop={handleDrop}
              className={styles.dropzone}
            >
              <div style={{ padding: '0' }}>
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ margin: '0 auto 12px', opacity: 0.5 }}
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                <p style={{ fontSize: '14px', fontWeight: '500' }}>Add Files</p>
              </div>
            </DropZone>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600' }}>
              Selected Files ({files.length})
            </h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleClear}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Clear All
              </button>
              <button
                onClick={handleConvert}
                disabled={isProcessing}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isProcessing ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {isProcessing ? 'Converting...' : 'Convert All'}
              </button>
            </div>
          </div>

          <div className={styles.fileList}>
            {files.map((file, index) => (
              <div key={index} className={styles.fileItem}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                <span style={{ 
                  marginLeft: '12px',
                  padding: '2px 8px',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}>
                  {file.type || 'image/heic'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Converted Files */}
      {convertedFiles.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
            Converted Files ({convertedFiles.length})
          </h2>
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {convertedFiles.map((file, index) => (
              <div key={index} style={{
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                textAlign: 'center',
              }}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  style={{ margin: '0 auto 12px' }}
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>{file.name}</p>
                <a
                  href={file.url}
                  download={file.name}
                  style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontSize: '12px',
                  }}
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}