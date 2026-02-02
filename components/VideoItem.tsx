
import React from 'react';
import { MediaFile, ProcessStatus, MediaType } from '../types';
import { Icons } from '../constants';

interface MediaItemProps {
  item: MediaFile;
  onRemove: (id: string) => void;
}

const formatBytes = (bytes: number, decimals = 1) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const MediaItem: React.FC<MediaItemProps> = ({ item, onRemove }) => {
  const isProcessing = item.status === ProcessStatus.PROCESSING || item.status === ProcessStatus.ANALYZING;
  const isCompleted = item.status === ProcessStatus.COMPLETED;
  const isError = item.status === ProcessStatus.ERROR;
  const isAnalyzing = item.status === ProcessStatus.ANALYZING;

  const reduction = item.compressedSize 
    ? Math.round((1 - item.compressedSize / item.originalSize) * 100)
    : 0;

  return (
    <div className={`glass-panel rounded-3xl p-5 flex flex-col gap-4 transition-all duration-300 ${isProcessing ? 'ring-2 ring-blue-500/50 scale-[1.01] bg-blue-500/[0.03]' : ''}`}>
      <div className="flex items-center gap-5">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800 flex-shrink-0 overflow-hidden shadow-inner">
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-700">
               {item.type === MediaType.VIDEO ? <Icons.Play /> : <Icons.Image />}
            </div>
          )}
          {isCompleted && (
            <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center backdrop-blur-[1px]">
              <div className="bg-white rounded-full p-1 text-emerald-600 shadow-xl">
                <Icons.Check />
              </div>
            </div>
          )}
        </div>

        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 truncate pr-2">
            <h4 className="font-bold text-base truncate tracking-tight">{item.name}</h4>
          </div>
          
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
            <span className="text-[9px] uppercase font-black tracking-widest text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-md">
              {item.type === MediaType.VIDEO ? 'Video' : 'Photo'}
            </span>
            
            {item.type === MediaType.VIDEO && (item.detectedFps || item.detectedWidth) && (
                <span className="text-[9px] font-bold text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-md">
                    {item.detectedWidth && `${item.detectedWidth}x${item.detectedHeight}`} 
                    {item.detectedFps && ` @ ${Math.round(item.detectedFps)}fps`}
                </span>
            )}

            <span className="text-xs text-slate-500 font-bold">{formatBytes(item.originalSize)}</span>
            
            {isCompleted && item.compressedSize && (
              <div className="flex items-center gap-2">
                <span className="text-slate-600">→</span>
                <span className="text-xs text-emerald-400 font-black">{formatBytes(item.compressedSize)}</span>
                <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-md">
                  -{reduction}%
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {isCompleted && item.outputUrl && (
            <a
              href={item.outputUrl}
              download={`shrunk_${item.name}`}
              className="p-3 text-blue-400 hover:bg-blue-500/10 rounded-2xl transition-all active:scale-90"
              title="Save to device"
            >
              <Icons.Download />
            </a>
          )}
          <button
            onClick={() => onRemove(item.id)}
            disabled={isProcessing}
            className="p-3 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all disabled:opacity-20"
          >
            <Icons.Trash />
          </button>
        </div>
      </div>

      {(item.tags && item.tags.length > 0) && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {item.tags.map((tag, idx) => (
            <span key={idx} className="text-[9px] bg-blue-500/5 text-blue-400/80 px-2.5 py-1 rounded-lg font-bold uppercase tracking-widest border border-blue-500/10">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {isProcessing && (
        <div className="mt-1 w-full space-y-2">
          <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest">
            <span className={isAnalyzing ? 'text-blue-400 animate-pulse' : 'text-slate-500'}>
              {isAnalyzing ? 'Analyzing details...' : 'Shrinking file...'}
            </span>
            <span className="text-slate-500">{item.progress > 0 ? `${item.progress}%` : ''}</span>
          </div>
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${isAnalyzing ? 'bg-emerald-500 w-full animate-pulse' : 'bg-blue-500'}`}
              style={{ width: isAnalyzing ? '100%' : (item.progress > 0 ? `${item.progress}%` : '0%') }}
            />
          </div>
        </div>
      )}
      
      {isError && (
        <p className="text-[10px] text-red-400 font-bold flex items-center gap-1.5 bg-red-500/5 p-2 rounded-xl border border-red-500/10">
          <Icons.Alert /> {item.error || 'Something went wrong'}
        </p>
      )}
    </div>
  );
};

export default MediaItem;
