import { useState } from 'react';
import { EditorStudio } from './EditorStudio';
// import { BlockAccessManager } from './admin/BlockAccessManager';
import type { BlockInstance } from './editor/types';
// import type { EditorPlan, BlockPermissionsConfig, UpgradeRequiredPayload } from './editor/permissions/types';
// import { DEFAULT_BLOCK_PERMISSIONS } from './editor/permissions/defaultPermissions';
// import { ShieldCheck, Edit3, Sparkles } from 'lucide-react';

export default function App() {
  const [, setBlocks] = useState<BlockInstance[]>([]);

  // ── [OPTIONAL / DEMO] Permission & Plan State (Uncomment when needed) ───────
  // const [activeView, setActiveView] = useState<'editor' | 'admin'>('editor');
  // const [currentPlan, setCurrentPlan] = useState<EditorPlan | 'unrestricted'>('free');
  // const [permissions, setPermissions] = useState<BlockPermissionsConfig>(DEFAULT_BLOCK_PERMISSIONS);
  // const [upgradeToast, setUpgradeToast] = useState<UpgradeRequiredPayload | null>(null);

  // const handleUpgradeRequired = (payload: UpgradeRequiredPayload) => {
  //   setUpgradeToast(payload);
  //   setTimeout(() => {
  //     setUpgradeToast(null);
  //   }, 4000);
  // };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans">
      {/* ── [OPTIONAL / DEMO] Top Bar: Switcher between Editor and Super Admin (Uncomment when needed) ── */}
      {/*
      <header className="h-12 bg-slate-900 text-white px-4 flex items-center justify-between shrink-0 border-b border-slate-800 z-50 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-black text-sm tracking-tight text-white">
            <span className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-black">
              E
            </span>
            <span>React Editor Studio</span>
          </div>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setActiveView('editor')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'editor'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 size={13} />
              <span>Editor Preview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'admin'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck size={13} />
              <span>Super Admin Permissions</span>
            </button>
          </div>
        </div>

        {activeView === 'editor' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
              Testing as Plan:
            </span>
            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCurrentPlan('free')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  currentPlan === 'free'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Free
              </button>
              <button
                type="button"
                onClick={() => setCurrentPlan('pro')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  currentPlan === 'pro'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pro
              </button>
              <button
                type="button"
                onClick={() => setCurrentPlan('enterprise')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  currentPlan === 'enterprise'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Enterprise
              </button>
              <button
                type="button"
                onClick={() => setCurrentPlan('unrestricted')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  currentPlan === 'unrestricted'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Unrestricted (No plan prop supplied - backward compatibility mode)"
              >
                Off (Legacy)
              </button>
            </div>
          </div>
        )}
      </header>
      */}

      {/* ── Main Content Area ────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <EditorStudio
          // plan={currentPlan === 'unrestricted' ? undefined : currentPlan}
          // blockPermissions={currentPlan === 'unrestricted' ? undefined : permissions}
          // onUpgradeRequired={handleUpgradeRequired}
          onChange={(updatedBlocks) => setBlocks(updatedBlocks)}
          onSave={(savedBlocks, html) => {
            console.log('Saved blocks:', savedBlocks);
            console.log('Exported HTML:', html);
          }}
        />

        {/* ── [OPTIONAL / DEMO] Super Admin Page View (Uncomment when needed) ── */}
        {/*
        {activeView === 'admin' && (
          <div className="h-full overflow-y-auto be-scroll p-4 sm:p-6">
            <BlockAccessManager
              initialPermissions={permissions}
              onSave={(updated) => {
                setPermissions(updated);
              }}
            />
          </div>
        )}
        */}

        {/* ── [OPTIONAL / DEMO] Upgrade Toast Notification (Uncomment when needed) ── */}
        {/*
        {upgradeToast && (
          <div className="fixed bottom-6 right-6 z-[999999] p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-amber-500/50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-md">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black uppercase text-amber-400 tracking-wider">
                Upgrade Triggered by Parent App
              </div>
              <div className="text-xs text-slate-200 mt-0.5">
                Block: <strong>{upgradeToast.blockLabel}</strong> ({upgradeToast.blockType})
                requires <strong>{upgradeToast.requiredPlan.toUpperCase()}</strong> plan.
              </div>
            </div>
          </div>
        )}
        */}
      </div>
    </div>
  );
}
