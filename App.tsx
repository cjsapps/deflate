
import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { VideoFile, ProcessStatus, CompressionSettings } from './types';
import { DEFAULT_SETTINGS, Icons } from './constants';
import SettingsPanel from './components/SettingsPanel';
import VideoItem from './components/VideoItem';
import { loadFFmpeg, compressVideo, generateThumbnail, getIsMultiThreaded } from './services/ffmpegService';

const App: React.FC = () => {
  const [files, setFiles] = useState<VideoFile[]>([]);
  const [settings, setSettings] = useState<CompressionSettings>(() => {
    const saved = localStorage.getItem('optistream_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [isCompatibilityMode, setIsCompatibilityMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'settings'>('queue');
  const [outputDirectory, setOutputDirectory] = useState<any>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [showAnyway, setShowAnyway] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('optistream_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    // Safety timeout: if loading takes > 3s, show the skip/download options
    const timer = setTimeout(() => {
      if (!ffmpegReady) setLoadingTimedOut(true);
    }, 3000);

    const init = async () => {
      try {
        await loadFFmpeg();
        setFfmpegReady(true);
        setIsCompatibilityMode(!getIsMultiThreaded());
      } catch (err) {
        console.error("FFmpeg Initialization Error:", err);
        setInitError(err instanceof Error ? err.message : String(err));
      }
    };
    init();
    
    return () => clearTimeout(timer);
  }, [ffmpegReady]);

  const selectOutputDirectory = async () => {
    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker();
      setOutputDirectory(handle);
    } catch (err) {
      console.warn("Directory selection cancelled or not supported");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files) as File[];
    const newFiles: VideoFile[] = selectedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      originalSize: file.size,
      status: ProcessStatus.IDLE,
      progress: 0
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    
    if (ffmpegReady) {
      newFiles.forEach(async (f) => {
        const thumb = await generateThumbnail(f.file);
        setFiles(current => current.map(cf => cf.id === f.id ? { ...cf, thumbnailUrl: thumb } : cf));
      });
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startBatch = async () => {
    if (isProcessingBatch || !ffmpegReady) return;
    setIsProcessingBatch(true);
    
    const pending = files.filter(f => f.status === ProcessStatus.IDLE || f.status === ProcessStatus.ERROR);
    
    for (const video of pending) {
      setFiles(prev => prev.map(f => f.id === video.id ? { ...f, status: ProcessStatus.PROCESSING, progress: 0 } : f));
      
      try {
        const result = await compressVideo(video.file, settings, (p) => {
          setFiles(prev => prev.map(f => f.id === video.id ? { ...f, progress: p } : f));
        });

        if (outputDirectory) {
          try {
            const fileName = settings.overwriteOriginal ? video.name : `compressed_${video.name}`;
            const fileHandle = await outputDirectory.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(result.blob);
            await writable.close();
          } catch (err) {
            console.error("Folder write error:", err);
          }
        }

        setFiles(prev => prev.map(f => f.id === video.id ? { 
          ...f, 
          status: ProcessStatus.COMPLETED, 
          compressedSize: result.size, 
          outputUrl: result.url, 
          progress: 100 
        } : f));

      } catch (err) {
        console.error(err);
        setFiles(prev => prev.map(f => f.id === video.id ? { ...f, status: ProcessStatus.ERROR, error: 'Processing error' } : f));
      }
    }
    setIsProcessingBatch(false);
  };

  const downloadSourceCode = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const filesToZip = [
        'index.tsx', 'App.tsx', 'types.ts', 'constants.tsx', 
        'metadata.json', 'index.html', 'sw.js', 
        'services/ffmpegService.ts', 'components/SettingsPanel.tsx', 'components/VideoItem.tsx'
      ];

      for (const file of filesToZip) {
        try {
          const response = await fetch(file);
          if (response.ok) {
            const content = await response.text();
            zip.file(file, content);
          }
        } catch (e) {
          console.warn(`Skipping ${file} in zip:`, e);
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'optistream-pro-project.zip';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Zip generation failed:", err);
      alert("Error generating zip. See console.");
    } finally {
      setIsZipping(false);
    }
  };

  // Loading / Recovery Screen
  if (!ffmpegReady && !showAnyway) {
    const showRecovery = initError || loadingTimedOut;
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center p-8 bg-[#0f172a] text-center">
        {!showRecovery ? (
          <>
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-8"></div>
            <h2 className="text-2xl font-black mb-2 tracking-tight">OptiStream Pro</h2>
            <p className="text-slate-400 text-sm animate-pulse mb-8">Booting high-performance WASM engine...</p>
          </>
        ) : (
          <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-500">
              <Icons.Download />
            </div>
            <h2 className="text-2xl font-black mb-2 tracking-tight">Project Ready</h2>
            <p className="text-slate-400 text-sm mb-8">
              {initError 
                ? "The browser security policy blocked the local FFmpeg engine, but your source code is safe and ready for export."
                : "The engine is taking longer than expected. You can continue to the UI or download the project files now."}
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={downloadSourceCode}
                disabled={isZipping}
                className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
              >
                {isZipping ? <Icons.Loader /> : <Icons.Download />}
                {isZipping ? 'Creating Archive...' : 'Download Project ZIP'}
              </button>
              <button 
                onClick={() => setShowAnyway(true)}
                className="w-full px-6 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-sm font-bold text-slate-300 transition-all border border-white/5"
              >
                Enter App (Offline Engine)
              </button>
            </div>

            {initError && (
              <div className="mt-8 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                <p className="text-[10px] text-red-400 font-mono break-all opacity-50">{initError}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0f172a] overflow-hidden relative">
      <nav className="flex-shrink-0 pt-12 pb-4 px-6 glass-panel border-b border-white/5 flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight">
          Opti<span className="text-blue-500">Stream</span>
          {!ffmpegReady && <span className="ml-2 text-[9px] bg-red-500/20 text-red-400 px-1.5 rounded uppercase font-bold tracking-widest">Offline</span>}
        </h1>
        <button 
          onClick={selectOutputDirectory}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${outputDirectory ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}
        >
          <Icons.Folder />
          {outputDirectory ? 'Folder Linked' : 'Link Folder'}
        </button>
      </nav>

      <main className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-6">
        {activeTab === 'queue' ? (
          <>
            {!ffmpegReady && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-3">
                <div className="text-blue-400 mt-0.5"><Icons.Alert /></div>
                <div>
                  <h4 className="text-sm font-bold text-blue-400">Environment Sandbox Mode</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Cross-origin security restrictions are preventing the encoder from running here. <strong>Download the project ZIP</strong> (bottom right) to run this locally!</p>
                </div>
              </div>
            )}

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="p-10 rounded-3xl border-2 border-dashed border-slate-800 hover:border-blue-500/50 hover:bg-white/[0.02] transition-all cursor-pointer group text-center"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                multiple 
                accept="video/*" 
                className="hidden" 
                onChange={handleFileChange} 
              />
              <div className="w-14 h-14 rounded-2xl bg-slate-800 mx-auto mb-4 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                <Icons.Upload />
              </div>
              <p className="font-bold text-lg">Import Batch</p>
              <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-semibold">Queue videos for processing</p>
            </div>

            {files.length > 0 && (
              <div className="space-y-3 pb-24">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest">Active Queue</h3>
                  <button onClick={() => setFiles([])} className="text-[10px] text-red-400 font-bold uppercase">Clear</button>
                </div>
                {files.map(file => (
                  <VideoItem key={file.id} item={file} onRemove={(id) => setFiles(prev => prev.filter(f => f.id !== id))} />
                ))}
              </div>
            )}
          </>
        ) : (
          <SettingsPanel settings={settings} onChange={setSettings} disabled={isProcessingBatch} />
        )}
      </main>

      {/* Floating ZIP Export */}
      <button
        onClick={downloadSourceCode}
        disabled={isZipping}
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 border border-blue-400/30 rounded-full flex items-center justify-center shadow-2xl z-50 hover:scale-110 active:scale-95 transition-all animate-pulse-soft disabled:opacity-50"
      >
        {isZipping ? <Icons.Loader /> : <Icons.Download />}
      </button>

      <footer className="flex-shrink-0 p-6 glass-panel border-t border-white/5 space-y-4">
        {files.length > 0 && activeTab === 'queue' && (
          <button
            onClick={startBatch}
            disabled={isProcessingBatch || !ffmpegReady}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 ${ffmpegReady ? 'bg-blue-600 shadow-blue-500/20' : 'bg-slate-700 opacity-50 cursor-not-allowed'}`}
          >
            {isProcessingBatch ? <Icons.Loader /> : <Icons.Play />}
            {isProcessingBatch ? 'Processing...' : (ffmpegReady ? 'Compress Batch' : 'Engine Offline')}
          </button>
        )}

        <div className="flex items-center justify-around border-t border-white/5 pt-4">
          <button onClick={() => setActiveTab('queue')} className={`flex flex-col items-center gap-1.5 ${activeTab === 'queue' ? 'text-blue-500' : 'text-slate-500'}`}>
            <Icons.Upload /><span className="text-[10px] font-black uppercase">Queue</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1.5 ${activeTab === 'settings' ? 'text-blue-500' : 'text-slate-500'}`}>
            <Icons.Settings /><span className="text-[10px] font-black uppercase">Settings</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
