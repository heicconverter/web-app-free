# API Routes Plan for HEIC Converter

## Overview
This document outlines the planned API route structure for the HEIC converter application, designed for scalability and future feature expansion.

## Base URL Structure
- Development: `http://localhost:3000/api`
- Production: `https://[domain]/api`
- API Version: `/v1` (future versioning support)

## Core API Routes

### 1. Conversion Routes

#### POST `/api/convert`
- **Description**: Convert HEIC/HEIF images to other formats
- **Authentication**: None (public access)
- **Rate Limiting**: 50 requests per minute per IP
- **Request Body**:
  ```typescript
  {
    file: File | Blob,
    format: 'jpeg' | 'png' | 'webp',
    quality?: number, // 0-100, default: 85
    maxWidth?: number,
    maxHeight?: number,
    preserveMetadata?: boolean
  }
  ```
- **Response**:
  ```typescript
  {
    success: boolean,
    data?: {
      url: string, // Temporary download URL
      filename: string,
      format: string,
      size: number,
      dimensions: { width: number, height: number }
    },
    error?: string
  }
  ```

#### POST `/api/convert/batch`
- **Description**: Convert multiple HEIC files in a single request
- **Authentication**: None (public access)
- **Rate Limiting**: 10 requests per minute per IP
- **Request Body**:
  ```typescript
  {
    files: File[] | Blob[],
    format: 'jpeg' | 'png' | 'webp',
    quality?: number,
    options?: ConversionOptions
  }
  ```
- **Response**:
  ```typescript
  {
    success: boolean,
    data?: {
      conversions: ConversionResult[],
      downloadUrl?: string // ZIP file URL for batch download
    },
    error?: string
  }
  ```

### 2. File Management Routes

#### GET `/api/files/:id`
- **Description**: Retrieve converted file by ID
- **Authentication**: None (temporary URLs with expiration)
- **Rate Limiting**: 100 requests per minute per IP
- **Response**: Binary file data or redirect to CDN

#### DELETE `/api/files/:id`
- **Description**: Delete a converted file
- **Authentication**: Session token or file ownership verification
- **Rate Limiting**: 50 requests per minute per IP

### 3. User Routes (Future Enhancement)

#### POST `/api/auth/register`
- **Description**: User registration for premium features
- **Authentication**: None
- **Rate Limiting**: 5 requests per hour per IP
- **Request Body**:
  ```typescript
  {
    email: string,
    password: string,
    name?: string
  }
  ```

#### POST `/api/auth/login`
- **Description**: User authentication
- **Authentication**: None
- **Rate Limiting**: 10 requests per hour per IP
- **Request Body**:
  ```typescript
  {
    email: string,
    password: string
  }
  ```

#### POST `/api/auth/logout`
- **Description**: End user session
- **Authentication**: Bearer token
- **Rate Limiting**: 50 requests per minute per user

#### GET `/api/user/profile`
- **Description**: Get user profile and usage statistics
- **Authentication**: Bearer token
- **Rate Limiting**: 100 requests per minute per user

#### PUT `/api/user/profile`
- **Description**: Update user profile
- **Authentication**: Bearer token
- **Rate Limiting**: 20 requests per minute per user

### 4. Subscription Routes (Future Enhancement)

#### GET `/api/subscription/plans`
- **Description**: List available subscription plans
- **Authentication**: None
- **Rate Limiting**: 100 requests per minute per IP

#### POST `/api/subscription/create`
- **Description**: Create new subscription
- **Authentication**: Bearer token
- **Rate Limiting**: 5 requests per hour per user

#### POST `/api/subscription/cancel`
- **Description**: Cancel active subscription
- **Authentication**: Bearer token
- **Rate Limiting**: 5 requests per hour per user

### 5. Analytics Routes (Future Enhancement)

#### GET `/api/analytics/usage`
- **Description**: Get conversion usage statistics
- **Authentication**: Bearer token (admin only)
- **Rate Limiting**: 50 requests per minute per user

