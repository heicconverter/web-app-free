import { create } from 'zustand';
import { ConversionFile, ConversionProgress, ConversionSettings } from '../types/conversion';

interface ConversionStore {
  files: ConversionFile[];
  progress: Record<string, ConversionProgress>;
  settings: ConversionSettings;
  isConverting: boolean;
  
  // Actions
  addFiles: (files: ConversionFile[]) => void;
  removeFile: (id: string) => void;
  clearQueue: () => void;
  updateProgress: (id: string, progress: ConversionProgress) => void;
  updateSettings: (settings: Partial<ConversionSettings>) => void;
  setIsConverting: (isConverting: boolean) => void;
  updateFileStatus: (id: string, status: ConversionFile['status']) => void;
}

export const useConversionStore = create<ConversionStore>((set, get) => ({
  files: [],
  progress: {},
  settings: {
    outputFormat: 'jpg',
    quality: 80,
    resize: {
      maintainAspectRatio: true,
    },
  },
  isConverting: false,

  addFiles: (newFiles) => set((state) => ({
    files: [...state.files, ...newFiles],
  })),

  removeFile: (id) => set((state) => {
    const { [id]: _, ...remainingProgress } = state.progress;
    return {
      files: state.files.filter((f) => f.id !== id),
      progress: remainingProgress,
    };
  }),

  clearQueue: () => set({
    files: [],
    progress: {},
    isConverting: false,
  }),

  updateProgress: (id, progress) => set((state) => ({
    progress: { ...state.progress, [id]: progress },
  })),

  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings },
  })),

  setIsConverting: (isConverting) => set({ isConverting }),

  updateFileStatus: (id, status) => set((state) => ({
    files: state.files.map((file) =>
      file.id === id ? { ...file, status } : file
    ),
  })),
}));