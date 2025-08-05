import React, { useCallback, useState } from 'react';

export interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  acceptedFormats?: string[];
  maxFileSize?: number;
  multiple?: boolean;
  className?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesSelected,
  acceptedFormats = ['.heic', '.heif'],
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  multiple = true,
  className = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const validateFiles = (files: File[]): File[] => {
    setError(null);
    const validFiles: File[] = [];
    
    for (const file of files) {
      const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      
      if (!acceptedFormats.some(format => extension === format.toLowerCase())) {
        setError(`Invalid file format. Accepted formats: ${acceptedFormats.join(', ')}`);
        continue;
      }
      
      if (file.size > maxFileSize) {
        setError(`File size exceeds ${maxFileSize / (1024 * 1024)}MB limit`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    return validFiles;
  };
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = validateFiles(files);
    
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [onFilesSelected, maxFileSize, acceptedFormats]);
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files);
    const validFiles = validateFiles(files);
    
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [onFilesSelected, maxFileSize, acceptedFormats]);
  
  const inputId = `file-upload-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={className}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input
          id={inputId}
          type="file"
          accept={acceptedFormats.join(',')}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        
        <div className="mt-4">
          <label htmlFor={inputId} className="cursor-pointer">
            <span className="inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 px-4 py-2 text-base">
              Select files
            </span>
          </label>
          <p className="mt-2 text-sm text-gray-600">
            or drag and drop
          </p>
        </div>
        
        <p className="mt-2 text-xs text-gray-500">
          {acceptedFormats.join(', ')} up to {maxFileSize / (1024 * 1024)}MB
        </p>
      </div>
      
      {error && (
        <div className="mt-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};