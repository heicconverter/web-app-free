/**
 * HEIF/HEIC to JPEG/PNG converter using WebAssembly
 * Uses the libheif-js npm package for client-side image conversion
 */

import libheif from 'libheif-js';

class HeifDecoder {
  constructor() {
    this.decoder = null;
    this.initialized = false;
  }

  /**
   * Initialize the WebAssembly module
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) return;

    try {
      // Initialize libheif decoder
      this.decoder = await libheif();
      this.initialized = true;
      console.log('HeifDecoder initialized successfully');
    } catch (error) {
      console.error('Failed to initialize HeifDecoder:', error);
      throw error;
    }
  }

  /**
   * Decode HEIC/HEIF data to raw image data using libheif-js
   * @param {ArrayBuffer} heicData - The HEIC file data
   * @returns {Promise<{width: number, height: number, data: Uint8ClampedArray}>}
   */
  async decode(heicData) {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const uint8Array = new Uint8Array(heicData);
      
      // Decode using libheif-js
      const result = await this.decoder.decode(uint8Array);
      
      if (!result || !result.image) {
        throw new Error('Failed to decode HEIC image');
      }

      // Get the decoded image data
      const image = result.image;
      const width = image.get_width();
      const height = image.get_height();
      
      // Get RGB data
      const rgbData = image.display({ data: new Uint8ClampedArray(width * height * 4), width, height });
      
      return { 
        width, 
        height, 
        data: rgbData 
      };
    } catch (error) {
      console.error('HEIC decode error:', error);
      throw new Error(`Failed to decode HEIC: ${error.message}`);
    }
  }

  /**
   * Convert HEIC to JPEG
   * @param {ArrayBuffer} heicData - The HEIC file data
   * @param {number} quality - JPEG quality (0-100)
   * @returns {Promise<Blob>}
   */
  async convertToJPEG(heicData, quality = 90) {
    const { width, height, data } = await this.decode(heicData);
    
    // Create canvas and draw image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = new ImageData(data, width, height);
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to JPEG blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create JPEG blob'));
        }
      }, 'image/jpeg', quality / 100);
    });
  }

  /**
   * Convert HEIC to PNG
   * @param {ArrayBuffer} heicData - The HEIC file data
   * @returns {Promise<Blob>}
   */
  async convertToPNG(heicData) {
    const { width, height, data } = await this.decode(heicData);
    
    // Create canvas and draw image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = new ImageData(data, width, height);
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to PNG blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create PNG blob'));
        }
      }, 'image/png');
    });
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.decoder = null;
    this.initialized = false;
  }

  /**
   * Check if a file is a valid HEIC/HEIF file
   * @param {ArrayBuffer|Uint8Array} buffer - File buffer
   * @returns {boolean} - True if valid HEIC/HEIF
   */
  static isHEIC(buffer) {
    const uint8Array = buffer instanceof ArrayBuffer 
      ? new Uint8Array(buffer) 
      : buffer;
    
    // Check for HEIC/HEIF file signature
    // HEIF files start with 'ftyp' box at offset 4
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
  }
}

// Export for use in workers and main thread
export default HeifDecoder;
export { HeifDecoder };