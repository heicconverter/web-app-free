// Re-export types from lib
export type {
  ImageFormat,
  ConversionOptions,
  ConversionResult,
  ConversionError,
  ConversionProgress,
  ConversionProgressCallback,
  HeicDecoder,
  ImageProcessor,
} from '../lib/conversion/types';

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// File handling types
export interface FileWithPreview extends File {
  preview?: string;
}

export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'uploading' | 'uploaded' | 'error';
  error?: string;
}

// Application state types
export interface AppState {
  files: UploadedFile[];
  conversions: ConversionQueueItem[];
  settings: AppSettings;
}

export interface ConversionQueueItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  outputFormat: import('../lib/conversion/types').ImageFormat;
  result?: import('../lib/conversion/types').ConversionResult;
  error?: import('../lib/conversion/types').ConversionError;
}

export interface AppSettings {
  defaultOutputFormat: import('../lib/conversion/types').ImageFormat;
  defaultQuality: number;
  autoDownload: boolean;
  theme: 'light' | 'dark' | 'system';
}

// Database types
export * from './database';