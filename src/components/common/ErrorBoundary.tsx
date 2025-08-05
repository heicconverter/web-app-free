import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '../ui';
import { Logger } from '../../lib/logger';
import { ErrorContext } from '../../hooks/useErrorHandler';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: ErrorContext;
  isolate?: boolean;
  maxRetries?: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      errorInfo,
    });

    const context = {
      ...this.props.context,
      errorBoundary: true,
      errorId: this.state.errorId,
      retryCount: this.state.retryCount,
      isolated: this.props.isolate || false,
    };

    Logger.error('ErrorBoundary caught an error', { 
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context,
    });

    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        Logger.error('Error in ErrorBoundary onError handler', {
          originalError: error.message,
          handlerError: handlerError instanceof Error ? handlerError.message : String(handlerError),
        });
      }
    }

    // Auto-retry logic for transient errors
    if (this.shouldAutoRetry(error)) {
      this.scheduleAutoRetry();
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private shouldAutoRetry(error: Error): boolean {
    const maxRetries = this.props.maxRetries ?? 3;
    if (this.state.retryCount >= maxRetries) {
      return false;
    }

    // List of error messages that might be transient
    const transientErrors = [
      'network',
      'fetch',
      'timeout',
      'chunk load error',
      'loading css chunk',
      'failed to fetch',
    ];

    const errorMessage = error.message.toLowerCase();
    return transientErrors.some(msg => errorMessage.includes(msg));
  }

  private scheduleAutoRetry(): void {
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
    
    Logger.info(`Scheduling auto-retry in ${delay}ms`, {
      errorId: this.state.errorId,
      retryCount: this.state.retryCount,
    });

    this.retryTimeoutId = setTimeout(() => {
      this.handleReset();
    }, delay);
  }

  handleReset = (): void => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    const newRetryCount = this.state.hasError ? this.state.retryCount + 1 : 0;
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: newRetryCount,
      errorId: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo,
          this.handleReset
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-lg w-full" variant="bordered">
            <CardHeader>
              <CardTitle className="text-red-600">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
                </p>
                
                {this.state.retryCount > 0 && (
                  <p className="text-sm text-orange-600 mt-2">
                    Retry attempt {this.state.retryCount} of {this.props.maxRetries ?? 3}
                  </p>
                )}
                
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                      Error details (development only)
                    </summary>
                    <div className="mt-2 space-y-2">
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                        <strong>Error:</strong> {this.state.error.toString()}
                      </pre>
                      {this.state.error.stack && (
                        <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-48">
                          <strong>Stack:</strong> {this.state.error.stack}
                        </pre>
                      )}
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-48">
                        <strong>Component Stack:</strong> {this.state.errorInfo.componentStack}
                      </pre>
                      {this.state.errorId && (
                        <p className="text-xs text-gray-500">
                          Error ID: {this.state.errorId}
                        </p>
                      )}
                    </div>
                  </details>
                )}
                
                <div className="flex space-x-3">
                  <Button
                    variant="primary"
                    onClick={() => window.location.reload()}
                  >
                    Refresh page
                  </Button>
                  <Button
                    variant="outline"
                    onClick={this.handleReset}
                  >
                    Try again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  className?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <Card variant="bordered">
        <CardContent>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">
                Error occurred
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {error.message || 'An unexpected error occurred'}
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetError}
                >
                  Try again
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};