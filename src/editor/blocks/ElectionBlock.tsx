import React, { useState } from 'react';
import {
  Landmark, Users, BarChart3, Plus, Trash2,
  Upload, Settings2, Trophy, ArrowUpRight, ArrowDownRight, Layers,
  Pencil, ChevronDown
} from 'lucide-react';
import { useEditorStore } from '../store';
import { fileToDataUrl } from '../media';
import { createId } from '../utils';
import type { BlockInstance } from '../types';

export interface ElectionParty {
  id: string;
  name: string;
  shortName: string;
  color: string;
  lead: number;
  won: number;
  previousSeats?: number;
  voteSharePercent?: number;
}

export interface Candidate {
  id: string;
  name: string;
  party: string;
  color: string;
  photoUrl?: string;
  votes: number;
  statusOverride?: 'leading' | 'trailing' | 'won' | 'lost';
}

export interface CandidateBattle {
  id: string;
  constituency: string;
  roundInfo: string;
  candidates: Candidate[];
}

export type ElectionMode = 'tally-bar' | 'parliament-arch' | 'candidate-battle' | 'vote-share';

interface BlockProps {
  block: BlockInstance;
  selected?: boolean;
}

const PRESETS = {
  gujarat: {
    title: 'Gujarat Assembly Election / ગુજરાત વિધાનસભા ચૂંટણી',
    totalSeats: 182,
    majoritySeats: 92,
    parties: [
      { id: 'bjp', name: 'Bharatiya Janata Party', shortName: 'BJP', color: '#f97316', lead: 110, won: 46, previousSeats: 156, voteSharePercent: 52.5 },
      { id: 'inc', name: 'Indian National Congress', shortName: 'INC', color: '#0284c7', lead: 14, won: 3, previousSeats: 17, voteSharePercent: 27.3 },
      { id: 'aap', name: 'Aam Aadmi Party', shortName: 'AAP', color: '#16a34a', lead: 5, won: 2, previousSeats: 5, voteSharePercent: 12.9 },
      { id: 'oth', name: 'Others / અન્ય', shortName: 'OTH', color: '#64748b', lead: 2, won: 0, previousSeats: 4, voteSharePercent: 7.3 },
    ]
  },
  loksabha: {
    title: 'General Election / સામાન્ય ચૂંટણી',
    totalSeats: 543,
    majoritySeats: 272,
    parties: [
      { id: 'nda', name: 'Alliance A (NDA)', shortName: 'NDA', color: '#f97316', lead: 180, won: 113, previousSeats: 353, voteSharePercent: 44.6 },
      { id: 'india', name: 'Alliance B (INDIA)', shortName: 'INDIA', color: '#0284c7', lead: 142, won: 92, previousSeats: 91, voteSharePercent: 41.2 },
      { id: 'oth', name: 'Others / અન્ય', shortName: 'OTH', color: '#64748b', lead: 12, won: 4, previousSeats: 99, voteSharePercent: 14.2 },
    ]
  },
  sports: {
    title: 'Championship / Tournament Battle / ટૂર્નામેન્ટ સ્કોર',
    totalSeats: 100,
    majoritySeats: 50,
    parties: [
      { id: 't1', name: 'Team Alpha / ટીમ A', shortName: 'Team A', color: '#3b82f6', lead: 42, won: 18, previousSeats: 50, voteSharePercent: 60.0 },
      { id: 't2', name: 'Team Beta / ટીમ B', shortName: 'Team B', color: '#ef4444', lead: 28, won: 12, previousSeats: 50, voteSharePercent: 40.0 },
    ]
  },
  poll: {
    title: 'Public Opinion Poll & Survey / લોકમત સર્વેક્ષણ',
    totalSeats: 100,
    majoritySeats: 51,
    parties: [
      { id: 'yes', name: 'Agree / સંમત (Yes)', shortName: 'Yes', color: '#10b981', lead: 58, won: 0, previousSeats: 50, voteSharePercent: 58.0 },
      { id: 'no', name: 'Disagree / અસંમત (No)', shortName: 'No', color: '#ef4444', lead: 32, won: 0, previousSeats: 35, voteSharePercent: 32.0 },
      { id: 'und', name: 'Undecided / અનિર્ણિત', shortName: 'Undecided', color: '#94a3b8', lead: 10, won: 0, previousSeats: 15, voteSharePercent: 10.0 },
    ]
  }
};

