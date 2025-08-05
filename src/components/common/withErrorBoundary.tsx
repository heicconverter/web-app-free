import React, { ComponentType, ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorContext } from '../../hooks/useErrorHandler';

interface WithErrorBoundaryOptions {
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  context?: ErrorContext;
  isolate?: boolean;
  maxRetries?: number;
}

export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
) {
  const WrappedComponent = (props: P) => {
    const {
      fallback,
      onError,
      context = { component: Component.displayName || Component.name },
      isolate = false,
      maxRetries = 3,
    } = options;

    return (
      <ErrorBoundary
        fallback={
          fallback
            ? (error, _errorInfo, reset) => fallback(error, reset)
            : undefined
        }
        onError={onError}
        context={context}
        isolate={isolate}
        maxRetries={maxRetries}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  componentName?: string;
  isolate?: boolean;
  maxRetries?: number;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export function ErrorBoundaryWrapper({
  children,
  componentName = 'Unknown',
  isolate = false,
  maxRetries = 3,
  onError,
}: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary
      context={{ component: componentName }}
      isolate={isolate}
      maxRetries={maxRetries}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
}
