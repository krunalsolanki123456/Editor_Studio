import { useState } from 'react';
import {
  Vote, Plus, Trash2, RotateCcw,
  Eye, Edit3, Check, Lock, Unlock, PlayCircle, AlertCircle
} from 'lucide-react';
import type { BlockInstance } from '../types';
import { useEditorStore } from '../store';

interface PollOption {
  id: string;
  text: string;
  votes: number;
  color: string;
}

interface PollBlockProps {
  block: BlockInstance;
  selected?: boolean;
}

export function PollBlock({ block, selected }: PollBlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);

  const question = (block.attributes.question as string) || '';
  const description = (block.attributes.description as string) || '';
  const isClosed = Boolean(block.attributes.isClosed);
  const showResults = (block.attributes.showResults as boolean) ?? true;
  const allowRevote = (block.attributes.allowRevote as boolean) ?? true;

  const options: PollOption[] = (block.attributes.options as PollOption[]) || [];

  // Local state for the "Create New Poll" form (when no options exist)
  const [createQuestion, setCreateQuestion] = useState(question || '');
  const [createDescription, setCreateDescription] = useState(description || '');
  const [createOptions, setCreateOptions] = useState<Array<{ id: string; text: string; color: string }>>([
    { id: '1', text: '', color: '#f97316' },
    { id: '2', text: '', color: '#0284c7' },
  ]);

  const [selectedVoteId, setSelectedVoteId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const updateAttributes = (newAttrs: Record<string, unknown>) => {
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: {
        ...b.attributes,
        ...newAttrs,
      },
    }));
  };

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    const validQuestion = createQuestion.trim() || 'Public Opinion Poll';
    const validOptions: PollOption[] = createOptions
      .map((opt, idx) => ({
        id: `opt-${Date.now()}-${idx}`,
        text: opt.text.trim() || `Option ${idx + 1}`,
        votes: 0,
        color: opt.color || '#3b82f6',
      }));

    if (validOptions.length < 2) return;

    updateAttributes({
      question: validQuestion,
      description: createDescription.trim(),
      options: validOptions,
    });
  };

  // If no options exist yet, show the "Create Poll" initial form
  if (options.length === 0) {
    const defaultColors = ['#f97316', '#0284c7', '#16a34a', '#8b5cf6', '#ec4899', '#eab308', '#64748b'];

    return (
      <div
        className={`relative my-4 rounded-2xl border transition-all duration-300 overflow-hidden ${
          selected
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
            : 'border-gray-200 dark:border-gray-700/80 shadow-xs'
        } bg-white dark:bg-gray-900 p-4 sm:p-6`}
      >
        <form onSubmit={handleCreatePoll} className="space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-800">
            <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 12 2 2 4-4" />
                <path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7z" />
                <line x1="9" y1="18" x2="15" y2="18" />
              </svg>
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                Create Opinion Poll / નવો પોલ બનાવો
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Enter your question and voting options below
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Poll Question / સવાલ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={createQuestion}
              onChange={(e) => setCreateQuestion(e.target.value)}
              placeholder="e.g. તમારા મતે આગામી ચૂંટણીમાં કોની જીત થશે? (Ask a question...)"
              className="w-full text-xs sm:text-sm font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Description / વિગત (Optional)
            </label>
            <input
              type="text"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="e.g. તમારો કિંમતી મત આપો અને પરિણામ જુઓ..."
              className="w-full text-xs text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Voting Options / વિકલ્પો (At least 2) <span className="text-red-500">*</span>
            </label>

            <div className="space-y-2">
              {createOptions.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="color"
                    value={opt.color}
                    onChange={(e) => {
                      const updated = [...createOptions];
                      updated[idx].color = e.target.value;
                      setCreateOptions(updated);
                    }}
                    className="w-7 h-7 rounded-lg border-0 p-0 cursor-pointer shrink-0"
                    title="Choose option color"
                  />
                  <input
                    type="text"
                    required
                    value={opt.text}
                    onChange={(e) => {
                      const updated = [...createOptions];
                      updated[idx].text = e.target.value;
                      setCreateOptions(updated);
                    }}
                    placeholder={`Option ${idx + 1} text...`}
                    className="flex-1 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {createOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setCreateOptions(createOptions.filter((_, i) => i !== idx))}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg cursor-pointer"
                      title="Remove option"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const nextColor = defaultColors[createOptions.length % defaultColors.length];
                setCreateOptions([...createOptions, { id: String(Date.now()), text: '', color: nextColor }]);
              }}
              className="px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Plus size={13} />
              <span>+ Add Option / નવો વિકલ્પ ઉમેરો</span>
            </button>
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 text-xs sm:text-sm font-black bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl shadow-md shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Check size={16} />
              <span>🚀 Create & Launch Poll / પોલ શરૂ કરો</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  const totalVotes = options.reduce((sum, opt) => sum + (Number(opt.votes) || 0), 0);

  const handleAddOption = () => {
    const defaultColors = ['#f97316', '#0284c7', '#16a34a', '#8b5cf6', '#ec4899', '#eab308', '#64748b'];
    const newOpt: PollOption = {
      id: `opt-${Date.now()}`,
      text: `Option ${options.length + 1}`,
      votes: 0,
      color: defaultColors[options.length % defaultColors.length],
    };
    updateAttributes({ options: [...options, newOpt] });
  };

  const handleUpdateOption = (id: string, updates: Partial<PollOption>) => {
    const updated = options.map((opt) => (opt.id === id ? { ...opt, ...updates } : opt));
    updateAttributes({ options: updated });
  };

  const handleDeleteOption = (id: string) => {
    if (options.length <= 2) return;
    const updated = options.filter((opt) => opt.id !== id);
    updateAttributes({ options: updated });
  };

  const handleVote = (optionId: string) => {
    if (isClosed) return;
    if (hasVoted && !allowRevote) return;

    const updated = options.map((opt) => {
      if (opt.id === optionId) {
        return { ...opt, votes: Number(opt.votes || 0) + 1 };
      }
      if (hasVoted && opt.id === selectedVoteId && allowRevote) {
        return { ...opt, votes: Math.max(0, Number(opt.votes || 0) - 1) };
      }
      return opt;
    });

    setSelectedVoteId(optionId);
    setHasVoted(true);
    updateAttributes({ options: updated });
  };

  const handleResetVotes = () => {
    const updated = options.map((opt) => ({ ...opt, votes: 0 }));
    setSelectedVoteId(null);
    setHasVoted(false);
    updateAttributes({ options: updated });
  };

  const handleToggleClosePoll = () => {
    updateAttributes({ isClosed: !isClosed });
  };

  return (
    <div
      className={`relative my-4 rounded-2xl border transition-all duration-300 overflow-hidden ${
        selected
          ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
          : 'border-gray-200 dark:border-gray-700/80 shadow-xs hover:border-gray-300 dark:hover:border-gray-600'
      } bg-white dark:bg-gray-900`}
    >
      {/* Top Poll Card Header */}
      <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-800/80 dark:via-gray-800/40 dark:to-gray-800/80 p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 12 2 2 4-4" />
                <path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7z" />
                <line x1="9" y1="18" x2="15" y2="18" />
              </svg>
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Public Opinion Poll / ઓપિનિયન પોલ
            </span>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                isEditing
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
              }`}
            >
              {isEditing ? <Eye size={12} /> : <Edit3 size={12} />}
              <span>{isEditing ? 'View Mode' : 'Edit Options'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetVotes}
              title="Reset all votes to 0"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-gray-500 hover:text-red-600 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-300 transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Closed Banner Notice */}
        {isClosed && !isEditing && (
          <div className="mb-3 flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold">
            <AlertCircle size={14} className="shrink-0 text-amber-600" />
            <span>આ મતદાન હવે બંધ કરવામાં આવ્યું છે. નીચે આખરી પરિણામ દર્શાવેલ છે. (Voting has concluded. Final results below.)</span>
          </div>
        )}

        {/* Editable or Static Poll Question */}
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={question}
              onChange={(e) => updateAttributes({ question: e.target.value })}
              placeholder="તમારો પોલ પ્રશ્ન લખો (Poll Question)..."
              className="w-full text-base sm:text-lg font-black text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => updateAttributes({ description: e.target.value })}
              placeholder="સબટાઈટલ અથવા માહિતી (Subtitle)..."
              className="w-full text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        ) : (
          <div>
            <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-snug">
              {question}
            </h3>
            {description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                {description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Options List */}
      <div className="p-4 sm:p-5 space-y-3">
        {options.map((opt) => {
          const votesCount = Number(opt.votes) || 0;
          const percentage = totalVotes > 0 ? ((votesCount / totalVotes) * 100).toFixed(1) : '0';
          const isSelected = selectedVoteId === opt.id;
          const isLeading = totalVotes > 0 && votesCount === Math.max(...options.map((o) => Number(o.votes) || 0)) && votesCount > 0;

          return (
            <div
              key={opt.id}
              className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${
                isClosed
                  ? 'border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/20'
                  : isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm bg-white dark:bg-gray-900'
                  : 'border-gray-200/90 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/40'
              }`}
            >
              {/* Background Progress Fill Bar */}
              {(showResults || hasVoted || isClosed) && (
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-500 ease-out pointer-events-none"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: opt.color,
                    opacity: isSelected ? 0.24 : isClosed ? 0.16 : 0.12,
                  }}
                />
              )}

              {/* Card Foreground Content */}
              <div className="relative flex items-center justify-between p-3 sm:p-3.5 gap-3 z-10">
                {/* Left: Radio Selection / Option Text */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Radio / Vote Button in Live Mode (Hidden when poll is closed) */}
                  {!isEditing && !isClosed && (
                    <button
                      type="button"
                      onClick={() => handleVote(opt.id)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white cursor-pointer'
                          : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500 bg-white dark:bg-gray-900 cursor-pointer'
                      }`}
                    >
                      {isSelected && <Check size={12} className="stroke-[3]" />}
                    </button>
                  )}

                  {/* Option Text or Input */}
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="color"
                        value={opt.color}
                        onChange={(e) => handleUpdateOption(opt.id, { color: e.target.value })}
                        className="w-6 h-6 rounded-md border-0 p-0 cursor-pointer shrink-0"
                        title="Change option color"
                      />
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => handleUpdateOption(opt.id, { text: e.target.value })}
                        className="w-full text-xs sm:text-sm font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        if (!isClosed) handleVote(opt.id);
                      }}
                      className={`font-bold text-xs sm:text-sm flex items-center gap-2 truncate ${
                        isClosed ? 'cursor-default text-gray-900 dark:text-white select-none' : 'cursor-pointer text-gray-900 dark:text-white'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                      <span className="truncate">{opt.text}</span>
                      {isLeading && (
                        <span className="inline-flex text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500 text-white shrink-0 shadow-xs">
                          ⭐ Winner
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Votes Count & Percentage */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>Votes:</span>
                        <input
                          type="number"
                          min="0"
                          value={opt.votes}
                          onChange={(e) => handleUpdateOption(opt.id, { votes: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-16 text-center text-xs font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-1 outline-none"
                        />
                      </div>
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteOption(opt.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                          title="Remove Option"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white">
                        {votesCount.toLocaleString()} Votes
                      </span>
                      <span className="ml-1 text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">
                        ({percentage}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Option Button */}
        {isEditing && (
          <button
            type="button"
            onClick={handleAddOption}
            className="w-full py-2.5 px-3 border-2 border-dashed border-indigo-200 dark:border-indigo-900 hover:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Plus size={14} />
            <span>+ Add Option / નવો વિકલ્પ ઉમેરો</span>
          </button>
        )}
      </div>

      {/* Poll Footer Summary */}
      <div className="bg-gray-50/80 dark:bg-gray-800/40 px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 gap-3">
        <div className="flex items-center gap-2">
          <span>Total Votes: <strong className="text-gray-900 dark:text-white">{totalVotes.toLocaleString()}</strong></span>
          <span>•</span>
          <span>Options: <strong className="text-gray-900 dark:text-white">{options.length}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleClosePoll}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-black rounded-xl transition-all duration-200 cursor-pointer shadow-md active:scale-95 ${
              isClosed
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25 ring-2 ring-emerald-500/20'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/25 ring-2 ring-rose-500/20'
            }`}
          >
            {isClosed ? <Unlock size={14} className="shrink-0" /> : <Lock size={14} className="shrink-0" />}
            <span>{isClosed ? 'Open Poll (મતદાન શરૂ કરો)' : 'Close Poll (મતદાન બંધ કરો)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
