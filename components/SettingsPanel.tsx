
import React from 'react';
import { CompressionSettings, MediaFile } from '../types';
import { Icons } from '../constants';

interface SettingsPanelProps {
  settings: CompressionSettings;
  onChange: (settings: CompressionSettings) => void;
  disabled: boolean;
  files?: MediaFile[];
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, disabled, files = [] }) => {
  const updateSetting = <K extends keyof CompressionSettings>(key: K, value: CompressionSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const hasHighFpsVideo = files.some(f => f.detectedFps && f.detectedFps >= 55);
  const hasStandardFpsVideo = files.some(f => f.detectedFps && (f.detectedFps >= 24 && f.detectedFps < 35));

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Video Settings */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2 mb-2">
          <Icons.Play />
          <h2 className="text-xl font-black tracking-tight uppercase tracking-[0.1em]">Video Settings</h2>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-400">Shrink Strength (Quality)</label>
            <span className="text-xs px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full font-bold">
              Level {settings.crf}
            </span>
          </div>
          <input
            type="range"
            min="18"
            max="45"
            value={settings.crf}
            onChange={(e) => updateSetting('crf', parseInt(e.target.value))}
            disabled={disabled}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">
            <span>High Detail</span>
            <span>Balanced</span>
            <span>Smallest File</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Movement (FPS)</label>
            <select
              value={settings.fps}
              onChange={(e) => updateSetting('fps', e.target.value === 'original' ? 'original' : parseInt(e.target.value))}
              disabled={disabled}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="original">Original</option>
              <option value="60">60 FPS {hasHighFpsVideo ? '(Preserve Smoothness)' : ''}</option>
              <option value="30">30 FPS {hasStandardFpsVideo ? '(Normal)' : ''}</option>
              <option value="15">15 FPS (Choppy)</option>
              <option value="1">1 FPS (Mostly Still)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Video Resolution</label>
            <select
              value={settings.resolution}
              onChange={(e) => updateSetting('resolution', e.target.value)}
              disabled={disabled}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="original">Original</option>
              <option value="4k">4K (Ultra HD)</option>
              <option value="1080p">1080p (Full HD)</option>
              <option value="720p">720p (HD)</option>
              <option value="480p">480p (SD)</option>
              <option value="360p">360p (SD Small)</option>
            </select>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-3">
            <div className="flex gap-3">
                <Icons.Alert />
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                    <strong className="text-blue-400 uppercase tracking-tighter mr-1">Pro Tip:</strong> 
                    Lowering FPS reduces file size significantly. Choose <span className="text-slate-200">"Mostly Still"</span> for music covers or static artwork. 
                    Use <span className="text-slate-200">"Original"</span> for normal videos to keep them exactly as smooth as they were recorded.
                </p>
            </div>
            <p className="text-[10px] text-slate-500 italic px-7">
                Choosing a higher video resolution than the original will not improve its quality.
            </p>
        </div>
      </div>

      {/* Photo Settings */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2 mb-2">
          <Icons.Image />
          <h2 className="text-xl font-black tracking-tight uppercase tracking-[0.1em]">Photo Settings</h2>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-400">Save Format</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateSetting('imageFormat', 'original')}
              className={`py-3 text-xs rounded-xl font-bold border transition-all ${settings.imageFormat === 'original' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            >
              KEEP ORIGINAL
            </button>
            <button
              onClick={() => updateSetting('imageFormat', 'webp')}
              className={`py-3 text-xs rounded-xl font-bold border transition-all ${settings.imageFormat === 'webp' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            >
              USE WEBP
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-400">Optimization Level</label>
            <span className="text-xs px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full font-bold">
              {settings.imageFormat === 'webp' ? settings.webpQuality : settings.jpgQuality}% Quality
            </span>
          </div>
          <input
            type="range"
            min="30"
            max="100"
            value={settings.imageFormat === 'webp' ? settings.webpQuality : settings.jpgQuality}
            onChange={(e) => updateSetting(settings.imageFormat === 'webp' ? 'webpQuality' : 'jpgQuality', parseInt(e.target.value))}
            disabled={disabled}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>

      {/* Smart Features */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6 border-blue-500/10">
        <div className="flex items-center gap-2 mb-2">
          <Icons.Sparkles />
          <h2 className="text-xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent uppercase tracking-[0.1em]">Smart Features</h2>
        </div>

        <div 
          onClick={() => updateSetting('aiTaggingEnabled', !settings.aiTaggingEnabled)}
          className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer ${settings.aiTaggingEnabled ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/[0.03] border-white/5 opacity-70'}`}
        >
          <div className="max-w-[75%]">
            <span className="text-sm font-bold block mb-1">Smart Search Labels</span>
            <span className="text-[10px] leading-relaxed text-slate-500 font-medium">Use AI to automatically label your files so they are easier to find later.</span>
          </div>
          <div className={`w-12 h-6 rounded-full relative transition-colors ${settings.aiTaggingEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.aiTaggingEnabled ? 'right-1' : 'left-1'}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
