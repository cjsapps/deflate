
import React from 'react';
import { VideoFile, ProcessStatus } from '../types';
import { Icons } from '../constants';

interface VideoItemProps {
  item: VideoFile;
  onRemove: (id: string) => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const VideoItem: React.FC<VideoItemProps> = ({ item, onRemove }) => {
  const isProcessing = item.status === ProcessStatus.PROCESSING;
  const isCompleted = item.status === ProcessStatus.COMPLETED;
  const isError = item.status === ProcessStatus.ERROR;

  const reduction = item.compressedSize 
    ? Math.round((1 - item.compressedSize / item.originalSize) * 100)
    : 0;

  return (
    <div className={`glass-panel rounded-xl p-4 flex items-center gap-4 transition-all duration-300 ${isProcessing ? 'ring-2 ring-blue-500/50 scale-[1.01]' : ''}`}>
      <div className="relative w-24 h-16 rounded-lg bg-slate-800 flex-shrink-0 overflow-hidden group">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
             <Icons.Play />
          </div>
        )}
        {isCompleted && (
          <div className="absolute inset-0 bg-emerald-500/40 flex items-center justify-center backdrop-blur-[2px]">
            <Icons.Check />
          </div>
        )}
      </div>

      <div className="flex-grow min-w-0">
        <h4 className="font-medium text-sm truncate pr-4">{item.name}</h4>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-slate-500">{formatBytes(item.originalSize)}</span>
          {isCompleted && item.compressedSize && (
            <>
              <span className="text-xs text-slate-400">→</span>
              <span className="text-xs text-emerald-400 font-semibold">{formatBytes(item.compressedSize)}</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                -{reduction}%
              </span>
            </>
          )}
        </div>

        {isProcessing && (
          <div className="mt-2 w-full">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Compressing...</span>
              <span>{item.progress}%</span>
            </div>
            <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300" 
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        )}
        
        {isError && (
          <p className="text-[10px] text-red-400 mt-1 truncate">{item.error || 'Failed to process'}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isCompleted && item.outputUrl && (
          <a
            href={item.outputUrl}
            download={`compressed_${item.name}`}
            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
            title="Download Compressed"
          >
            <Icons.Download />
          </a>
        )}
        <button
          onClick={() => onRemove(item.id)}
          disabled={isProcessing}
          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30"
          title="Remove from queue"
        >
          <Icons.Trash />
        </button>
      </div>
    </div>
  );
};

export default VideoItem;
