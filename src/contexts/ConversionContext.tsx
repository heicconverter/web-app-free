import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ConversionFile, ConversionProgress, ConversionSettings } from '../types/conversion';

type ConversionContextType = {
  files: ConversionFile[];
  progress: Record<string, ConversionProgress>;
  settings: ConversionSettings;
  addFiles: (files: ConversionFile[]) => void;
  removeFile: (id: string) => void;
  clearQueue: () => void;
  updateProgress: (id: string, progress: ConversionProgress) => void;
  updateSettings: (settings: Partial<ConversionSettings>) => void;
};

const ConversionContext = createContext<ConversionContextType | undefined>(undefined);

export const ConversionProvider = ({ children }: { children: ReactNode }) => {
  const [files, setFiles] = useState<ConversionFile[]>([]);
  const [progress, setProgress] = useState<Record<string, ConversionProgress>>({});
  const [settings, setSettings] = useState<ConversionSettings>({
    outputFormat: 'jpg',
    quality: 80,
    resize: {
      maintainAspectRatio: true,
    },
  });

  const addFiles = (newFiles: ConversionFile[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setProgress((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  const clearQueue = () => {
    setFiles([]);
    setProgress({});
  };

  const updateProgress = (id: string, prog: ConversionProgress) => {
    setProgress((prev) => ({ ...prev, [id]: prog }));
  };

  const updateSettings = (newSettings: Partial<ConversionSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <ConversionContext.Provider value={{
      files,
      progress,
      settings,
      addFiles,
      removeFile,
      clearQueue,
      updateProgress,
      updateSettings,
    }}>
      {children}
    </ConversionContext.Provider>
  );
};

export const useConversionContext = () => {
  const context = useContext(ConversionContext);
  if (context === undefined) {
    throw new Error('useConversionContext must be used within a ConversionProvider');
  }
  return context;
};