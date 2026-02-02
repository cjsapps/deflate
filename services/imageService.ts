
import { CompressionSettings } from '../types';

/**
 * Creates a low-res thumbnail specifically for AI analysis.
 * Max dimension 512px to minimize bandwidth.
 */
export const createAnalysisProxy = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 512;
        let w = img.width;
        let h = img.height;
        
        if (w > h) {
          if (w > maxDim) {
            h = (h * maxDim) / w;
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = (w * maxDim) / h;
            h = maxDim;
          }
        }
        
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const compressImage = async (
  file: File,
  settings: CompressionSettings
): Promise<{ blob: Blob; url: string; size: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Failed to get canvas context');

        ctx.drawImage(img, 0, 0);

        const targetMime = settings.imageFormat === 'webp' ? 'image/webp' : 'image/jpeg';
        const quality = settings.imageFormat === 'webp' ? settings.webpQuality / 100 : settings.jpgQuality / 100;

        canvas.toBlob((blob) => {
          if (!blob) return reject('Compression failed');
          
          if (settings.preventUpsize && blob.size > file.size) {
            const originalUrl = URL.createObjectURL(file);
            resolve({ blob: file, url: originalUrl, size: file.size });
          } else {
            const url = URL.createObjectURL(blob);
            resolve({ blob, url, size: blob.size });
          }
        }, targetMime, quality);
      };
      img.onerror = () => reject('Failed to load image');
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject('Failed to read file');
    reader.readAsDataURL(file);
  });
};
