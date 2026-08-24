import { useState, useMemo, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ShieldCheck,
  Search,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  Layers,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  CheckSquare,
  Square,
  Loader2,
} from 'lucide-react';
import { BLOCK_DEFINITIONS, BLOCK_CATEGORIES, getBlockIcon } from '../editor/blocks/registry';
import type { BlockPermissionsConfig, PlanSlug } from '../editor/permissions/types';
import { DEFAULT_BLOCK_PERMISSIONS } from '../editor/permissions/defaultPermissions';
import {
  loadPermissionsFromSupabase,
  savePermissionsToSupabase,
} from './supabase/permissionsService';

export interface BlockAccessManagerProps {
  /** Optional Supabase client to sync permissions directly with DB */
  supabaseClient?: SupabaseClient;
  /** Initial permission state if provided directly */
  initialPermissions?: BlockPermissionsConfig;
  /** Callback fired when permissions are saved */
  onSave?: (permissions: BlockPermissionsConfig) => void;
  /** Custom CSS wrapper class */
  className?: string;
}

export function BlockAccessManager({
  supabaseClient,
  initialPermissions,
  onSave,
  className = '',
}: BlockAccessManagerProps) {
  // Initialize permissions from initialPermissions or default
  const [permissions, setPermissions] = useState<BlockPermissionsConfig>(() => {
    if (initialPermissions) return { ...initialPermissions };

    // Build complete config from all registered blocks
    const config: BlockPermissionsConfig = {};
    for (const def of BLOCK_DEFINITIONS) {
      if (DEFAULT_BLOCK_PERMISSIONS[def.type]) {
        config[def.type] = { ...DEFAULT_BLOCK_PERMISSIONS[def.type] };
      } else {
        config[def.type] = {
          blockType: def.type,
          enabled: true,
          allowedPlans: ['enterprise'],
        };
      }
    }
    return config;
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('all');
  const [selectedBlockTypes, setSelectedBlockTypes] = useState<Set<string>>(new Set());

  // Save states: 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Load from Supabase on mount if client provided
  useEffect(() => {
    if (supabaseClient) {
      setIsLoading(true);
      loadPermissionsFromSupabase(supabaseClient)
        .then((loaded) => {
          setPermissions(loaded);
        })
        .catch((err) => {
          console.error(err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [supabaseClient]);

  // Synchronize when initialPermissions change
  useEffect(() => {
    if (initialPermissions) {
      setPermissions({ ...initialPermissions });
    }
  }, [initialPermissions]);

  // Ensure all registered blocks from registry exist in permissions state
  useEffect(() => {
    setPermissions((prev) => {
      let changed = false;
      const updated = { ...prev };
      for (const def of BLOCK_DEFINITIONS) {
        if (!updated[def.type]) {
          changed = true;
          updated[def.type] = {
            blockType: def.type,
            enabled: true,
            allowedPlans: DEFAULT_BLOCK_PERMISSIONS[def.type]?.allowedPlans || ['enterprise'],
          };
        }
      }
      return changed ? updated : prev;
    });
  }, []);

  // Compute Statistics dynamically
  const stats = useMemo(() => {
    const total = BLOCK_DEFINITIONS.length;
    let freeCount = 0;
    let proCount = 0;
    let enterpriseCount = 0;
    let disabledCount = 0;

    for (const def of BLOCK_DEFINITIONS) {
      const perm = permissions[def.type];
      if (!perm || !perm.enabled) {
        disabledCount++;
      } else {
        if (perm.allowedPlans.includes('free')) freeCount++;
        if (perm.allowedPlans.includes('pro')) proCount++;
        if (perm.allowedPlans.includes('enterprise')) enterpriseCount++;
      }
    }

    return { total, freeCount, proCount, enterpriseCount, disabledCount };
  }, [permissions]);

  // Filter blocks
  const filteredBlocks = useMemo(() => {
    return BLOCK_DEFINITIONS.filter((def) => {
      // Category filter
      if (selectedCategory !== 'all' && def.category !== selectedCategory) {
        return false;
      }

      const perm = permissions[def.type];

      // Plan filter
      if (selectedPlanFilter !== 'all') {
        if (selectedPlanFilter === 'disabled') {
          if (perm?.enabled) return false;
        } else if (selectedPlanFilter === 'free') {
          if (!perm?.enabled || !perm.allowedPlans.includes('free')) return false;
        } else if (selectedPlanFilter === 'pro') {
          if (!perm?.enabled || !perm.allowedPlans.includes('pro')) return false;
        } else if (selectedPlanFilter === 'enterprise') {
          if (!perm?.enabled || !perm.allowedPlans.includes('enterprise')) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = def.label.toLowerCase().includes(q);
        const matchesType = def.type.toLowerCase().includes(q);
        const matchesKeywords = def.keywords.some((k) => k.toLowerCase().includes(q));
        if (!matchesName && !matchesType && !matchesKeywords) return false;
      }

      return true;
    });
  }, [permissions, selectedCategory, selectedPlanFilter, searchQuery]);

  // Toggle single plan permission for a block
  const handleTogglePlan = (blockType: string, plan: PlanSlug) => {
    setPermissions((prev) => {
      const current = prev[blockType] || {
        blockType,
        enabled: true,
        allowedPlans: [],
      };

      const hasPlan = current.allowedPlans.includes(plan);
      const newPlans = hasPlan
        ? current.allowedPlans.filter((p) => p !== plan)
        : [...current.allowedPlans, plan];

      return {
        ...prev,
        [blockType]: {
          ...current,
          allowedPlans: newPlans,
        },
      };
    });
    setSaveStatus('idle');
  };

  // Toggle global enabled status for a block
  const handleToggleEnabled = (blockType: string) => {
    setPermissions((prev) => {
      const current = prev[blockType] || {
        blockType,
        enabled: true,
        allowedPlans: ['enterprise'],
      };

      return {
        ...prev,
        [blockType]: {
          ...current,
          enabled: !current.enabled,
        },
      };
    });
    setSaveStatus('idle');
  };

  // Bulk selection handlers
  const handleSelectAllFiltered = () => {
    if (selectedBlockTypes.size === filteredBlocks.length) {
      setSelectedBlockTypes(new Set());
    } else {
      setSelectedBlockTypes(new Set(filteredBlocks.map((b) => b.type)));
    }
  };

  const handleToggleSelectBlock = (blockType: string) => {
    setSelectedBlockTypes((prev) => {
      const next = new Set(prev);
      if (next.has(blockType)) {
        next.delete(blockType);
      } else {
        next.add(blockType);
      }
      return next;
    });
  };

  // Bulk actions
  const applyBulkAction = (
    action:
      | 'enable'
      | 'disable'
      | 'add-free'
      | 'remove-free'
      | 'add-pro'
      | 'remove-pro'
      | 'add-enterprise'
      | 'remove-enterprise',
  ) => {
    if (selectedBlockTypes.size === 0) return;

    setPermissions((prev) => {
      const updated = { ...prev };
      for (const type of selectedBlockTypes) {
        const current = updated[type] || {
          blockType: type,
          enabled: true,
          allowedPlans: [],
        };

        if (action === 'enable') {
          updated[type] = { ...current, enabled: true };
        } else if (action === 'disable') {
          updated[type] = { ...current, enabled: false };
        } else if (action === 'add-free') {
          if (!current.allowedPlans.includes('free')) {
            updated[type] = { ...current, allowedPlans: [...current.allowedPlans, 'free'] };
          }
        } else if (action === 'remove-free') {
          updated[type] = { ...current, allowedPlans: current.allowedPlans.filter((p) => p !== 'free') };
        } else if (action === 'add-pro') {
          if (!current.allowedPlans.includes('pro')) {
            updated[type] = { ...current, allowedPlans: [...current.allowedPlans, 'pro'] };
          }
        } else if (action === 'remove-pro') {
          updated[type] = { ...current, allowedPlans: current.allowedPlans.filter((p) => p !== 'pro') };
        } else if (action === 'add-enterprise') {
          if (!current.allowedPlans.includes('enterprise')) {
            updated[type] = { ...current, allowedPlans: [...current.allowedPlans, 'enterprise'] };
          }
        } else if (action === 'remove-enterprise') {
          updated[type] = { ...current, allowedPlans: current.allowedPlans.filter((p) => p !== 'enterprise') };
        }
      }
      return updated;
    });
    setSaveStatus('idle');
  };

  // Reset permissions to defaults
  const handleResetToDefaults = () => {
    setPermissions({ ...DEFAULT_BLOCK_PERMISSIONS });
    setShowResetConfirm(false);
    setSaveStatus('idle');
  };

  // Save changes
  const handleSave = async () => {
    setSaveStatus('saving');
    setErrorMessage(null);

    try {
      if (supabaseClient) {
        const res = await savePermissionsToSupabase(supabaseClient, permissions);
        if (!res.success) {
          throw new Error(res.error || 'Failed to save to Supabase');
        }
      }

      if (onSave) {
        onSave(permissions);
      }

      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (err: any) {
      setSaveStatus('error');
      setErrorMessage(err.message || 'Failed to save permissions');
    }
  };

  return (
    <div className={`w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-slate-900 dark:text-slate-100 ${className}`}>
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Block Access Management
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Super Admin
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Configure per-block permissions for Free, Pro, and Enterprise subscription plans.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 font-semibold text-xs text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
            title="Reset to default permissions"
          >
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={`px-5 py-2 rounded-xl font-bold text-xs text-white transition-all flex items-center gap-2 cursor-pointer shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              saveStatus === 'saved'
                ? 'bg-emerald-600 shadow-emerald-500/25'
                : saveStatus === 'error'
                ? 'bg-rose-600 shadow-rose-500/25'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
            }`}
          >
            {saveStatus === 'saving' ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving…</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle2 size={15} />
                <span>Saved Successfully</span>
              </>
            ) : saveStatus === 'error' ? (
              <>
                <AlertCircle size={15} />
                <span>Save Failed</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Save Permissions</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Error Banner ───────────────────────────────────────────── */}
      {isLoading && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-400" />
          <span>Loading permissions from database…</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-500" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Dynamic Stats Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Blocks */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Blocks</span>
            <Layers size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.total}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Registered in system</p>
        </div>

        {/* Free Plan */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Free Plan</span>
            <Sparkles size={16} />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {stats.freeCount} <span className="text-xs font-semibold text-emerald-600/70">/ {stats.total}</span>
          </div>
          <p className="text-[11px] text-emerald-600/70 dark:text-emerald-500/70 mt-0.5">
            {Math.round((stats.freeCount / stats.total) * 100)}% of library
          </p>
        </div>

        {/* Pro Plan */}
        <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pro Plan</span>
            <Lock size={16} />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
            {stats.proCount} <span className="text-xs font-semibold text-amber-600/70">/ {stats.total}</span>
          </div>
          <p className="text-[11px] text-amber-600/70 dark:text-amber-500/70 mt-0.5">
            {Math.round((stats.proCount / stats.total) * 100)}% of library
          </p>
        </div>

        {/* Enterprise Plan */}
        <div className="p-4 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/70 dark:border-violet-900/40 shadow-2xs">
          <div className="flex items-center justify-between text-violet-700 dark:text-violet-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Enterprise</span>
            <ShieldCheck size={16} />
          </div>
          <div className="text-2xl font-black text-violet-700 dark:text-violet-400">
            {stats.enterpriseCount} <span className="text-xs font-semibold text-violet-600/70">/ {stats.total}</span>
          </div>
          <p className="text-[11px] text-violet-600/70 dark:text-violet-500/70 mt-0.5">
            {Math.round((stats.enterpriseCount / stats.total) * 100)}% of library
          </p>
        </div>

        {/* Disabled Globally */}
        <div className="p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Disabled</span>
            <X size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-700 dark:text-slate-300">
            {stats.disabledCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Globally turned off</p>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ──────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search blocks by name, type, or keyword…"
              className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="all">All Categories ({BLOCK_CATEGORIES.length})</option>
              {BLOCK_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} Category
                </option>
              ))}
            </select>

            {/* Plan Filter Dropdown */}
            <select
              value={selectedPlanFilter}
              onChange={(e) => setSelectedPlanFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="all">All Plans & Access</option>
              <option value="free">Free Plan Allowed</option>
              <option value="pro">Pro Plan Allowed</option>
              <option value="enterprise">Enterprise Allowed</option>
              <option value="disabled">Globally Disabled</option>
            </select>
          </div>
        </div>

        {/* ── Bulk Actions Bar (when rows are selected) ───────────── */}
        {selectedBlockTypes.size > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {selectedBlockTypes.size} selected
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Bulk:</span>

              <button
                type="button"
                onClick={() => applyBulkAction('enable')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-semibold text-slate-700 dark:text-slate-300"
              >
                Enable All
              </button>
              <button
                type="button"
                onClick={() => applyBulkAction('disable')}
                className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-semibold"
              >
                Disable All
              </button>

              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={() => applyBulkAction('add-free')}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold"
              >
                + Add Free
              </button>
              <button
                type="button"
                onClick={() => applyBulkAction('remove-free')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 font-medium"
              >
                - Rem Free
              </button>

              <button
                type="button"
                onClick={() => applyBulkAction('add-pro')}
                className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-semibold"
              >
                + Add Pro
              </button>
              <button
                type="button"
                onClick={() => applyBulkAction('remove-pro')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 font-medium"
              >
                - Rem Pro
              </button>

              <button
                type="button"
                onClick={() => applyBulkAction('add-enterprise')}
                className="px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 font-semibold"
              >
                + Add Enterprise
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Block Permissions Table ────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            {/* Table Head */}
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-10">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title="Select all"
                  >
                    {selectedBlockTypes.size > 0 && selectedBlockTypes.size === filteredBlocks.length ? (
                      <CheckSquare size={16} className="text-blue-600" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 min-w-[200px]">Block</th>
                <th className="py-3 px-4 min-w-[100px]">Category</th>
                <th className="py-3 px-4 text-center min-w-[90px]">
                  <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">Free</span>
                </th>
                <th className="py-3 px-4 text-center min-w-[90px]">
                  <span className="text-amber-700 dark:text-amber-400 font-extrabold">Pro</span>
                </th>
                <th className="py-3 px-4 text-center min-w-[90px]">
                  <span className="text-violet-700 dark:text-violet-400 font-extrabold">Enterprise</span>
                </th>
                <th className="py-3 px-4 text-center min-w-[100px]">Enabled</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBlocks.map((block) => {
                const Icon = getBlockIcon(block.type);
                const perm = permissions[block.type] || {
                  blockType: block.type,
                  enabled: true,
                  allowedPlans: [],
                };

                const isSelected = selectedBlockTypes.has(block.type);
                const isFree = perm.allowedPlans.includes('free');
                const isPro = perm.allowedPlans.includes('pro');
                const isEnterprise = perm.allowedPlans.includes('enterprise');
                const isGloballyEnabled = perm.enabled;

                return (
                  <tr
                    key={block.type}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-blue-50/50 dark:bg-blue-950/20'
                        : !isGloballyEnabled
                        ? 'bg-slate-50/60 dark:bg-slate-900/40 opacity-60'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectBlock(block.type)}
                        className="flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-blue-600" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </td>

                    {/* Block Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          !isGloballyEnabled
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            : 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                        }`}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{block.label}</span>
                            {!isGloballyEnabled && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                                Disabled
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {block.type}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category Badge */}
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {block.category}
                      </span>
                    </td>

                    {/* Free Plan Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePlan(block.type, 'free')}
                        disabled={!isGloballyEnabled}
                        aria-label={`Toggle Free plan for ${block.label}`}
                        className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                          !isGloballyEnabled
                            ? 'opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                            : isFree
                            ? 'bg-emerald-500 text-white shadow-xs hover:scale-110'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 hover:text-slate-500 hover:scale-105'
                        }`}
                      >
                        {isFree ? <Check size={14} className="stroke-[3]" /> : <X size={13} />}
                      </button>
                    </td>

                    {/* Pro Plan Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePlan(block.type, 'pro')}
                        disabled={!isGloballyEnabled}
                        aria-label={`Toggle Pro plan for ${block.label}`}
                        className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                          !isGloballyEnabled
                            ? 'opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                            : isPro
                            ? 'bg-amber-500 text-white shadow-xs hover:scale-110'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 hover:text-slate-500 hover:scale-105'
                        }`}
                      >
                        {isPro ? <Check size={14} className="stroke-[3]" /> : <X size={13} />}
                      </button>
                    </td>

                    {/* Enterprise Plan Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePlan(block.type, 'enterprise')}
                        disabled={!isGloballyEnabled}
                        aria-label={`Toggle Enterprise plan for ${block.label}`}
                        className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                          !isGloballyEnabled
                            ? 'opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                            : isEnterprise
                            ? 'bg-violet-600 text-white shadow-xs hover:scale-110'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 hover:text-slate-500 hover:scale-105'
                        }`}
                      >
                        {isEnterprise ? <Check size={14} className="stroke-[3]" /> : <X size={13} />}
                      </button>
                    </td>

                    {/* Enabled Global Switch */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(block.type)}
                        aria-label={`Toggle global enablement for ${block.label}`}
                        className={`p-1 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 font-bold text-[11px] ${
                          isGloballyEnabled
                            ? 'text-blue-600 dark:text-blue-400 hover:opacity-80'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {isGloballyEnabled ? (
                          <ToggleRight size={26} className="text-blue-600 dark:text-blue-400" />
                        ) : (
                          <ToggleLeft size={26} className="text-slate-400" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredBlocks.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No blocks matched your search / filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Reset Confirmation Dialog ─────────────────────────────── */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <RotateCcw size={24} />
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Reset Permissions to Default?
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              This will restore the standard Free (12 basic blocks), Pro (media/layout/polls), and Enterprise (election trackers) distribution. Any custom permissions you set will be overwritten.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-500/25"
              >
                Yes, Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BlockAccessManager;
