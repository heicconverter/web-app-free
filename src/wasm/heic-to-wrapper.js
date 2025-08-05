/**
 * Simple HEIC/HEIF to JPEG/PNG converter using heic-to package
 * Provides an even simpler API for HEIC conversion
 */

import heicTo from 'heic-to';

class SimpleHeicConverter {
  /**
   * Convert HEIC/HEIF to JPEG
   * @param {File|Blob|ArrayBuffer} heicInput - The HEIC file
   * @param {number} quality - JPEG quality (0-100)
   * @returns {Promise<Blob>} - JPEG blob
   */
  static async convertToJPEG(heicInput, quality = 90) {
    try {
      let inputBuffer;
      
      if (heicInput instanceof File || heicInput instanceof Blob) {
        inputBuffer = await heicInput.arrayBuffer();
      } else if (heicInput instanceof ArrayBuffer) {
        inputBuffer = heicInput;
      } else {
        throw new Error('Invalid input type. Expected File, Blob, or ArrayBuffer');
      }

      // Convert using heic-to library
      const result = await heicTo({
        buffer: inputBuffer,
        type: 'image/jpeg',
        quality: quality / 100
      });

      // Return as blob
      return new Blob([result], { type: 'image/jpeg' });
    } catch (error) {
      console.error('HEIC to JPEG conversion failed:', error);
      throw new Error(`Failed to convert HEIC to JPEG: ${error.message}`);
    }
  }

  /**
   * Convert HEIC/HEIF to PNG
   * @param {File|Blob|ArrayBuffer} heicInput - The HEIC file
   * @returns {Promise<Blob>} - PNG blob
   */
  static async convertToPNG(heicInput) {
    try {
      let inputBuffer;
      
      if (heicInput instanceof File || heicInput instanceof Blob) {
        inputBuffer = await heicInput.arrayBuffer();
      } else if (heicInput instanceof ArrayBuffer) {
        inputBuffer = heicInput;
      } else {
        throw new Error('Invalid input type. Expected File, Blob, or ArrayBuffer');
      }

      // Convert using heic-to library
      const result = await heicTo({
        buffer: inputBuffer,
        type: 'image/png'
      });

      // Return as blob
      return new Blob([result], { type: 'image/png' });
    } catch (error) {
      console.error('HEIC to PNG conversion failed:', error);
      throw new Error(`Failed to convert HEIC to PNG: ${error.message}`);
    }
  }

  /**
   * Get basic metadata from HEIC file
   * @param {File|Blob|ArrayBuffer} heicInput - The HEIC file
   * @returns {Promise<Object>} - Basic metadata
   */
  static async getMetadata(heicInput) {
    try {
      let inputBuffer;
      
      if (heicInput instanceof File || heicInput instanceof Blob) {
        inputBuffer = await heicInput.arrayBuffer();
      } else if (heicInput instanceof ArrayBuffer) {
        inputBuffer = heicInput;
      } else {
        throw new Error('Invalid input type. Expected File, Blob, or ArrayBuffer');
      }

      // For basic metadata, we can decode as PNG and get canvas dimensions
      const result = await heicTo({
        buffer: inputBuffer,
        type: 'image/png'
      });

      // Create temporary image to get dimensions
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            width: img.width,
            height: img.height,
            format: 'HEIC',
            size: inputBuffer.byteLength
          });
        };
        img.onerror = () => reject(new Error('Failed to get image dimensions'));
        
        const blob = new Blob([result], { type: 'image/png' });
        img.src = URL.createObjectURL(blob);
      });
    } catch (error) {
      console.error('Failed to get HEIC metadata:', error);
      throw new Error(`Failed to read HEIC metadata: ${error.message}`);
    }
  }

  /**
   * Check if a file is a valid HEIC/HEIF file
   * @param {File|Blob|ArrayBuffer|Uint8Array} input - File to check
   * @returns {Promise<boolean>} - True if valid HEIC/HEIF
   */
  static async isHEIC(input) {
    try {
      let buffer;
      
      if (input instanceof File || input instanceof Blob) {
        buffer = await input.arrayBuffer();
      } else if (input instanceof ArrayBuffer) {
        buffer = input;
      } else if (input instanceof Uint8Array) {
        buffer = input.buffer;
      } else {
        return false;
      }

      const uint8Array = new Uint8Array(buffer);
      
      // Check for HEIC/HEIF file signature
      if (uint8Array.length < 12) return false;
      
      const ftyp = String.fromCharCode(
        uint8Array[4],
        uint8Array[5],
        uint8Array[6],
        uint8Array[7]
      );
      
      if (ftyp !== 'ftyp') return false;
      
      // Check for HEIC/HEIF brand
      const brand = String.fromCharCode(
        uint8Array[8],
        uint8Array[9],
        uint8Array[10],
        uint8Array[11]
      );
      
      const heicBrands = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1'];
      return heicBrands.includes(brand);
    } catch (error) {
      console.error('Error checking HEIC format:', error);
      return false;
    }
  }

  /**
   * Convert multiple HEIC files to the specified format
   * @param {File[]|Blob[]|ArrayBuffer[]} heicFiles - Array of HEIC files
   * @param {string} outputFormat - 'jpeg' or 'png'
   * @param {number} quality - JPEG quality (0-100), ignored for PNG
   * @returns {Promise<Blob[]>} - Array of converted blobs
   */
  static async convertBatch(heicFiles, outputFormat = 'jpeg', quality = 90) {
    const results = [];
    
    for (let i = 0; i < heicFiles.length; i++) {
      const file = heicFiles[i];
      
      try {
        let result;
        if (outputFormat.toLowerCase() === 'png') {
          result = await this.convertToPNG(file);
        } else {
          result = await this.convertToJPEG(file, quality);
        }
        results.push(result);
      } catch (error) {
        console.error(`Failed to convert file ${i + 1}:`, error);
        throw new Error(`Batch conversion failed at file ${i + 1}: ${error.message}`);
      }
    }
    
    return results;
  }
}

export default SimpleHeicConverter;