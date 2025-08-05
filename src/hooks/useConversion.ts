import { useCallback } from 'react';
import { useConversionStore } from '../store';
import { ConversionFile, ConversionResult } from '../types/conversion';

export const useConversion = () => {
  const {
    files,
    progress,
    settings,
    isConverting,
    addFiles,
    removeFile,
    clearQueue,
    updateProgress,
    updateSettings,
    setIsConverting,
    updateFileStatus,
  } = useConversionStore();

  const convertFiles = useCallback(async (): Promise<ConversionResult[]> => {
    if (files.length === 0 || isConverting) return [];

    setIsConverting(true);
    const results: ConversionResult[] = [];

    try {
      for (const file of files) {
        if (file.status !== 'pending') continue;

        updateFileStatus(file.id, 'converting');
        updateProgress(file.id, {
          percentage: 0,
          stage: 'processing',
          message: 'Starting conversion...',
        });

        try {
          // Simulate conversion process
          const result = await convertSingleFile(file);
          
          updateFileStatus(file.id, 'completed');
          updateProgress(file.id, {
            percentage: 100,
            stage: 'completed',
            message: 'Conversion completed',
          });

          results.push(result);
        } catch (error) {
          updateFileStatus(file.id, 'error');
          updateProgress(file.id, {
            percentage: 0,
            stage: 'completed',
            error: error instanceof Error ? error.message : 'Conversion failed',
          });
        }
      }
    } finally {
      setIsConverting(false);
    }

    return results;
  }, [files, isConverting, settings, setIsConverting, updateFileStatus, updateProgress]);

  const convertSingleFile = async (file: ConversionFile): Promise<ConversionResult> => {
    // This is a placeholder for the actual conversion logic
    // In a real implementation, this would use a library like heic2any or a server-side API
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock conversion - in reality, you'd use HEIC conversion libraries
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((blob) => {
                if (blob) {
                  const downloadUrl = URL.createObjectURL(blob);
                  const fileName = `${file.name.replace(/\.[^/.]+$/, '')}.${settings.outputFormat}`;
                  
                  resolve({
                    id: file.id,
                    originalFile: file,
                    convertedBlob: blob,
                    downloadUrl,
                    fileName,
                  });
                } else {
                  reject(new Error('Failed to create blob'));
                }
              }, `image/${settings.outputFormat}`, settings.quality / 100);
            } else {
              reject(new Error('Failed to get canvas context'));
            }
          };
          
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = URL.createObjectURL(file.file);
        } catch (error) {
          reject(error);
        }
      }, 1000); // Simulate processing time
    });
  };

  const downloadFile = useCallback((result: ConversionResult) => {
    const link = document.createElement('a');
    link.href = result.downloadUrl;
    link.download = result.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const downloadAll = useCallback(async () => {
    const results = await convertFiles();
    results.forEach(downloadFile);
  }, [convertFiles, downloadFile]);

  return {
    // State
    files,
    progress,
    settings,
    isConverting,
    
    // Actions
    addFiles,
    removeFile,
    clearQueue,
    updateSettings,
    convertFiles,
    downloadFile,
    downloadAll,
    
    // Computed
    hasFiles: files.length > 0,
    completedFiles: files.filter(f => f.status === 'completed'),
    pendingFiles: files.filter(f => f.status === 'pending'),
    errorFiles: files.filter(f => f.status === 'error'),
  };
};