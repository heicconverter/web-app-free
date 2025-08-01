export interface ConversionFile {
  id: string;
  file: File;
  name: string;
  size: number;
  preview?: string;
  status: 'pending' | 'converting' | 'completed' | 'error';
}

export interface ConversionProgress {
  percentage: number;
  stage: 'uploading' | 'processing' | 'downloading' | 'completed';
  message?: string;
  error?: string;
}

export interface ConversionSettings {
  outputFormat: 'jpg' | 'png' | 'webp';
  quality: number;
  resize?: {
    width?: number;
    height?: number;
    maintainAspectRatio: boolean;
  };
}

export interface ConversionResult {
  id: string;
  originalFile: ConversionFile;
  convertedBlob: Blob;
  downloadUrl: string;
  fileName: string;
}