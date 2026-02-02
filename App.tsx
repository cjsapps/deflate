
import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { MediaFile, ProcessStatus, CompressionSettings, MediaType } from './types';
import { DEFAULT_SETTINGS, Icons } from './constants';
import SettingsPanel from './components/SettingsPanel';
import MediaItem from './components/VideoItem';
import { loadFFmpeg, compressVideo, generateThumbnail, getVideoMetadata } from './services/ffmpegService';
import { compressImage, createAnalysisProxy } from './services/imageService';
import { generateImageTags } from './services/aiService';

/**
 * PRODUCTION TOGGLE: Set to false to remove the source code download button.
 */
const SHOW_DEV_DOWNLOAD_BUTTON = true;

const App: React.FC = () => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [settings, setSettings] = useState<CompressionSettings>(() => {
    const saved = localStorage.getItem('deflate_settings_v9');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'settings'>('queue');
  const [outputDirectory, setOutputDirectory] = useState<any>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('deflate_settings_v9', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const init = async () => {
      try {
        await loadFFmpeg();
        setFfmpegReady(true);
        // Keep splash for a tiny bit longer for a premium feel
        setTimeout(() => setShowSplash(false), 1200);
      } catch (err) {
        console.warn("Processing engine restricted", err);
        setInitError("Video shrinking is disabled in this browser.");
        setTimeout(() => setShowSplash(false), 1200);
      }
    };
    init();
  }, []);

  const selectOutputDirectory = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert("Direct folder saving is only available on desktop browsers like Chrome or Edge. Other devices will download files individually.");
      return;
    }
    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker();
      setOutputDirectory(handle);
    } catch (err) {
      console.warn("Folder link cancelled");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files) as File[];
    const newFiles: MediaFile[] = selectedFiles.map(file => {
      const isVideo = file.type.startsWith('video/');
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        type: isVideo ? MediaType.VIDEO : MediaType.IMAGE,
        originalSize: file.size,
        status: ProcessStatus.IDLE,
        progress: 0,
        thumbnailUrl: !isVideo ? URL.createObjectURL(file) : undefined
      };
    });
    
    setFiles(prev => [...prev, ...newFiles]);
    
    newFiles.forEach(async (f) => {
      if (f.type === MediaType.VIDEO && ffmpegReady) {
        const [thumb, meta] = await Promise.all([
          generateThumbnail(f.file),
          getVideoMetadata(f.file)
        ]);
        
        setFiles(current => current.map(cf => cf.id === f.id ? { 
          ...cf, 
          thumbnailUrl: thumb,
          detectedFps: meta.fps,
          detectedWidth: meta.width,
          detectedHeight: meta.height
        } : cf));
      }
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startBatch = async () => {
    if (isProcessingBatch) return;
    setIsProcessingBatch(true);
    
    const pending = files.filter(f => f.status === ProcessStatus.IDLE || f.status === ProcessStatus.ERROR);
    
    for (const item of pending) {
      if (settings.aiTaggingEnabled) {
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: ProcessStatus.ANALYZING } : f));
        try {
          let analysisBase64 = item.type === MediaType.IMAGE ? await createAnalysisProxy(item.file) : item.thumbnailUrl;
          if (analysisBase64) {
            const tags = await generateImageTags(analysisBase64, "image/jpeg");
            setFiles(prev => prev.map(f => f.id === item.id ? { ...f, tags } : f));
          }
        } catch (err) { console.error(err); }
      }

      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: ProcessStatus.PROCESSING, progress: 0 } : f));
      
      try {
        let result;
        if (item.type === MediaType.VIDEO) {
          if (!ffmpegReady) throw new Error("Video engine not ready");
          result = await compressVideo(item.file, settings, (p) => {
            setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: p } : f));
          });
        } else {
          result = await compressImage(item.file, settings);
        }

        if (outputDirectory) {
          try {
            const fileName = settings.overwriteOriginal ? item.name : `shrunk_${item.name}`;
            const fileHandle = await outputDirectory.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(result.blob);
            await writable.close();
          } catch (err) { console.error(err); }
        }

        setFiles(prev => prev.map(f => f.id === item.id ? { 
          ...f, 
          status: ProcessStatus.COMPLETED, 
          compressedSize: result.size, 
          outputUrl: result.url, 
          progress: 100 
        } : f));

      } catch (err) {
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: ProcessStatus.ERROR, error: 'Could not process file' } : f));
      }
    }
    setIsProcessingBatch(false);
  };

  const downloadSourceCode = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const filesToZip = ['index.tsx', 'App.tsx', 'types.ts', 'constants.tsx', 'metadata.json', 'index.html', 'sw.js', 'package.json', 'tsconfig.json', 'vite.config.ts', 'public/_headers', 'public/_redirects', 'services/ffmpegService.ts', 'services/imageService.ts', 'services/aiService.ts', 'components/SettingsPanel.tsx', 'components/VideoItem.tsx', 'deflate.webp'];
      
      await Promise.all(filesToZip.map(async (f) => {
        try {
          const r = await fetch(`./${f}`);
          if (r.ok) {
            // Handle binary files (images) differently from text files
            if (f.endsWith('.webp') || f.endsWith('.png') || f.endsWith('.jpg')) {
                zip.file(f, await r.blob());
            } else {
                zip.file(f, await r.text());
            }
          }
        } catch (e) {}
      }));
      const b = await zip.generateAsync({ type: 'blob' });
      const u = URL.createObjectURL(b);
      const l = document.createElement('a');
      l.href = u;
      l.download = 'deflate-pro.zip';
      l.click();
      URL.revokeObjectURL(u);
    } finally { setIsZipping(false); }
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-[#0f172a] z-[100] flex flex-col items-center justify-center p-12 animate-in fade-in duration-500">
        <div className="relative">
            {!logoError ? (
                <img 
                  src="deflate.webp" 
                  alt="Deflate Logo" 
                  className="w-48 h-48 sm:w-64 sm:h-64 object-contain animate-pulse-soft"
                  onError={() => setLogoError(true)}
                />
            ) : (
                <h1 className="text-6xl sm:text-8xl font-black tracking-tighter italic text-slate-200 animate-pulse-soft">
                    DEF<span className="text-blue-500">LATE</span>
                </h1>
            )}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-bounce" />
            </div>
        </div>
        <p className="mt-20 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 animate-pulse">
            Initializing Engine
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0f172a] overflow-hidden relative">
      <nav className="flex-shrink-0 pt-10 pb-4 px-6 glass-panel border-b border-white/5 flex items-center justify-between gap-4 overflow-hidden">
        <div className="flex flex-col min-w-0">
          {!logoError ? (
            <img 
              src="deflate.webp" 
              alt="Deflate" 
              className="h-10 sm:h-12 md:h-14 lg:h-16 w-auto object-contain select-none"
              onError={() => setLogoError(true)}
            />
          ) : (
             <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter leading-none italic select-none truncate">
               DEF<span className="text-blue-500">LATE</span>
             </h1>
          )}
          <div className="flex items-center gap-2 mt-1 sm:mt-1">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ffmpegReady ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 truncate">
              {ffmpegReady ? 'Engine Active' : 'Restricted Mode'}
            </span>
          </div>
        </div>
        <button 
          onClick={selectOutputDirectory}
          className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-3 rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl active:scale-95 ${outputDirectory ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 border border-white/5'}`}
        >
          <Icons.Folder /> 
          <span className="hidden sm:inline">{outputDirectory ? 'Folder Linked' : 'Auto-Save'}</span>
        </button>
      </nav>

      <main className="flex-grow overflow-y-auto custom-scrollbar p-6">
        {initError && activeTab === 'queue' && (
          <div className="mb-6 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
            <Icons.Alert /> {initError}
          </div>
        )}

        {activeTab === 'queue' ? (
          <div className="space-y-6">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="p-10 sm:p-20 rounded-[2.5rem] border-2 border-dashed border-slate-800 hover:border-blue-500/50 hover:bg-white/[0.02] transition-all cursor-pointer group text-center"
            >
              <input type="file" ref={fileInputRef} multiple accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-3xl bg-slate-800 mx-auto mb-8 flex items-center justify-center group-hover:bg-blue-600 transition-colors shadow-2xl group-hover:scale-105 duration-300">
                <Icons.Upload />
              </div>
              <p className="font-black text-2xl sm:text-4xl tracking-tight mb-2">Pick photos or videos</p>
              <p className="text-[11px] text-slate-500 uppercase tracking-[0.3em] font-black">All files stay on your device</p>
            </div>

            {files.length > 0 && (
              <div className="space-y-3 pb-24">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest opacity-50">Active List ({files.length})</h3>
                  <button onClick={() => setFiles([])} className="text-[10px] text-red-500 font-black uppercase hover:underline">Clear all</button>
                </div>
                {files.map(file => <MediaItem key={file.id} item={file} onRemove={(id) => setFiles(prev => prev.filter(f => f.id !== id))} />)}
              </div>
            )}
          </div>
        ) : (
          <SettingsPanel settings={settings} onChange={setSettings} disabled={isProcessingBatch} files={files} />
        )}
      </main>

      {SHOW_DEV_DOWNLOAD_BUTTON && (
        <button
          onClick={downloadSourceCode}
          disabled={isZipping}
          className="fixed bottom-28 right-6 w-14 h-14 bg-blue-600 text-white border border-white/10 rounded-full flex items-center justify-center shadow-2xl z-50 hover:scale-110 active:scale-95 transition-all"
        >
          {isZipping ? <Icons.Loader /> : <Icons.Download />}
        </button>
      )}

      <footer className="flex-shrink-0 p-6 glass-panel border-t border-white/5">
        {files.length > 0 && activeTab === 'queue' && (
          <button
            onClick={startBatch}
            disabled={isProcessingBatch}
            className={`w-full py-6 rounded-3xl font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-4 mb-6 ${isProcessingBatch ? 'bg-slate-700 text-slate-400' : 'bg-blue-600 text-white shadow-blue-500/40'}`}
          >
            {isProcessingBatch ? <Icons.Loader /> : (settings.aiTaggingEnabled ? <Icons.Sparkles /> : <Icons.Play />)}
            {isProcessingBatch ? 'Working...' : 'Start shrinking'}
          </button>
        )}

        <div className="flex items-center justify-around">
          <button onClick={() => setActiveTab('queue')} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'queue' ? 'text-blue-500' : 'text-slate-500 opacity-50'}`}>
            <Icons.Upload />
            <span className="text-[10px] font-black uppercase tracking-widest">My List</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-2 transition-all ${activeTab === 'settings' ? 'text-blue-500' : 'text-slate-500 opacity-50'}`}>
            <Icons.Settings />
            <span className="text-[10px] font-black uppercase tracking-widest">Settings</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
