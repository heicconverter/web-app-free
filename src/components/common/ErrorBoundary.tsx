import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '../ui';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
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
                
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                      Error details (development only)
                    </summary>
                    <div className="mt-2 space-y-2">
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                        {this.state.error.toString()}
                      </pre>
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-48">
                        {this.state.errorInfo.componentStack}
                      </pre>
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

interface ErrorFallbackProps {
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