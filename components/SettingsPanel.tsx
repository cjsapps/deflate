
import React from 'react';
import { CompressionSettings } from '../types';
import { PRESETS, Icons } from '../constants';

interface SettingsPanelProps {
  settings: CompressionSettings;
  onChange: (settings: CompressionSettings) => void;
  disabled: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, disabled }) => {
  const updateSetting = <K extends keyof CompressionSettings>(key: K, value: CompressionSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2 mb-2">
        <Icons.Settings />
        <h2 className="text-xl font-semibold">Compression Parameters</h2>
      </div>

      {/* CRF Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-slate-400">Quality (CRF)</label>
          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full font-mono">
            {settings.crf}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="51"
          value={settings.crf}
          onChange={(e) => updateSetting('crf', parseInt(e.target.value))}
          disabled={disabled}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>High Quality (18)</span>
          <span>Smaller File (28)</span>
        </div>
      </div>

      {/* File Handling */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Storage Strategy</h3>
        
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Overwrite if exists</span>
            <span className="text-[10px] text-slate-500">Requires Folder Access Mode</span>
          </div>
          <button 
            onClick={() => updateSetting('overwriteOriginal', !settings.overwriteOriginal)}
            className={`w-10 h-5 rounded-full transition-colors relative ${settings.overwriteOriginal ? 'bg-blue-600' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.overwriteOriginal ? 'right-1' : 'left-1'}`} />
          </button>
        </div>

        <p className="text-[11px] text-slate-500 italic px-1">
          * "Overwrite" will use the same filename and path if the output folder is selected. 
          Note: Browsers cannot physically "delete" files from your disk without the File System Access API.
        </p>
      </div>

      {/* Frame Rate */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-400">Frame Rate (FPS)</label>
        <select
          value={settings.fps}
          onChange={(e) => updateSetting('fps', e.target.value === 'original' ? 'original' : parseInt(e.target.value))}
          disabled={disabled}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="original">Keep Original</option>
          <option value="60">60 FPS</option>
          <option value="30">30 FPS</option>
          <option value="24">24 FPS</option>
          <option value="15">15 FPS</option>
          <option value="5">5 FPS</option>
          <option value="1">1 FPS (Static/Slide)</option>
        </select>
      </div>

      {/* Resolution */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-400">Target Resolution</label>
        <div className="grid grid-cols-4 gap-2">
          {[1.0, 0.75, 0.5, 0.25].map(scale => (
            <button
              key={scale}
              onClick={() => updateSetting('resolutionScale', scale)}
              className={`py-2 text-xs rounded-lg border transition-all ${settings.resolutionScale === scale ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700'}`}
            >
              {scale * 100}%
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
