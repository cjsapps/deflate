
export enum ProcessStatus {
  IDLE = 'IDLE',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  ANALYZING = 'ANALYZING'
}

export enum MediaType {
  VIDEO = 'VIDEO',
  IMAGE = 'IMAGE'
}

export interface CompressionSettings {
  // Video Settings
  crf: number;
  fps: number | 'original';
  resolution: string; // e.g. 'original', '1080p', '720p'
  preset: string;
  
  // Image Settings
  imageFormat: 'original' | 'webp';
  jpgQuality: number;
  webpQuality: number;
  preventUpsize: boolean;

  // AI Settings
  aiTaggingEnabled: boolean;

  // Global Settings
  overwriteOriginal: boolean;
  deleteAfterSuccess: boolean;
}

export interface MediaFile {
  id: string;
  file: File;
  name: string;
  type: MediaType;
  originalSize: number;
  compressedSize?: number;
  thumbnailUrl?: string;
  status: ProcessStatus;
  progress: number;
  outputUrl?: string;
  error?: string;
  duration?: number;
  tags?: string[];
  detectedFps?: number;
  detectedWidth?: number;
  detectedHeight?: number;
}
