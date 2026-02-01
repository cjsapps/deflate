
export enum ProcessStatus {
  IDLE = 'IDLE',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface CompressionSettings {
  crf: number;
  fps: number | 'original';
  resolutionScale: number;
  preset: string;
  overwriteOriginal: boolean;
  deleteAfterSuccess: boolean;
}

export interface VideoFile {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  compressedSize?: number;
  thumbnailUrl?: string;
  status: ProcessStatus;
  progress: number;
  outputUrl?: string;
  error?: string;
  duration?: number;
}
