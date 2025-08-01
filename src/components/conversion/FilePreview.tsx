import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui';

export interface FilePreviewProps {
  file: File;
  previewUrl?: string;
  className?: string;
  onError?: (error: Error) => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  previewUrl,
  className = '',
  onError,
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (previewUrl) {
      setThumbnailUrl(previewUrl);
      setIsLoading(false);
      return;
    }
    
    // For HEIC files, we can't generate a preview directly in the browser
    // This would typically be handled by the conversion service
    if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.match(/\.(heic|heif)$/i)) {
      setIsLoading(false);
      setError('HEIC preview requires conversion');
      return;
    }
    
    // For other image types, create a preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        setThumbnailUrl(e.target?.result as string);
        setIsLoading(false);
      };
      
      reader.onerror = () => {
        setError('Failed to load preview');
        setIsLoading(false);
        if (onError) {
          onError(new Error('Failed to load file preview'));
        }
      };
      
      reader.readAsDataURL(file);
      
      return () => {
        reader.abort();
      };
    }
  }, [file, previewUrl, onError]);
  
  const formatFileInfo = () => {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const extension = file.name.split('.').pop()?.toUpperCase() || 'Unknown';
    return `${extension} • ${sizeInMB} MB`;
  };
  
  return (
    <Card className={className} variant="bordered">
      <CardContent className="p-4">
        <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="animate-spin h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}
          
          {!isLoading && thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt={file.name}
              className="w-full h-full object-contain"
            />
          )}
          
          {!isLoading && !thumbnailUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-500">
                  {error || 'No preview available'}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-3">
          <h4 className="text-sm font-medium text-gray-900 truncate" title={file.name}>
            {file.name}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {formatFileInfo()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export interface FilePreviewGridProps {
  files: Array<{
    file: File;
    previewUrl?: string;
  }>;
  className?: string;
  onError?: (file: File, error: Error) => void;
}

export const FilePreviewGrid: React.FC<FilePreviewGridProps> = ({
  files,
  className = '',
  onError,
}) => {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 ${className}`}>
      {files.map((item, index) => (
        <FilePreview
          key={`${item.file.name}-${index}`}
          file={item.file}
          previewUrl={item.previewUrl}
          onError={(error) => onError?.(item.file, error)}
        />
      ))}
    </div>
  );
};