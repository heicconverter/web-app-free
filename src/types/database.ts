export type UUID = string;
export type Timestamp = Date;
export type JSON = Record<string, unknown>;

// Enums
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';
export type BillingCycle = 'monthly' | 'yearly';
export type PaymentProvider = 'stripe' | 'paypal';
export type PaymentMethodType = 'card' | 'bank_account' | 'digital_wallet';
export type PaymentStatus = 'succeeded' | 'failed' | 'pending' | 'cancelled';
export type ConversionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';
export type ErrorLevel = 'error' | 'warning' | 'info';
export type ExportType = 'full' | 'partial' | 'specific';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type DeletionType = 'account' | 'data' | 'specific';
export type DeletionStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Core User Management
export interface User {
  id: UUID;
  email: string;
  name: string;
  passwordHash: string;
  avatarUrl?: string;
  emailVerifiedAt?: Timestamp;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  gdprConsentVersion: string;
  gdprConsentAt: Timestamp;
  marketingConsent: boolean;
  dataRetentionUntil?: Timestamp;
}

export interface UserPreferences {
  id: UUID;
  userId: UUID;
  conversionDefaults?: JSON;
  uiPreferences?: JSON;
  notificationSettings?: JSON;
  timezone: string;
  language: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Subscription & Billing
export interface SubscriptionTier {
  id: UUID;
  name: string;
  slug: string;
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  maxConversionsPerMonth: number;
  maxFileSizeMb: number;
  maxBatchSize: number;
  priorityProcessing: boolean;
  apiAccess: boolean;
  features?: JSON;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserSubscription {
  id: UUID;
  userId: UUID;
  subscriptionTierId: UUID;
  status: SubscriptionStatus;
  startedAt: Timestamp;
  endsAt: Timestamp;
  cancelledAt?: Timestamp;
  billingCycle: BillingCycle;
  amountPaid: number;
  currency: string;
  metadata?: JSON;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PaymentMethod {
  id: UUID;
  userId: UUID;
  provider: PaymentProvider;
  providerPaymentMethodId: string;
  type: PaymentMethodType;
  lastFour?: string;
  brand?: string;
  expiresAt?: Timestamp;
  isDefault: boolean;
  isActive: boolean;
  metadata?: JSON;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Payment {
  id: UUID;
  userId: UUID;
  subscriptionId: UUID;
  paymentMethodId: UUID;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description?: string;
  providerResponse?: JSON;
  processedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// API Management
export interface ApiKey {
  id: UUID;
  userId: UUID;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: JSON;
  rateLimitPerHour: number;
  lastUsedAt?: Timestamp;
  expiresAt?: Timestamp;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// File Processing
export interface ConversionJob {
  id: UUID;
  userId: UUID;
  batchId?: string;
  originalFilename: string;
  originalFileHash: string;
  originalFileSize: number;
  originalMimeType: string;
  targetFormat: string;
  conversionOptions?: JSON;
  status: ConversionStatus;
  outputFilename?: string;
  outputFileHash?: string;
  outputFileSize?: number;
  outputMimeType?: string;
  storagePath?: string;
  processingTimeSeconds?: number;
  errorMessage?: string;
  metadata?: JSON;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Analytics & Monitoring
export interface UsageAnalytics {
  id: UUID;
  userId: UUID;
  conversionJobId?: UUID;
  eventType: string;
  eventData?: JSON;
  userAgent?: string;
  ipAddress?: string;
  countryCode?: string;
  createdAt: Timestamp;
}

export interface ErrorLog {
  id: UUID;
  userId?: UUID;
  conversionJobId?: UUID;
  errorLevel: ErrorLevel;
  errorCode?: string;
  errorMessage: string;
  errorContext?: JSON;
  stackTrace?: string;
  userAgent?: string;
  ipAddress?: string;
  isResolved: boolean;
  createdAt: Timestamp;
}

// GDPR Compliance
export interface DataExport {
  id: UUID;
  userId: UUID;
  exportType: ExportType;
  status: ExportStatus;
  filePath?: string;
  requestedAt: Timestamp;
  completedAt?: Timestamp;
  expiresAt: Timestamp;
  createdAt: Timestamp;
}

export interface DataDeletion {
  id: UUID;
  userId: UUID;
  deletionType: DeletionType;
  status: DeletionStatus;
  affectedTables: JSON;
  reason?: string;
  requestedAt: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
}

// Database Relations
export interface UserWithSubscription extends User {
  subscription?: UserSubscription;
  subscriptionTier?: SubscriptionTier;
}

export interface ConversionJobWithUser extends ConversionJob {
  user: User;
}

export interface SubscriptionWithTier extends UserSubscription {
  tier: SubscriptionTier;
}

// Request/Response Types
export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  gdprConsentVersion: string;
  marketingConsent?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  avatarUrl?: string;
  marketingConsent?: boolean;
}

export interface CreateConversionJobRequest {
  originalFilename: string;
  originalFileHash: string;
  originalFileSize: number;
  originalMimeType: string;
  targetFormat: string;
  conversionOptions?: JSON;
  batchId?: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
  rateLimitPerHour?: number;
  expiresAt?: Timestamp;
}

export interface CreateSubscriptionRequest {
  subscriptionTierId: UUID;
  billingCycle: BillingCycle;
  paymentMethodId: UUID;
}

// Database Query Filters
export interface UserFilters {
  isActive?: boolean;
  emailVerified?: boolean;
  hasSubscription?: boolean;
  subscriptionStatus?: SubscriptionStatus;
  createdAfter?: Timestamp;
  createdBefore?: Timestamp;
}

export interface ConversionJobFilters {
  userId?: UUID;
  status?: ConversionStatus;
  targetFormat?: string;
  batchId?: string;
  createdAfter?: Timestamp;
  createdBefore?: Timestamp;
  expiresAfter?: Timestamp;
}

export interface PaymentFilters {
  userId?: UUID;
  status?: PaymentStatus;
  provider?: PaymentProvider;
  amountMin?: number;
  amountMax?: number;
  processedAfter?: Timestamp;
  processedBefore?: Timestamp;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Common Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: JSON;
  };
  metadata?: JSON;
}

// Database Connection Types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
}

// Migration Types
export interface Migration {
  id: string;
  name: string;
  timestamp: Timestamp;
  checksum: string;
}

export interface MigrationResult {
  success: boolean;
  migrationsRun: string[];
  errors?: string[];
}
