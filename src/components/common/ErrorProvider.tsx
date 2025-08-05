import React, { createContext, useContext, ReactNode } from 'react';
import {
  useErrorHandler,
  UseErrorHandlerReturn,
  useGlobalErrorHandler,
} from '../../hooks/useErrorHandler';

interface ErrorProviderContextType extends UseErrorHandlerReturn {
  isErrorHandlingEnabled: boolean;
}

const ErrorProviderContext = createContext<ErrorProviderContextType | null>(
  null
);

interface ErrorProviderProps {
  children: ReactNode;
  enableGlobalHandling?: boolean;
}

export function ErrorProvider({
  children,
  enableGlobalHandling = true,
}: ErrorProviderProps) {
  const errorHandler = useErrorHandler();

  if (enableGlobalHandling) {
    useGlobalErrorHandler();
  }

  const contextValue: ErrorProviderContextType = {
    ...errorHandler,
    isErrorHandlingEnabled: true,
  };

  return (
    <ErrorProviderContext.Provider value={contextValue}>
      {children}
    </ErrorProviderContext.Provider>
  );
}

export function useErrorContext(): ErrorProviderContextType {
  const context = useContext(ErrorProviderContext);

  if (!context) {
    throw new Error('useErrorContext must be used within an ErrorProvider');
  }

  return context;
}

export function useOptionalErrorContext(): ErrorProviderContextType | null {
  return useContext(ErrorProviderContext);
}
