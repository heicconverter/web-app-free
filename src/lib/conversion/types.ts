export type ImageFormat = 'jpeg' | 'png' | 'webp';

export interface ConversionOptions {
  format: ImageFormat;
  quality?: number; // 0-100, applicable for JPEG and WebP
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
  backgroundColor?: string; // For transparent images converted to JPEG
}

export interface ConversionResult {
  blob: Blob;
  url: string;
  format: ImageFormat;
  width: number;
  height: number;
  size: number;
}

export interface ConversionError {
  code:
    | 'UNSUPPORTED_FORMAT'
    | 'CONVERSION_FAILED'
    | 'FILE_TOO_LARGE'
    | 'INVALID_OPTIONS';
  message: string;
  details?: unknown;
}

export interface ConversionProgress {
  phase: 'reading' | 'decoding' | 'processing' | 'encoding' | 'complete';
  progress: number; // 0-100
  message?: string;
}

export type ConversionProgressCallback = (progress: ConversionProgress) => void;

export interface HeicDecoder {
  decode(file: File | Blob): Promise<ImageData>;
  isSupported(): boolean;
}

export interface ImageProcessor {
  process(
    imageData: ImageData,
    options: ConversionOptions,
    onProgress?: ConversionProgressCallback
  ): Promise<ConversionResult>;
}
