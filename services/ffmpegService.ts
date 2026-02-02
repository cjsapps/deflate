
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
    console.debug('[FFmpeg]', message);
  });

  const coreBaseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  
  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${coreBaseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${coreBaseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      ...(isMultiThreaded ? {
        workerURL: await toBlobURL(`${coreBaseURL}/ffmpeg-core.worker.js`, 'text/javascript')
      } : {})
    });
  } catch (error) {
    console.warn('FFmpeg Load Failed:', error);
    throw error;
  }

  return ffmpeg;
};

export const getVideoMetadata = async (file: File): Promise<{ fps?: number; width?: number; height?: number }> => {
  const instance = await loadFFmpeg();
  const inputName = `probe_${Date.now()}`;
  await instance.writeFile(inputName, await fetchFile(file));

  let fps: number | undefined;
  let width: number | undefined;
  let height: number | undefined;

  const logHandler = ({ message }: { message: string }) => {
    // Look for patterns like "Stream #0:0: Video: ..., 1920x1080 ..., 30 fps, 30 tbr, ..."
    const fpsMatch = message.match(/(\d+(?:\.\d+)?)\s+fps/);
    if (fpsMatch && !fps) fps = parseFloat(fpsMatch[1]);

    const dimMatch = message.match(/(\d{2,})x(\d{2,})/);
    if (dimMatch && !width) {
      width = parseInt(dimMatch[1]);
      height = parseInt(dimMatch[2]);
    }
  };

  instance.on('log', logHandler);
  try {
    // Just run a command that triggers metadata output
    await instance.exec(['-i', inputName]);
  } catch (e) {
    // FFmpeg exits with error code when no output file is specified, which is fine here
  } finally {
    instance.off('log', logHandler);
    await instance.deleteFile(inputName);
  }

  return { fps, width, height };
};

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

  if (settings.resolution !== 'original') {
    const resMap: Record<string, number> = {
      '4k': 2160,
      '1080p': 1080,
      '720p': 720,
      '480p': 480,
      '360p': 360
    };
    const targetHeight = resMap[settings.resolution];
    if (targetHeight) {
      // Use min function in FFmpeg filter to prevent upscaling
      args.push('-vf', `scale=-2:'min(ih,${targetHeight})'`);
    }
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
