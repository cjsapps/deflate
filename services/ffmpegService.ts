
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { CompressionSettings } from '../types';

let ffmpeg: FFmpeg | null = null;
let isMultiThreaded = false;

const checkMultiThreadSupport = () => {
  try {
    return (
      typeof SharedArrayBuffer !== 'undefined' &&
      typeof Worker !== 'undefined' &&
      !!window.crossOriginIsolated
    );
  } catch (e) {
    return false;
  }
};

export const loadFFmpeg = async (onLog?: (message: string) => void) => {
  if (ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  isMultiThreaded = checkMultiThreadSupport();
  
  ffmpeg.on('log', ({ message }) => {
    if (onLog) onLog(message);
    console.log('[FFmpeg]', message);
  });

  const coreBaseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  
  try {
    // Attempt standard load
    // If this fails (e.g. cross-origin worker restriction), the error is caught by App.tsx
    await ffmpeg.load({
      coreURL: await toBlobURL(`${coreBaseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${coreBaseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      // Only include workerURL if we think multi-threading will work
      ...(isMultiThreaded ? {
        workerURL: await toBlobURL(`${coreBaseURL}/ffmpeg-core.worker.js`, 'text/javascript')
      } : {})
    });
  } catch (error) {
    console.warn('FFmpeg Load Failed:', error);
    // Rethrow so App UI can handle the state
    throw error;
  }

  return ffmpeg;
};

export const getIsMultiThreaded = () => isMultiThreaded;

export const compressVideo = async (
  file: File,
  settings: CompressionSettings,
  onProgress: (percent: number) => void
): Promise<{ blob: Blob; url: string; size: number }> => {
  const instance = await loadFFmpeg();
  const inputName = `input_${Date.now()}`;
  const outputName = `output_${Date.now()}.mp4`;

  await instance.writeFile(inputName, await fetchFile(file));

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
  };
  
  instance.on('progress', progressHandler);

  const args: string[] = [
    '-i', inputName,
    '-vcodec', 'libx264',
    '-crf', settings.crf.toString(),
    '-preset', settings.preset,
    '-movflags', '+faststart',
  ];

  if (settings.fps !== 'original') {
    args.push('-r', settings.fps.toString());
  }

  if (settings.resolutionScale !== 1.0) {
    args.push('-vf', `scale=trunc(iw*${settings.resolutionScale}/2)*2:trunc(ih*${settings.resolutionScale}/2)*2`);
  }

  args.push('-acodec', 'aac', '-b:a', '128k', outputName);

  try {
    await instance.exec(args);
    const data = await instance.readFile(outputName);
    const blob = new Blob([data], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    
    await instance.deleteFile(inputName);
    await instance.deleteFile(outputName);
    
    return { blob, url, size: blob.size };
  } finally {
    instance.off('progress', progressHandler);
  }
};

export const generateThumbnail = async (file: File): Promise<string> => {
  const instance = await loadFFmpeg();
  const inputName = `thumb_in_${Date.now()}`;
  const outputName = `thumb_${Date.now()}.jpg`;

  await instance.writeFile(inputName, await fetchFile(file));
  
  try {
    await instance.exec([
      '-ss', '00:00:01',
      '-i', inputName,
      '-frames:v', '1',
      outputName
    ]);

    const data = await instance.readFile(outputName);
    const blob = new Blob([data], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);

    await instance.deleteFile(inputName);
    await instance.deleteFile(outputName);

    return url;
  } catch (e) {
    return '';
  }
};
