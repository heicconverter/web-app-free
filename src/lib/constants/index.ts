export const SUPPORTED_INPUT_FORMATS = ['.heic', '.heif'] as const;

export const SUPPORTED_OUTPUT_FORMATS = [
  { value: 'jpeg', label: 'JPEG', extension: '.jpg' },
  { value: 'png', label: 'PNG', extension: '.png' },
  { value: 'webp', label: 'WebP', extension: '.webp' },
] as const;

export const DEFAULT_CONVERSION_OPTIONS = {
  format: 'jpeg' as const,
  quality: 85,
  maintainAspectRatio: true,
  backgroundColor: '#ffffff',
};

export const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_TOTAL_SIZE: 200 * 1024 * 1024, // 200MB for all files combined
  MAX_FILES_COUNT: 50,
} as const;

export const CONVERSION_PHASES = {
  READING: 'reading',
  DECODING: 'decoding',
  PROCESSING: 'processing',
  ENCODING: 'encoding',
  COMPLETE: 'complete',
} as const;

export const ERROR_CODES = {
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  CONVERSION_FAILED: 'CONVERSION_FAILED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_OPTIONS: 'INVALID_OPTIONS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
} as const;

export const ERROR_MESSAGES = {
  [ERROR_CODES.UNSUPPORTED_FORMAT]: 'The file format is not supported',
  [ERROR_CODES.CONVERSION_FAILED]: 'Failed to convert the image',
  [ERROR_CODES.FILE_TOO_LARGE]: 'File size exceeds the maximum limit',
  [ERROR_CODES.INVALID_OPTIONS]: 'Invalid conversion options provided',
  [ERROR_CODES.NETWORK_ERROR]: 'Network error occurred during conversion',
  [ERROR_CODES.QUOTA_EXCEEDED]: 'Conversion quota exceeded',
} as const;

export const MIME_TYPES = {
  heic: 'image/heic',
  heif: 'image/heif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const;

export const QUALITY_PRESETS = {
  low: { jpeg: 60, webp: 50 },
  medium: { jpeg: 80, webp: 75 },
  high: { jpeg: 90, webp: 85 },
  maximum: { jpeg: 95, webp: 90 },
} as const;