export function ElectionBlock({ block, selected = false }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes || {};

  // Multiple Battles / Wards list
  const battlesList: CandidateBattle[] = Array.isArray(a.battles) && a.battles.length > 0
    ? a.battles
    : [
        {
          id: 'b1',
          constituency: (a.battle as any)?.constituency || 'Ghatlodia / ઘાટલોડિયા (અમદાવાદ)',
          roundInfo: (a.battle as any)?.roundInfo || 'Round 8 of 14 Completed',
          candidates: Array.isArray((a.battle as any)?.candidates) && (a.battle as any)?.candidates.length > 0
            ? (a.battle as any)?.candidates
            : [
                {
                  id: 'c1',
                  name: (a.battle as any)?.candidate1?.name || 'Bhupendra Patel',
                  party: (a.battle as any)?.candidate1?.party || 'BJP',
                  color: (a.battle as any)?.candidate1?.color || '#f97316',
                  photoUrl: (a.battle as any)?.candidate1?.photoUrl || '',
                  votes: Number((a.battle as any)?.candidate1?.votes) || 84520,
                },
                {
                  id: 'c2',
                  name: (a.battle as any)?.candidate2?.name || 'Ami Yagnik',
                  party: (a.battle as any)?.candidate2?.party || 'INC',
                  color: (a.battle as any)?.candidate2?.color || '#0284c7',
                  photoUrl: (a.battle as any)?.candidate2?.photoUrl || '',
                  votes: Number((a.battle as any)?.candidate2?.votes) || 60170,
                }
              ]
        }
      ];

  const title = (a.title as string) || 'Live Tally & Results / લાઈવ ટેલી અને પરિણામ';
  const mode = (a.mode as ElectionMode) || 'tally-bar';
  const totalSeats = Number(a.totalSeats) || 182;
  const majoritySeats = Number(a.majoritySeats) || 92;
  const isLive = a.isLive !== false;
  const parties = (a.parties as ElectionParty[]) || PRESETS.gujarat.parties;

  const [isConfiguring, setIsConfiguring] = useState(false);

  const updateAttributes = (newAttrs: Record<string, unknown>) => {
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: {
        ...b.attributes,
        ...newAttrs,
      },
    }));
  };

  const handleApplyPreset = (presetKey: keyof typeof PRESETS) => {
    const p = PRESETS[presetKey];
    updateAttributes({
      title: p.title,
      totalSeats: p.totalSeats,
      majoritySeats: p.majoritySeats,
      parties: p.parties,
    });
  };

  const handleUpdateParty = (id: string, updates: Partial<ElectionParty>) => {
    const nextParties = parties.map((p) => (p.id === id ? { ...p, ...updates } : p));
    updateAttributes({ parties: nextParties });
  };

  const handleAddParty = () => {
    const newP: ElectionParty = {
      id: createId(),
      name: 'New Party',
      shortName: 'NEW',
      color: '#8b5cf6',
      lead: 0,
      won: 0,
      previousSeats: 0,
      voteSharePercent: 0,
    };
    updateAttributes({ parties: [...parties, newP] });
  };

  const handleDeleteParty = (id: string) => {
    updateAttributes({ parties: parties.filter((p) => p.id !== id) });
  };

  // Battles / Wards Handlers
  const handleAddBattle = () => {
    const defaultSeats = ['Varachha Road / વરાછા (સુરત)', 'Ellisbridge / એલિસબ્રિજ (અમદાવાદ)', 'Majura / મજુરા (સુરત)', 'Viramgam / વિરમગામ', 'Rajkot West / રાજકોટ પશ્ચિમ'];
    const seatName = defaultSeats[(battlesList.length - 1) % defaultSeats.length] || `Ward / Constituency ${battlesList.length + 1}`;

    const newBattle: CandidateBattle = {
      id: createId(),
      constituency: seatName,
      roundInfo: 'Round 1 of 12 Counting',
      candidates: [
        {
          id: createId(),
          name: 'Candidate 1',
          party: 'BJP',
          color: '#f97316',
          votes: 0,
          photoUrl: '',
        },
        {
          id: createId(),
          name: 'Candidate 2',
          party: 'INC',
          color: '#0284c7',
          votes: 0,
          photoUrl: '',
        },
        {
          id: createId(),
          name: 'Candidate 3',
          party: 'AAP',
          color: '#16a34a',
          votes: 0,
          photoUrl: '',
        }
      ]
    };
    updateAttributes({ battles: [...battlesList, newBattle] });
  };

  const handleDeleteBattle = (battleId: string) => {
    if (battlesList.length <= 1) return;
    const next = battlesList.filter((b) => b.id !== battleId);
    updateAttributes({ battles: next });
  };

  const handleUpdateBattle = (battleId: string, updates: Partial<CandidateBattle>) => {
    const next = battlesList.map((b) => (b.id === battleId ? { ...b, ...updates } : b));
    updateAttributes({ battles: next });
  };

  const handleAddCandidateToBattle = (battleId: string) => {
    const target = battlesList.find((b) => b.id === battleId);
    if (!target) return;
    const defaultParties = ['AAP', 'IND', 'BSP', 'NCP', 'SP', 'OTH'];
    const defaultColors = ['#16a34a', '#8b5cf6', '#0ea5e9', '#ec4899', '#eab308', '#64748b'];
    const idx = target.candidates.length % defaultParties.length;
    const newCandidate: Candidate = {
      id: createId(),
      name: `Candidate ${target.candidates.length + 1}`,
      party: defaultParties[idx],
      color: defaultColors[idx],
      votes: 0,
      photoUrl: '',
    };
    handleUpdateBattle(battleId, { candidates: [...target.candidates, newCandidate] });
  };

  const handleDeleteCandidateFromBattle = (battleId: string, candidateId: string) => {
    const target = battlesList.find((b) => b.id === battleId);
    if (!target || target.candidates.length <= 1) return;
    handleUpdateBattle(battleId, { candidates: target.candidates.filter((c) => c.id !== candidateId) });
  };

  const handleUpdateCandidateInBattle = (battleId: string, candidateId: string, updates: Partial<Candidate>) => {
    const target = battlesList.find((b) => b.id === battleId);
    if (!target) return;
    const nextCands = target.candidates.map((c) => (c.id === candidateId ? { ...c, ...updates } : c));
    handleUpdateBattle(battleId, { candidates: nextCands });
  };

  const handleCandidatePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, battleId: string, candidateId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    handleUpdateCandidateInBattle(battleId, candidateId, { photoUrl: url });
  };

  // Calculations
  const countedSeats = parties.reduce((sum, p) => sum + (Number(p.lead) || 0) + (Number(p.won) || 0), 0);
  const totalWonSeats = parties.reduce((sum, p) => sum + (Number(p.won) || 0), 0);

  return (
    <div className={`be-election-block my-6 w-full rounded-2xl border transition-all ${
      selected
        ? 'border-indigo-500/80 ring-2 ring-indigo-500/20 shadow-lg'
        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs'
    }`}>
      {/* Block Header Toolbar */}
      <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-slate-50 via-white to-orange-50/40 dark:from-gray-900 dark:via-gray-900 dark:to-orange-950/20 rounded-t-2xl space-y-2">
        {/* Row 1: Status Badge & Title */}
        <div className="flex items-center gap-2 w-full min-w-0">
          <button
            type="button"
            onClick={() => updateAttributes({ isLive: !isLive })}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black tracking-wider uppercase transition-all cursor-pointer shrink-0 ${
              isLive
                ? 'bg-red-600 text-white shadow-md shadow-red-500/30 animate-pulse'
                : 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            {isLive ? 'LIVE' : 'FINAL'}
          </button>

          <input
            type="text"
            value={title}
            onChange={(e) => updateAttributes({ title: e.target.value })}
            placeholder="Live Charts & Results..."
            className="flex-1 min-w-0 text-sm sm:text-base font-black text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-700 focus:border-indigo-500 outline-none px-1 py-0.5 truncate"
          />
        </div>

        {/* Row 2: Mode Selector Toolbar (100% width, no overlap) */}
        <div className="flex items-center justify-between gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => updateAttributes({ mode: 'tally-bar' })}
            className={`flex-1 min-w-0 py-1 px-1.5 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
              mode === 'tally-bar'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            title="Live Progress Chart Bar"
          >
            <BarChart3 size={12} className="shrink-0" />
            <span className="truncate">Chart</span>
          </button>

          <button
            type="button"
            onClick={() => updateAttributes({ mode: 'parliament-arch' })}
            className={`flex-1 min-w-0 py-1 px-1.5 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
              mode === 'parliament-arch'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            title="Parliament Semicircle Arch"
          >
            <Landmark size={12} className="shrink-0" />
            <span className="truncate">Arch</span>
          </button>

          <button
            type="button"
            onClick={() => updateAttributes({ mode: 'candidate-battle' })}
            className={`flex-1 min-w-0 py-1 px-1.5 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
              mode === 'candidate-battle'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            title="VIP Candidate Face-Off"
          >
            <Users size={12} className="shrink-0" />
            <span className="truncate">Battle</span>
          </button>

          <button
            type="button"
            onClick={() => updateAttributes({ mode: 'vote-share' })}
            className={`flex-1 min-w-0 py-1 px-1.5 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
              mode === 'vote-share'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            title="Vote Share % & Change"
          >
            <Layers size={12} className="shrink-0" />
            <span className="truncate">Share %</span>
          </button>

          <button
            type="button"
            onClick={() => setIsConfiguring(!isConfiguring)}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              isConfiguring
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Configure Seats & Parties"
          >
            <Settings2 size={13} />
          </button>
        </div>
      </div>

      {/* Quick Config Drawer */}
      {isConfiguring && (
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Quick Presets:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('gujarat')}
                className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 text-gray-700 dark:text-gray-300 cursor-pointer shadow-2xs"
              >
                🗳️ Gujarat Assembly
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('loksabha')}
                className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 text-gray-700 dark:text-gray-300 cursor-pointer shadow-2xs"
              >
                🗳️ General Election
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('sports')}
                className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 text-gray-700 dark:text-gray-300 cursor-pointer shadow-2xs"
              >
                🏆 Sports / Match Battle
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('poll')}
                className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 text-gray-700 dark:text-gray-300 cursor-pointer shadow-2xs"
              >
                📊 Opinion Poll / Survey
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                <span>Total Seats:</span>
                <input
                  type="number"
                  value={totalSeats}
                  onChange={(e) => updateAttributes({ totalSeats: Number(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 text-xs font-bold bg-white dark:bg-gray-800 border rounded-lg"
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                <span>Majority Mark:</span>
                <input
                  type="number"
                  value={majoritySeats}
                  onChange={(e) => updateAttributes({ majoritySeats: Number(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 text-xs font-bold bg-white dark:bg-gray-800 border rounded-lg"
                />
              </label>
            </div>
          </div>

          {/* Parties Config Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500">
                  <th className="py-1.5 px-2">Color</th>
                  <th className="py-1.5 px-2">Party Short Name</th>
                  <th className="py-1.5 px-2">Party Full Name</th>
                  <th className="py-1.5 px-2">Lead (આગળ)</th>
                  <th className="py-1.5 px-2">Won (જીત્યા)</th>
                  <th className="py-1.5 px-2">Prev Seats</th>
                  <th className="py-1.5 px-2">Vote Share %</th>
                  <th className="py-1.5 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {parties.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800/60">
                    <td className="py-1.5 px-2">
                      <input
                        type="color"
                        value={p.color}
                        onChange={(e) => handleUpdateParty(p.id, { color: e.target.value })}
                        className="w-6 h-6 rounded border-0 cursor-pointer p-0"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={p.shortName}
                        onChange={(e) => handleUpdateParty(p.id, { shortName: e.target.value })}
                        className="w-20 px-2 py-1 font-bold bg-white dark:bg-gray-800 border rounded-lg"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handleUpdateParty(p.id, { name: e.target.value })}
                        className="w-40 px-2 py-1 bg-white dark:bg-gray-800 border rounded-lg"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        value={p.lead}
                        onChange={(e) => handleUpdateParty(p.id, { lead: Number(e.target.value) || 0 })}
                        className="w-16 px-2 py-1 font-bold bg-white dark:bg-gray-800 border rounded-lg"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        value={p.won}
                        onChange={(e) => handleUpdateParty(p.id, { won: Number(e.target.value) || 0 })}
                        className="w-16 px-2 py-1 font-bold bg-white dark:bg-gray-800 border rounded-lg"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        value={p.previousSeats || 0}
                        onChange={(e) => handleUpdateParty(p.id, { previousSeats: Number(e.target.value) || 0 })}
                        className="w-16 px-2 py-1 bg-white dark:bg-gray-800 border rounded-lg"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        step="0.1"
                        value={p.voteSharePercent || 0}
                        onChange={(e) => handleUpdateParty(p.id, { voteSharePercent: Number(e.target.value) || 0 })}
                        className="w-16 px-2 py-1 bg-white dark:bg-gray-800 border rounded-lg"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteParty(p.id)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={handleAddParty}
              className="px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 border border-dashed border-indigo-300 dark:border-indigo-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus size={13} /> Add
            </button>
            <button
              type="button"
              onClick={() => setIsConfiguring(false)}
              className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-xl shadow-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Main Visualization Display */}
      <div className="p-3.5 sm:p-7 space-y-6">
        {/* MODE 1: MAJORITY MARK SEAT TRACKER */}
        {mode === 'tally-bar' && (
          <div className="space-y-5 sm:space-y-6">
            {/* Top Seat Summary Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-gray-500 dark:text-gray-400">
                  Total Declared / Trends: <strong className="text-gray-900 dark:text-white">{countedSeats} / {totalSeats}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                  Majority: <strong>{majoritySeats}</strong>
                </span>
                <span className="font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                  Won: <strong>{totalWonSeats}</strong>
                </span>
              </div>
            </div>

            {/* Visual Majority Mark Bar */}
            <div className="relative pt-6 pb-2">
              {/* Majority Needle Indicator with safe bounds */}
              <div
                className="absolute top-0 flex flex-col items-center z-10 -translate-x-1/2 transition-all duration-300 pointer-events-none"
                style={{ left: `${Math.min(88, Math.max(12, totalSeats > 0 ? (majoritySeats / totalSeats) * 100 : 50))}%` }}
              >
                <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-black text-white dark:bg-white dark:text-black shadow-xs whitespace-nowrap">
                  Majority: {majoritySeats}
                </span>
                <div className="w-0.5 h-12 bg-black dark:bg-white shadow-xs" />
              </div>

              {/* Progress Bar Segments */}
              <div className="h-8 sm:h-9 w-full rounded-xl overflow-hidden flex bg-gray-100 dark:bg-gray-800 shadow-inner border border-gray-200 dark:border-gray-700">
                {parties.map((p) => {
                  const partyTotal = (Number(p.lead) || 0) + (Number(p.won) || 0);
                  const widthPercent = totalSeats > 0 ? (partyTotal / totalSeats) * 100 : 0;
                  if (widthPercent <= 0) return null;

                  return (
                    <div
                      key={p.id}
                      style={{ width: `${widthPercent}%`, backgroundColor: p.color }}
                      className="h-full relative flex items-center justify-center text-white font-black text-[11px] sm:text-xs transition-all duration-500 overflow-hidden px-1 shadow-xs"
                      title={`${p.name}: ${partyTotal} seats`}
                    >
                      {widthPercent >= 14 && (
                        <span className="drop-shadow-sm truncate px-1 text-[11px] sm:text-xs">
                          {p.shortName} {partyTotal}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Party Tally Cards Grid (Container-Responsive auto-fit) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              {parties.map((p) => {
                const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
                const isMajority = total >= majoritySeats;

                return (
                  <div
                    key={p.id}
                    className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all min-w-0 ${
                      isMajority
                        ? 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: p.color }} />
                        <span className="font-black text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                          {p.shortName}
                        </span>
                      </div>
                      {isMajority && <Trophy size={13} className="text-amber-500 shrink-0" />}
                    </div>

                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                        {total}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">Total</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[11px] sm:text-xs pt-1.5 border-t border-gray-100 dark:border-gray-700/60 gap-1">
                      <span className="text-gray-500 dark:text-gray-400">
                        Lead: <strong className="text-gray-800 dark:text-gray-200">{p.lead}</strong>
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Won: {p.won}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODE 2: MULTI-CHART & VISUALIZATIONS (UNLIMITED SIMULTANEOUS CHARTS) */}
        {mode === 'parliament-arch' && (() => {
          const ALL_CHART_TYPES = [
            'parliament-arch',
            'donut',
            'pie',
            'bar',
            'horizontal-bar',
            'line',
            'stacked-bar',
            'area',
            'gauge',
            'table'
          ];

          const rawCharts = (block.attributes.charts as string[]) || (block.attributes.chartType ? [block.attributes.chartType as string] : ['parliament-arch']);
          const chartsList = rawCharts.length > 0 ? rawCharts : ['parliament-arch'];

          const handleAddChartSlot = () => {
            const nextType = ALL_CHART_TYPES.find((t) => !chartsList.includes(t)) || 'donut';
            updateAttributes({ charts: [...chartsList, nextType] });
          };

          const handleUpdateChartSlot = (idx: number, newType: string) => {
            const updated = [...chartsList];
            updated[idx] = newType;
            updateAttributes({ charts: updated });
          };

          const handleDeleteChartSlot = (idx: number) => {
            if (chartsList.length <= 1) return;
            const updated = chartsList.filter((_, i) => i !== idx);
            updateAttributes({ charts: updated });
          };

          const validParties = parties.filter((p) => (Number(p.lead) || 0) + (Number(p.won) || 0) > 0);
          const activeParties = validParties.length > 0 ? validParties : parties;

          const renderSingleChartBody = (chartType: string) => {
            switch (chartType) {
              case 'donut': {
                let currentAngle = -Math.PI / 2;
                const cx = 150;
                const cy = 150;
                const rOut = 120;
                const rIn = 70;

                return (
                  <div className="relative w-full max-w-xs aspect-square flex items-center justify-center mx-auto">
                    <svg viewBox="0 0 300 300" className="w-full h-full">
                      {activeParties.map((p) => {
                        const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
                        if (total <= 0) return null;
                        const span = (total / (totalSeats || 182)) * (2 * Math.PI);
                        const startA = currentAngle;
                        const endA = currentAngle + span;
                        currentAngle = endA;

                        const x1 = cx + rOut * Math.cos(startA);
                        const y1 = cy + rOut * Math.sin(startA);
                        const x2 = cx + rOut * Math.cos(endA);
                        const y2 = cy + rOut * Math.sin(endA);

                        const x3 = cx + rIn * Math.cos(endA);
                        const y3 = cy + rIn * Math.sin(endA);
                        const x4 = cx + rIn * Math.cos(startA);
                        const y4 = cy + rIn * Math.sin(startA);

                        const largeArc = span > Math.PI ? 1 : 0;
                        const d = `M ${x1},${y1} A ${rOut},${rOut} 0 ${largeArc},1 ${x2},${y2} L ${x3},${y3} A ${rIn},${rIn} 0 ${largeArc},0 ${x4},${y4} Z`;

                        return (
                          <path
                            key={p.id}
                            d={d}
                            fill={p.color}
                            className="transition-all duration-300 hover:opacity-90 stroke-white dark:stroke-gray-900 stroke-2"
                          />
                        );
                      })}
                      <circle cx="150" cy="150" r="66" className="fill-white dark:fill-gray-900" />
                      <text x="150" y="142" textAnchor="middle" className="font-black text-2xl fill-gray-900 dark:fill-white font-sans font-bold">
                        {countedSeats}
                      </text>
                      <text x="150" y="162" textAnchor="middle" className="text-[10px] font-bold fill-gray-400 font-sans">
                        of {totalSeats} Declared
                      </text>
                    </svg>
                  </div>
                );
              }

              case 'pie': {
                let currentAngle = -Math.PI / 2;
                const cx = 150;
                const cy = 150;
                const r = 120;

                return (
                  <div className="relative w-full max-w-xs aspect-square flex items-center justify-center mx-auto">
                    <svg viewBox="0 0 300 300" className="w-full h-full">
                      {activeParties.map((p) => {
                        const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
                        if (total <= 0) return null;
                        const span = (total / (totalSeats || 182)) * (2 * Math.PI);
                        const startA = currentAngle;
                        const endA = currentAngle + span;
                        currentAngle = endA;

                        const x1 = cx + r * Math.cos(startA);
                        const y1 = cy + r * Math.sin(startA);
                        const x2 = cx + r * Math.cos(endA);
                        const y2 = cy + r * Math.sin(endA);

                        const largeArc = span > Math.PI ? 1 : 0;
                        const d = `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;

                        return (
                          <path
                            key={p.id}
                            d={d}
                            fill={p.color}
                            className="transition-all duration-300 hover:opacity-90 stroke-white dark:stroke-gray-900 stroke-2"
                          />
                        );
                      })}
                    </svg>
                  </div>
                );
              }

              case 'bar': {
                const majY = 140 - (majoritySeats / (totalSeats || 182)) * 120;
                const barWidth = Math.min(44, (280 / activeParties.length) - 10);
                const gap = (280 - barWidth * activeParties.length) / (activeParties.length + 1);

                return (
                  <div className="w-full aspect-[16/10] flex items-center justify-center p-2 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200/80 dark:border-gray-700">
                    <svg viewBox="0 0 340 180" className="w-full h-full">
                      <line x1="40" y1="20" x2="330" y2="20" stroke="#e2e8f0" strokeDasharray="3,3" className="dark:stroke-gray-700" />
                      <line x1="40" y1="60" x2="330" y2="60" stroke="#e2e8f0" strokeDasharray="3,3" className="dark:stroke-gray-700" />
                      <line x1="40" y1="100" x2="330" y2="100" stroke="#e2e8f0" strokeDasharray="3,3" className="dark:stroke-gray-700" />
                      <line x1="40" y1="140" x2="330" y2="140" stroke="#cbd5e1" strokeWidth="1.5" className="dark:stroke-gray-600" />

                      <line x1="40" y1={majY} x2="330" y2={majY} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,4" />
                      <text x="330" y={majY - 4} textAnchor="end" className="fill-amber-600 text-[8.5px] font-black font-sans">
                        Majority ({majoritySeats})
                      </text>

                      {activeParties.map((p, pIdx) => {
                        const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
                        const barHeight = Math.max(4, (total / (totalSeats || 182)) * 120);
                        const x = 45 + gap + pIdx * (barWidth + gap);
                        const y = 140 - barHeight;

                        return (
                          <g key={p.id}>
                            <rect x={x} y={y} width={barWidth} height={barHeight} fill={p.color} rx="6" className="transition-all duration-500 hover:opacity-90" />
                            <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" className="fill-gray-900 dark:fill-white font-black text-[10px] font-sans">{total}</text>
                            <text x={x + barWidth / 2} y="156" textAnchor="middle" className="fill-gray-600 dark:fill-gray-300 font-bold text-[9.5px] font-sans">{p.shortName}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              }

              case 'horizontal-bar': {
                return (
                  <div className="w-full space-y-2.5 p-2 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200/80 dark:border-gray-700">
                    {activeParties.map((p) => {
                      const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
                      const pct = totalSeats > 0 ? ((total / totalSeats) * 100).toFixed(1) : '0';
                      const isMajority = total >= majoritySeats;

                      return (
                        <div key={p.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                              <span className="text-gray-900 dark:text-white truncate">{p.shortName}</span>
                              {isMajority && <span className="text-[8px] bg-amber-500 text-white font-black px-1 py-0.2 rounded-full">🏆 WIN</span>}
                            </div>
                            <div className="text-gray-900 dark:text-white text-xs shrink-0">
                              <strong>{total}</strong> <span className="text-gray-400 font-normal text-[10px]">({pct}%)</span>
                            </div>
                          </div>

                          <div className="w-full h-3 bg-gray-200/80 dark:bg-gray-700 rounded-full overflow-hidden flex">
                            <div style={{ width: `${Math.min(100, (total / (totalSeats || 182)) * 100)}%`, backgroundColor: p.color }} className="h-full rounded-full transition-all duration-500" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              case 'line': {
                return (
                  <div className="w-full aspect-[16/10] flex items-center justify-center p-2 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200/80 dark:border-gray-700">
                    <svg viewBox="0 0 340 180" className="w-full h-full">
                      <line x1="30" y1="30" x2="330" y2="30" stroke="#e2e8f0" strokeDasharray="3,3" className="dark:stroke-gray-700" />
                      <line x1="30" y1="80" x2="330" y2="80" stroke="#e2e8f0" strokeDasharray="3,3" className="dark:stroke-gray-700" />
                      <line x1="30" y1="130" x2="330" y2="130" stroke="#e2e8f0" strokeDasharray="3,3" className="dark:stroke-gray-700" />
                      <line x1="30" y1="150" x2="330" y2="150" stroke="#cbd5e1" strokeWidth="1.5" className="dark:stroke-gray-600" />

                      {activeParties.map((p) => {
                        const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
                        const p1 = 150 - ((total * 0.25) / (totalSeats || 182)) * 130;
                        const p2 = 150 - ((total * 0.55) / (totalSeats || 182)) * 130;
                        const p3 = 150 - ((total * 0.8) / (totalSeats || 182)) * 130;
                        const p4 = 150 - (total / (totalSeats || 182)) * 130;
                        const points = `45,${p1} 130,${p2} 220,${p3} 310,${p4}`;

                        return (
                          <g key={p.id}>
                            <polyline fill="none" stroke={p.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
                            <circle cx="310" cy={p4} r="4" fill={p.color} className="stroke-white dark:stroke-gray-900 stroke-2" />
                            <text x="310" y={p4 - 6} textAnchor="middle" className="fill-gray-900 dark:fill-white font-black text-[9px]">{total}</text>
                          </g>
                        );
                      })}
                      <text x="45" y="165" textAnchor="middle" className="fill-gray-400 text-[8px]">R1</text>
                      <text x="130" y="165" textAnchor="middle" className="fill-gray-400 text-[8px]">R5</text>
                      <text x="220" y="165" textAnchor="middle" className="fill-gray-400 text-[8px]">R10</text>
                      <text x="310" y="165" textAnchor="middle" className="fill-gray-400 text-[8px]">Now</text>
                    </svg>
                  </div>
                );
              }

              case 'stacked-bar': {
                return (
                  <div className="w-full space-y-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200/80 dark:border-gray-700">
                    <div className="relative pt-5 pb-1">
                      <div
                        className="absolute top-0 flex flex-col items-center z-10 -translate-x-1/2"
                        style={{ left: `${(majoritySeats / (totalSeats || 182)) * 100}%` }}
                      >
                        <span className="text-[8.5px] font-black uppercase px-1 py-0.5 rounded bg-amber-500 text-white shadow-xs">
                          Maj ({majoritySeats})
                        </span>
                        <div className="w-0.5 h-10 bg-amber-500 shadow-sm" />
                      </div>

                      <div className="w-full h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex shadow-inner">
                        {activeParties.map((p) => {
                          const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
                          const width = totalSeats > 0 ? (total / totalSeats) * 100 : 0;
                          if (width <= 0) return null;

                          return (
                            <div
                              key={p.id}
                              style={{ width: `${width}%`, backgroundColor: p.color }}
                              className="h-full flex items-center justify-center text-white font-black text-[11px] truncate px-0.5"
                            >
                              {width >= 10 && `${p.shortName} ${total}`}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              case 'area': {
                return (
                  <div className="w-full aspect-[16/10] flex items-center justify-center p-2 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200/80 dark:border-gray-700">
                    <svg viewBox="0 0 340 180" className="w-full h-full">
                      <defs>
                        {activeParties.map((p) => (
                          <linearGradient key={`grad_m_${p.id}`} id={`area_grad_m_${p.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={p.color} stopOpacity="0.6" />
                            <stop offset="100%" stopColor={p.color} stopOpacity="0.05" />
                          </linearGradient>
                        ))}
                      </defs>
                      <line x1="30" y1="150" x2="330" y2="150" stroke="#cbd5e1" strokeWidth="1.5" className="dark:stroke-gray-600" />
                      {activeParties.map((p) => {
                        const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
                        const yPeak = 150 - (total / (totalSeats || 182)) * 125;
                        const d = `M 30,150 C 90,140 120,${yPeak} 180,${yPeak} C 240,${yPeak} 270,145 330,150 Z`;

                        return (
                          <g key={p.id}>
                            <path d={d} fill={`url(#area_grad_m_${p.id})`} />
                            <path d={`M 30,150 C 90,140 120,${yPeak} 180,${yPeak} C 240,${yPeak} 270,145 330,150`} fill="none" stroke={p.color} strokeWidth="2.5" />
                            <circle cx="180" cy={yPeak} r="4" fill={p.color} className="stroke-white dark:stroke-gray-900 stroke-2" />
                            <text x="180" y={yPeak - 6} textAnchor="middle" className="fill-gray-900 dark:fill-white font-black text-[9px]">{p.shortName} ({total})</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              }

              case 'gauge': {
                const leader = [...parties].sort((a, b) => ((Number(b.lead) || 0) + (Number(b.won) || 0)) - ((Number(a.lead) || 0) + (Number(a.won) || 0)))[0];
                const leaderTotal = leader ? (Number(leader.lead) || 0) + (Number(leader.won) || 0) : 0;
                const ratio = Math.min(1, Math.max(0, leaderTotal / (totalSeats || 182)));
                const needleAngle = Math.PI - ratio * Math.PI;
                const nx = 150 + 80 * Math.cos(needleAngle);
                const ny = 150 - 80 * Math.sin(needleAngle);

                const majRatio = Math.min(1, Math.max(0, majoritySeats / (totalSeats || 182)));
                const majAngle = Math.PI - majRatio * Math.PI;
                const mx = 150 + 105 * Math.cos(majAngle);
                const my = 150 - 105 * Math.sin(majAngle);

                return (
                  <div className="relative w-full max-w-xs aspect-[2/1] flex flex-col items-center justify-center mx-auto">
                    <svg viewBox="0 0 300 165" className="w-full h-full">
                      <path d="M 35,150 A 115,115 0 0,1 265,150" fill="none" stroke="#e2e8f0" strokeWidth="24" strokeLinecap="round" className="dark:stroke-gray-800" />
                      {leader && (
                        <path
                          d={`M 35,150 A 115,115 0 0,1 ${150 + 115 * Math.cos(needleAngle)},${150 - 115 * Math.sin(needleAngle)}`}
                          fill="none"
                          stroke={leader.color}
                          strokeWidth="24"
                          strokeLinecap="round"
                        />
                      )}
                      <line x1={mx} y1={my} x2={150 + 125 * Math.cos(majAngle)} y2={150 - 125 * Math.sin(majAngle)} stroke="#f59e0b" strokeWidth="3" />
                      <line x1="150" y1="150" x2={nx} y2={ny} stroke="#0f172a" strokeWidth="3" strokeLinecap="round" className="dark:stroke-white" />
                      <circle cx="150" cy="150" r="7" fill="#0f172a" className="dark:fill-white" />
                      <text x="150" y="115" textAnchor="middle" className="font-black text-lg fill-gray-900 dark:fill-white font-sans">
                        {leader ? `${leader.shortName}: ${leaderTotal}` : 'No Data'}
                      </text>
                      <text x="150" y="135" textAnchor="middle" className="text-[9.5px] font-bold fill-gray-400 font-sans">
                        {leaderTotal >= majoritySeats ? `🏆 Majority Won (+${leaderTotal - majoritySeats})` : `${majoritySeats - leaderTotal} to Majority`}
                      </text>
                    </svg>
                  </div>
                );
              }

              case 'table': {
                return (
                  <div className="w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="py-2 px-2.5">Party</th>
                          <th className="py-2 px-2 text-center">Lead</th>
                          <th className="py-2 px-2 text-center">Won</th>
                          <th className="py-2 px-2 text-center">Total</th>
                          <th className="py-2 px-2 text-center">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                        {parties.map((p) => {
                          const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
                          const share = totalSeats > 0 ? ((total / totalSeats) * 100).toFixed(1) : '0';

                          return (
                            <tr key={p.id}>
                              <td className="py-1.5 px-2.5 font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                                <span>{p.shortName}</span>
                              </td>
                              <td className="py-1.5 px-2 text-center text-gray-700 dark:text-gray-300">{p.lead}</td>
                              <td className="py-1.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">{p.won}</td>
                              <td className="py-1.5 px-2 text-center font-black text-gray-900 dark:text-white">{total}</td>
                              <td className="py-1.5 px-2 text-center text-gray-500">{share}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              }

              default:
              case 'parliament-arch': {
                return (
                  <div className="relative w-full max-w-xs aspect-[2/1] flex items-center justify-center mx-auto">
                    <svg viewBox="0 0 300 160" className="w-full h-full">
                      <path d="M 30,150 A 120,120 0 0,1 270,150" fill="none" stroke="#e2e8f0" strokeWidth="28" strokeLinecap="round" className="dark:stroke-gray-800" />
                      {(() => {
                        let currentAngle = Math.PI;
                        const radius = 120;
                        const cx = 150;
                        const cy = 150;

                        return activeParties.map((p) => {
                          const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
                          if (total <= 0) return null;
                          const angleSpan = (total / (totalSeats || 182)) * Math.PI;
                          const startA = currentAngle;
                          const endA = currentAngle - angleSpan;
                          currentAngle = endA;

                          const x1 = cx + radius * Math.cos(startA);
                          const y1 = cy - radius * Math.sin(startA);
                          const x2 = cx + radius * Math.cos(endA);
                          const y2 = cy - radius * Math.sin(endA);

                          return (
                            <path
                              key={p.id}
                              d={`M ${x1},${y1} A ${radius},${radius} 0 0,1 ${x2},${y2}`}
                              fill="none"
                              stroke={p.color}
                              strokeWidth="28"
                              strokeLinecap="butt"
                              className="transition-all duration-500 hover:opacity-90"
                            />
                          );
                        });
                      })()}
                      <text x="150" y="125" textAnchor="middle" className="font-black text-xl fill-gray-900 dark:fill-white font-sans font-bold">
                        {totalSeats}
                      </text>
                      <text x="150" y="145" textAnchor="middle" className="text-[10px] font-bold fill-gray-400 font-sans">
                        Total Assembly Seats
                      </text>
                    </svg>
                  </div>
                );
              }
            }
          };

          return (
            <div className="space-y-6 flex flex-col items-center w-full">
              {/* Top Toolbar: Clean Header & + Add Chart Button */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-200 dark:border-gray-800 w-full">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-gray-500 uppercase tracking-wider">
                    Total Seats: <strong className="text-gray-900 dark:text-white">{totalSeats}</strong> | Majority: <strong className="text-amber-600 dark:text-amber-400">{majoritySeats}</strong>
                  </span>
                </div>

                {/* + Add Chart Button */}
                <button
                  type="button"
                  onClick={handleAddChartSlot}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/20 shrink-0"
                >
                  <Plus size={13} />
                  <span>+ Add Chart ({chartsList.length})</span>
                </button>
              </div>

              {/* Multi-Chart Responsive Grid (Unlimited) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: chartsList.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px',
                  width: '100%',
                }}
              >
                {chartsList.map((cType, cIdx) => (
                  <div
                    key={`chart_slot_${cIdx}`}
                    className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 shadow-xs space-y-3.5 flex flex-col justify-between"
                  >
                    {/* Chart Header: Slot Number + Independent Dropdown Selector + Delete */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-[10px] flex items-center justify-center shrink-0">
                          {cIdx + 1}
                        </span>

                        <div className="relative">
                          <select
                            value={cType}
                            onChange={(e) => handleUpdateChartSlot(cIdx, e.target.value)}
                            className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl pl-2.5 pr-7 py-1 appearance-none cursor-pointer outline-none shadow-2xs"
                          >
                            <option value="parliament-arch">🏛️ Parliament Arch</option>
                            <option value="donut">🍩 Donut Chart</option>
                            <option value="pie">🥧 Pie Chart</option>
                            <option value="bar">📊 Bar Chart (Vertical)</option>
                            <option value="horizontal-bar">📈 Horizontal Bar</option>
                            <option value="line">📉 Line Chart (Trends)</option>
                            <option value="stacked-bar">🧱 Stacked Bar</option>
                            <option value="area">🌊 Area Chart</option>
                            <option value="gauge">⏱️ Gauge Speedometer</option>
                            <option value="table">📋 Data Table</option>
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500" />
                        </div>
                      </div>

                      {/* Delete Chart Button */}
                      {chartsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteChartSlot(cIdx)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer shrink-0"
                          title="Remove this chart"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* Chart Body Render */}
                    <div className="flex-1 flex items-center justify-center">
                      {renderSingleChartBody(cType)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Big Add Chart Button */}
              <button
                type="button"
                onClick={handleAddChartSlot}
                className="w-full py-3 px-4 border-2 border-dashed border-indigo-200 dark:border-indigo-900 hover:border-indigo-500 dark:hover:border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <Plus size={15} />
                <span>+ Add Another Chart / નવો ચાર્ટ ઉમેરો (ગમે તેટલા ચાર્ટ્સ ઉમેરી શકો છો)</span>
              </button>

              {/* Legend & Seat Share Grid (Common footer) */}
              <div className="flex flex-wrap items-center justify-center gap-2 w-full pt-2">
                {parties.map((p) => {
                  const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
                  const percent = totalSeats > 0 ? ((total / totalSeats) * 100).toFixed(1) : '0';

                  return (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-2xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="font-bold text-xs text-gray-900 dark:text-white">{p.shortName}:</span>
                      <strong className="text-xs text-gray-900 dark:text-white">{total}</strong>
                      <span className="text-[10px] text-gray-400">({percent}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* MODE 3: VIP CANDIDATE BATTLE (MULTIPLE WARDS / CONSTITUENCIES) */}
        {mode === 'candidate-battle' && (
          <div className="space-y-6">
            {/* Top Toolbar: Section Title & + Add Seat Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                  VIP Key Contests / Constituency Battles / મુખ્ય બેઠકો
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Manage multiple wards or head-to-head seat battles
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddBattle}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/20 shrink-0"
              >
                <Plus size={13} />
                <span>+ Add Ward / Constituency</span>
              </button>
            </div>

            {/* List of Wards / Constituencies */}
            <div className="space-y-6">
              {battlesList.map((battle, bIdx) => {
                const maxVotes = Math.max(...battle.candidates.map((c) => Number(c.votes) || 0));
                const sortedVotes = [...battle.candidates.map((c) => Number(c.votes) || 0)].sort((x, y) => y - x);
                const secondMax = sortedVotes[1] || 0;
                const leadMargin = maxVotes - secondMax;

                return (
                  <div
                    key={battle.id || bIdx}
                    className="p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/40 space-y-4 relative"
                  >
                    {/* Ward / Seat Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
                          {bIdx + 1}
                        </span>

                        <div className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex-1 min-w-[140px]">
                          <input
                            type="text"
                            value={battle.constituency}
                            onChange={(e) => handleUpdateBattle(battle.id, { constituency: e.target.value })}
                            placeholder="Constituency / Ward Name..."
                            className="text-sm sm:text-base font-bold text-gray-900 dark:text-white bg-transparent outline-none w-full"
                          />
                          <Pencil size={11} className="text-gray-400 shrink-0" />
                        </div>

                        <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-full border border-indigo-100 dark:border-indigo-900/50">
                          <input
                            type="text"
                            value={battle.roundInfo}
                            onChange={(e) => handleUpdateBattle(battle.id, { roundInfo: e.target.value })}
                            placeholder="Round Status..."
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-transparent outline-none w-28 sm:w-36 text-center"
                          />
                        </div>
                      </div>

                      {/* Ward Action Buttons: + Add Candidate & Delete Seat */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAddCandidateToBattle(battle.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-white dark:bg-gray-800 hover:bg-indigo-50 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-all cursor-pointer shadow-2xs"
                          title="Add candidate to this constituency"
                        >
                          <Plus size={12} />
                          <span>+ Candidate</span>
                        </button>

                        {battlesList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteBattle(battle.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                            title="Delete this entire constituency"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Candidate Cards Grid for this Seat (Compact & Sleek) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                      {battle.candidates.map((cand, candIdx) => {
                        const candVotes = Number(cand.votes) || 0;
                        const computedLeading = maxVotes > 0 && candVotes === maxVotes;
                        const currentStatus = cand.statusOverride || (computedLeading ? 'leading' : 'trailing');
                        const isLeading = currentStatus === 'leading' || currentStatus === 'won';
                        const fileInputId = `cand_photo_${battle.id}_${cand.id || candIdx}`;

                        return (
                          <div
                            key={cand.id || candIdx}
                            className={`p-3 rounded-xl sm:rounded-2xl border transition-all space-y-2 relative group ${
                              isLeading
                                ? 'border-2 border-emerald-500 bg-white dark:bg-gray-900 shadow-sm'
                                : 'border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 shadow-xs'
                            }`}
                          >
                            {/* Top Row: Photo + Badges + Candidate Name + Delete */}
                            <div className="flex items-start gap-2.5">
                              {/* Compact Photo */}
                              <div
                                className="relative cursor-pointer shrink-0 mt-0.5"
                                onClick={() => document.getElementById(fileInputId)?.click()}
                                title="Click to upload candidate photo"
                              >
                                <input
                                  id={fileInputId}
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleCandidatePhotoUpload(e, battle.id, cand.id)}
                                  className="hidden"
                                />
                                <div className={`w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center border ${
                                  isLeading ? 'border-emerald-500' : 'border-gray-200 dark:border-gray-700'
                                }`}>
                                  {cand.photoUrl ? (
                                    <img src={cand.photoUrl} alt={cand.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Users size={18} className="text-gray-400" />
                                  )}
                                </div>
                                <span className="absolute -bottom-1 -right-1 p-0.5 rounded-md bg-white dark:bg-gray-800 text-gray-600 shadow-xs text-[8px] border border-gray-200 dark:border-gray-700">
                                  <Upload size={8} />
                                </span>
                              </div>

                              {/* Center Details */}
                              <div className="flex-1 min-w-0">
                                {/* Badges Line: Party + Status (Perfect Pixel Alignment) */}
                                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                                  {/* Party Tag & Color Picker Pill */}
                                  <div className="inline-flex items-center gap-1.5 h-6 px-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200/90 dark:border-gray-700 shadow-2xs">
                                    <label
                                      className="relative flex items-center justify-center w-3 h-3 rounded-full cursor-pointer shadow-2xs border border-white/90 shrink-0"
                                      style={{ backgroundColor: cand.color || '#f97316' }}
                                      title="Click to pick party color"
                                    >
                                      <input
                                        type="color"
                                        value={cand.color || '#f97316'}
                                        onChange={(e) => handleUpdateCandidateInBattle(battle.id, cand.id, { color: e.target.value })}
                                        className="w-full h-full opacity-0 absolute inset-0 cursor-pointer"
                                      />
                                    </label>
                                    <input
                                      type="text"
                                      value={cand.party}
                                      onChange={(e) => handleUpdateCandidateInBattle(battle.id, cand.id, { party: e.target.value })}
                                      placeholder="Party"
                                      className="text-[10.5px] font-black uppercase text-gray-800 dark:text-gray-200 bg-transparent w-12 outline-none leading-none p-0"
                                    />
                                  </div>

                                  {/* Status Dropdown Pill */}
                                  <div className="relative inline-flex items-center h-6">
                                    <select
                                      value={currentStatus}
                                      onChange={(e) => handleUpdateCandidateInBattle(battle.id, cand.id, { statusOverride: e.target.value as any })}
                                      className={`h-6 text-[10px] font-black uppercase rounded-lg pl-2 pr-5 appearance-none cursor-pointer shadow-2xs border outline-none flex items-center leading-none transition-colors ${
                                        currentStatus === 'won'
                                          ? 'bg-amber-500 text-white border-amber-600'
                                          : currentStatus === 'leading'
                                          ? 'bg-emerald-600 text-white border-emerald-500'
                                          : currentStatus === 'lost'
                                          ? 'bg-rose-600 text-white border-rose-500'
                                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200/90 dark:border-gray-700'
                                      }`}
                                    >
                                      <option value="leading" className="text-gray-900 bg-white">● LEADING</option>
                                      <option value="trailing" className="text-gray-900 bg-white">TRAILING</option>
                                      <option value="won" className="text-gray-900 bg-white">🏆 WON</option>
                                      <option value="lost" className="text-gray-900 bg-white">LOST</option>
                                    </select>
                                    <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-80" />
                                  </div>
                                </div>

                                {/* Candidate Name Input */}
                                <input
                                  type="text"
                                  value={cand.name}
                                  onChange={(e) => handleUpdateCandidateInBattle(battle.id, cand.id, { name: e.target.value })}
                                  placeholder="Candidate Name..."
                                  className="w-full text-xs sm:text-sm font-bold text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-700 focus:border-indigo-500 outline-none pb-0.5 truncate"
                                />
                              </div>

                              {/* Delete Candidate Button */}
                              {battle.candidates.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCandidateFromBattle(battle.id, cand.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer shrink-0"
                                  title="Remove candidate"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>

                            {/* Compact Bottom Row: Votes + Margin */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[10px] font-bold text-gray-400 shrink-0">Votes:</span>
                                <input
                                  type="number"
                                  value={cand.votes}
                                  onChange={(e) => handleUpdateCandidateInBattle(battle.id, cand.id, { votes: Number(e.target.value) || 0 })}
                                  className="text-xs sm:text-sm font-black text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-200/80 dark:border-gray-700 w-20 outline-none"
                                />
                              </div>

                              <div className="text-right shrink-0">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  isLeading
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                                }`}>
                                  {isLeading
                                    ? `+${leadMargin.toLocaleString()} Lead`
                                    : maxVotes > candVotes
                                    ? `-${(maxVotes - candVotes).toLocaleString()} Behind`
                                    : 'Tied'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Big Add Constituency Button */}
            <button
              type="button"
              onClick={handleAddBattle}
              className="w-full py-3.5 px-4 border-2 border-dashed border-indigo-200 dark:border-indigo-900 hover:border-indigo-500 dark:hover:border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Plus size={16} />
              <span>+ Add Another Ward / Constituency / અન્ય બેઠક ઉમેરો</span>
            </button>
          </div>
        )}

        {/* MODE 4: VOTE SHARE % & COMPARISON */}
        {mode === 'vote-share' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Party-Wise Vote Share % & Seat Gain/Loss vs Previous Election
            </h4>

            <div className="space-y-3">
              {parties.map((p) => {
                const total = (Number(p.lead) || 0) + (Number(p.won) || 0);
                const prev = Number(p.previousSeats) || 0;
                const diff = total - prev;
                const share = Number(p.voteSharePercent) || 0;

                return (
                  <div key={p.id} className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{p.name} ({p.shortName})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {diff !== 0 && (
                          <span className={`inline-flex items-center gap-0.5 text-xs font-black px-2 py-0.5 rounded ${
                            diff > 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}>
                            {diff > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {diff > 0 ? `+${diff}` : `${diff}`} seats
                          </span>
                        )}
                        <strong className="text-sm font-black text-gray-900 dark:text-white">{share}%</strong>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, share)}%`, backgroundColor: p.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
