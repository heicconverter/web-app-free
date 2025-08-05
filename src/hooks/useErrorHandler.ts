import { useCallback, useRef } from 'react';
import { Logger } from '../lib/logger';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logLevel?: 'error' | 'warn';
  context?: ErrorContext;
  onError?: (error: Error, context?: ErrorContext) => void;
}

export interface UseErrorHandlerReturn {
  handleError: (error: Error | string, options?: ErrorHandlerOptions) => void;
  handleAsyncError: <T>(
    asyncFn: () => Promise<T>,
    options?: ErrorHandlerOptions
  ) => Promise<T | null>;
  withErrorBoundary: <T extends (...args: unknown[]) => unknown>(
    fn: T,
    options?: ErrorHandlerOptions
  ) => T;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const errorCountRef = useRef<Map<string, number>>(new Map());

  const handleError = useCallback((
    error: Error | string,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logLevel = 'error',
      context = {},
      onError
    } = options;

    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const errorKey = `${errorObj.message}-${context.component || 'unknown'}`;
    
    // Rate limiting: don't spam the same error
    const currentCount = errorCountRef.current.get(errorKey) || 0;
    errorCountRef.current.set(errorKey, currentCount + 1);
    
    // Only log if we haven't seen this error too many times recently
    if (currentCount < 5) {
      const logContext = {
        ...context,
        stack: errorObj.stack,
        timestamp: new Date().toISOString(),
        errorCount: currentCount + 1,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      };

      if (logLevel === 'error') {
        Logger.error(errorObj.message, logContext);
      } else {
        Logger.warn(errorObj.message, logContext);
      }
    }

    // Call custom error handler if provided
    if (onError) {
      try {
        onError(errorObj, context);
      } catch (handlerError) {
        Logger.error('Error in custom error handler', { 
          originalError: errorObj.message,
          handlerError: handlerError instanceof Error ? handlerError.message : String(handlerError)
        });
      }
    }

    // Show toast notification (in a real app, you'd integrate with your toast library)
    if (showToast && typeof window !== 'undefined' && currentCount < 3) {
      console.warn('Toast would show:', errorObj.message);
    }

    // Clear error count after a timeout to allow fresh errors
    setTimeout(() => {
      errorCountRef.current.delete(errorKey);
    }, 60000); // Reset after 1 minute
  }, []);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(
        error instanceof Error ? error : new Error(String(error)),
        options
      );
      return null;
    }
  }, [handleError]);

  const withErrorBoundary = useCallback(<T extends (...args: unknown[]) => unknown>(
    fn: T,
    options: ErrorHandlerOptions = {}
  ): T => {
    return ((...args: Parameters<T>) => {
      try {
        const result = fn(...args);
        
        // Handle async functions
        if (result instanceof Promise) {
          return result.catch((error) => {
            handleError(
              error instanceof Error ? error : new Error(String(error)),
              options
            );
            throw error; // Re-throw to maintain Promise semantics
          });
        }
        
        return result;
      } catch (error) {
        handleError(
          error instanceof Error ? error : new Error(String(error)),
          options
        );
        throw error; // Re-throw to maintain function semantics
      }
    }) as T;
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
    withErrorBoundary,
  };
}

// Global error handler for unhandled errors
export function setupGlobalErrorHandling(): void {
  if (typeof window === 'undefined') return;

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    Logger.error('Unhandled promise rejection', {
      reason: event.reason,
      promise: event.promise,
      url: window.location.href,
    });
    
    // Prevent the default browser behavior
    event.preventDefault();
  });

  // Handle uncaught JavaScript errors
  window.addEventListener('error', (event) => {
    Logger.error('Uncaught JavaScript error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack,
      url: window.location.href,
    });
  });
}

// Hook for setting up global error handling
export function useGlobalErrorHandler(): void {
  const hasSetup = useRef(false);
  
  if (!hasSetup.current && typeof window !== 'undefined') {
    setupGlobalErrorHandling();
    hasSetup.current = true;
  }
}