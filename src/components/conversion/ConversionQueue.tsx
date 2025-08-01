import React from 'react';
import { Card, CardContent, Progress, Button } from '../ui';

export interface ConversionItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  outputFormat: 'jpeg' | 'png' | 'webp';
  error?: string;
  outputUrl?: string;
}

export interface ConversionQueueProps {
  items: ConversionItem[];
  onRemoveItem: (id: string) => void;
  onRetryItem: (id: string) => void;
  onDownloadItem: (id: string) => void;
  className?: string;
}

export const ConversionQueue: React.FC<ConversionQueueProps> = ({
  items,
  onRemoveItem,
  onRetryItem,
  onDownloadItem,
  className = '',
}) => {
  const getStatusIcon = (status: ConversionItem['status']) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="animate-spin w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  if (items.length === 0) {
    return (
      <Card className={className}>
        <CardContent>
          <div className="text-center py-8">
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-4 text-sm text-gray-600">
              No files in conversion queue
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item) => (
        <Card key={item.id} variant="bordered">
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                {getStatusIcon(item.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {item.file.name}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {formatFileSize(item.file.size)}
                  </span>
                </div>
                
                <div className="mt-1 flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    To {item.outputFormat.toUpperCase()}
                  </span>
                  {item.status === 'processing' && (
                    <span className="text-xs text-blue-600">
                      {item.progress}%
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span className="text-xs text-red-600">
                      {item.error || 'Conversion failed'}
                    </span>
                  )}
                </div>
                
                {item.status === 'processing' && (
                  <div className="mt-2">
                    <Progress
                      value={item.progress}
                      size="sm"
                      variant="default"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0 flex items-center space-x-2">
                {item.status === 'completed' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onDownloadItem(item.id)}
                  >
                    Download
                  </Button>
                )}
                
                {item.status === 'error' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRetryItem(item.id)}
                  >
                    Retry
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveItem(item.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};