#### GET `/api/analytics/performance`
- **Description**: Get system performance metrics
- **Authentication**: Bearer token (admin only)
- **Rate Limiting**: 50 requests per minute per user

### 6. Health Check Routes

#### GET `/api/health`
- **Description**: Basic health check
- **Authentication**: None
- **Rate Limiting**: 1000 requests per minute per IP
- **Response**:
  ```typescript
  {
    status: 'healthy' | 'degraded' | 'unhealthy',
    timestamp: string,
    version: string
  }
  ```

#### GET `/api/health/detailed`
- **Description**: Detailed system health check
- **Authentication**: API key (monitoring services)
- **Rate Limiting**: 100 requests per minute per API key
- **Response**:
  ```typescript
  {
    status: string,
    services: {
      database: ServiceStatus,
      storage: ServiceStatus,
      converter: ServiceStatus
    },
    metrics: {
      cpu: number,
      memory: number,
      activeConversions: number
    }
  }
  ```

## Authentication Strategy

### Public Access
- Conversion endpoints are public with rate limiting
- Temporary file URLs expire after 1 hour

### User Authentication (Future)
- JWT Bearer tokens with 24-hour expiration
- Refresh tokens with 30-day expiration
- OAuth2 integration (Google, GitHub)

### API Key Authentication (Future)
- For programmatic access and integrations
- Different tiers with varying rate limits
- Usage tracking and billing integration

## Rate Limiting Strategy

### Implementation
- Redis-based rate limiting with sliding window
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Tiers
1. **Anonymous**: Basic limits for public endpoints
2. **Authenticated**: Higher limits for registered users
3. **Premium**: Increased limits for paid subscriptions
4. **Enterprise**: Custom limits with SLA

### Rate Limit Response
```typescript
{
  error: 'Rate limit exceeded',
  retryAfter: number, // seconds
  limit: number,
  remaining: 0,
  reset: string // ISO timestamp
}
```

## Error Handling

### Standard Error Response
```typescript
{
  success: false,
  error: {
    code: string, // e.g., 'INVALID_FORMAT', 'FILE_TOO_LARGE'
    message: string,
    details?: any
  },
  timestamp: string,
  requestId: string
}
```

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `413`: Payload Too Large
- `429`: Too Many Requests
- `500`: Internal Server Error
- `503`: Service Unavailable

## Security Considerations

### Input Validation
- File type verification (magic bytes)
- File size limits (50MB default, 200MB for premium)
- Sanitization of file names and metadata

### CORS Policy
```typescript
{
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

## Monitoring and Logging

### Metrics to Track
- Conversion success/failure rates
- Average conversion time
- File sizes and formats
- API endpoint usage
- Error rates by type

### Logging Strategy
- Structured JSON logs
- Request/response logging (sanitized)
- Error tracking with stack traces
- Performance metrics

## Future Expansion Plans

### v2 Features
- WebSocket support for real-time conversion progress
- Webhook notifications for batch conversions
- Advanced image manipulation (crop, rotate, filters)
- PDF to image conversion
- Video frame extraction

### v3 Features
- AI-powered image enhancement
- Cloud storage integration (S3, Google Cloud, Azure)
- Team collaboration features
- White-label API solution

## API Documentation

### OpenAPI/Swagger
- Auto-generated from route definitions
- Interactive API explorer at `/api/docs`
- Downloadable OpenAPI spec at `/api/openapi.json`

### SDK Support
- TypeScript/JavaScript SDK
- Python SDK
- Go SDK
- CLI tool

## Performance Optimization

### Caching Strategy
- CDN for converted files
- Redis cache for frequent conversions
- Browser cache headers for static assets

### Scalability
- Horizontal scaling with load balancer
- Queue-based processing for large batches
- Microservice architecture for conversion engine
- Auto-scaling based on queue depth

## Compliance and Legal

### GDPR Compliance
- Automatic file deletion after 24 hours
- No permanent storage of user files
- Data processing agreement for enterprise

### Terms of Service
- Acceptable use policy
- File size and rate limits
- Prohibited content types
- Copyright compliance