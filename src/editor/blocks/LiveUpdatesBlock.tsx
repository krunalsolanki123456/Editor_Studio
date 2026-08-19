import React, { useState, useRef } from 'react';
import {
  Radio, Plus, Trash2, Pin, X, Check, Edit2,
  ChevronUp, ChevronDown, Upload, AlignLeft, AlignCenter, AlignRight,
  FileText, Download, Eye, Code2, Link2, Play, ExternalLink
} from 'lucide-react';
import { useEditorStore } from '../store';
import { fileToDataUrl } from '../media';
import { createId } from '../utils';
import type { BlockInstance } from '../types';
import { TwitterEmbed, InstagramEmbed } from './EmbedBlocks';
import {
  isTwitterUrl,
  isInstagramUrl,
  isSpotifyUrl,
  normalizeSpotifyUrl,
  extractEmbedSrc,
  extractEmbedList,
} from '../exporter';

export interface LiveUpdateItem {
  id: string;
  time: string;
  timestamp: number;
  title: string;
  content: string;
  tag?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'pdf' | 'embed';
  mediaFileName?: string;
  mediaFileSize?: string;
  mediaAlign?: 'left' | 'center' | 'right';
  embedCode?: string;
  isPinned?: boolean;
  author?: string;
}

export function renderLiveEmbedComponent(rawCode: string, align: 'left' | 'center' | 'right' = 'center') {
  const trimmed = (rawCode || '').trim();
  if (!trimmed) return null;

  if (isTwitterUrl(trimmed)) {
    return (
      <div className="w-full max-w-[550px]">
        <TwitterEmbed url={trimmed} />
      </div>
    );
  }

  if (isInstagramUrl(trimmed)) {
    return (
      <div className="w-full max-w-2xl">
        <InstagramEmbed url={trimmed} align={align} />
      </div>
    );
  }

  if (isSpotifyUrl(trimmed)) {
    const spotifySrc = normalizeSpotifyUrl(trimmed);
    return (
      <div className="w-full max-w-[560px] rounded-xl overflow-hidden shadow-sm">
        <iframe
          src={spotifySrc}
          width="100%"
          height="152"
          style={{ border: 0 }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      </div>
    );
  }

  const embedSrc = extractEmbedSrc(trimmed);
  return (
    <div className="w-full max-w-2xl aspect-video rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 bg-black">
      <iframe
        src={embedSrc}
        className="w-full h-full border-0"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}

export function renderLiveEmbedList(rawCode: string | string[] | undefined, align: 'left' | 'center' | 'right' = 'center') {
  const list = extractEmbedList(rawCode);
  if (list.length === 0) return null;

  const alignClass = align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center';

  return (
    <div className={`w-full flex flex-col ${alignClass} gap-3`}>
      {list.map((code, idx) => (
        <div key={idx} className="w-full flex justify-center">
          {renderLiveEmbedComponent(code, align)}
        </div>
      ))}
    </div>
  );
}

interface BlockProps {
  block: BlockInstance;
  selected?: boolean;
}

function formatCurrentDateTime(ts?: number): string {
  const d = ts ? new Date(ts) : new Date();
  const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${dateStr} | ${timeStr}`;
}

function formatDisplayDateTime(item: LiveUpdateItem): string {
  if (item.timestamp) {
    return formatCurrentDateTime(item.timestamp);
  }
  if (item.time && (item.time.includes('AM') || item.time.includes('PM')) && item.time.includes(' ')) {
    return item.time;
  }
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${dateStr} | ${item.time || '12:00 PM'}`;
}

export function LiveUpdatesBlock({ block, selected = false }: BlockProps) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const a = block.attributes || {};

  const feedTitle = (a.feedTitle as string) ?? 'Live Updates';
  const isLive = (a.isLive as boolean) ?? true;
  const updates = (a.updates as LiveUpdateItem[]) ?? [];

  // Local state for the "Add New Update" form
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video' | 'pdf' | 'embed'>('image');
  const [newMediaFileName, setNewMediaFileName] = useState('');
  const [newMediaFileSize, setNewMediaFileSize] = useState('');
  const [newMediaAlign, setNewMediaAlign] = useState<'left' | 'center' | 'right'>('center');
  const [newEmbedList, setNewEmbedList] = useState<string[]>(['']);
  const [showEmbedInput, setShowEmbedInput] = useState(false);
  const [newIsPinned, setNewIsPinned] = useState(false);

  // Local state for editing an existing update
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editMediaUrl, setEditMediaUrl] = useState('');
  const [editMediaType, setEditMediaType] = useState<'image' | 'video' | 'pdf' | 'embed'>('image');
  const [editMediaFileName, setEditMediaFileName] = useState('');
  const [editMediaFileSize, setEditMediaFileSize] = useState('');
  const [editMediaAlign, setEditMediaAlign] = useState<'left' | 'center' | 'right'>('center');
  const [editEmbedList, setEditEmbedList] = useState<string[]>(['']);
  const [showEditEmbedInput, setShowEditEmbedInput] = useState(false);
  const [editIsPinned, setEditIsPinned] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const updateAttributes = (newAttrs: Record<string, unknown>) => {
    updateBlock(block.id, (b) => ({
      ...b,
      attributes: {
        ...b.attributes,
        ...newAttrs,
      },
    }));
  };

  const handleAddUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const validEmbeds = newEmbedList.map((u) => u.trim()).filter(Boolean);
    const combinedEmbedCode = validEmbeds.join('\n');
    if (!newTitle.trim() && !newContent.trim() && !combinedEmbedCode && !newMediaUrl.trim()) return;

    const now = Date.now();
    const isEmbed = Boolean(combinedEmbedCode);
    const newItem: LiveUpdateItem = {
      id: createId(),
      time: formatCurrentDateTime(now),
      timestamp: now,
      title: newTitle.trim() || 'Live Update',
      content: newContent.trim(),
      mediaUrl: isEmbed ? undefined : (newMediaUrl.trim() || undefined),
      mediaType: isEmbed ? 'embed' : newMediaType,
      mediaFileName: isEmbed ? undefined : (newMediaFileName || undefined),
      mediaFileSize: isEmbed ? undefined : (newMediaFileSize || undefined),
      embedCode: isEmbed ? combinedEmbedCode : undefined,
      mediaAlign: newMediaAlign,
      isPinned: newIsPinned,
    };

    const newUpdates = [newItem, ...updates];
    updateAttributes({ updates: newUpdates });

    // Reset form
    setNewTitle('');
    setNewContent('');
    setNewMediaUrl('');
    setNewMediaType('image');
    setNewMediaFileName('');
    setNewMediaFileSize('');
    setNewEmbedList(['']);
    setShowEmbedInput(false);
    setNewMediaAlign('center');
    setNewIsPinned(false);
    setIsAdding(false);
  };

  const handleStartEdit = (item: LiveUpdateItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditContent(item.content);
    setEditMediaUrl(item.mediaUrl || '');
    setEditMediaType(item.mediaType || (item.embedCode ? 'embed' : 'image'));
    setEditMediaFileName(item.mediaFileName || '');
    setEditMediaFileSize(item.mediaFileSize || '');
    const existingList = extractEmbedList(item.embedCode);
    setEditEmbedList(existingList.length > 0 ? existingList : ['']);
    setShowEditEmbedInput(Boolean(item.embedCode));
    setEditMediaAlign(item.mediaAlign || 'center');
    setEditIsPinned(Boolean(item.isPinned));
  };

  const handleSaveEdit = (id: string) => {
    const validEmbeds = editEmbedList.map((u) => u.trim()).filter(Boolean);
    const combinedEmbedCode = validEmbeds.join('\n');
    const isEmbed = Boolean(combinedEmbedCode);

    const updated = updates.map((u) => {
      if (u.id === id) {
        return {
          ...u,
          title: editTitle.trim() || u.title,
          content: editContent.trim(),
          mediaUrl: isEmbed ? undefined : (editMediaUrl.trim() || undefined),
          mediaType: isEmbed ? 'embed' : editMediaType,
          mediaFileName: isEmbed ? undefined : (editMediaFileName || undefined),
          mediaFileSize: isEmbed ? undefined : (editMediaFileSize || undefined),
          embedCode: isEmbed ? combinedEmbedCode : undefined,
          mediaAlign: editMediaAlign,
          isPinned: editIsPinned,
        };
      }
      return u;
    });

    updateAttributes({ updates: updated });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    updateAttributes({
      updates: updates.filter((u) => u.id !== id),
    });
  };

  const handleTogglePin = (id: string) => {
    updateAttributes({
      updates: updates.map((u) => (u.id === id ? { ...u, isPinned: !u.isPinned } : u)),
    });
  };

  const handleUpdateItemAlign = (id: string, align: 'left' | 'center' | 'right') => {
    updateAttributes({
      updates: updates.map((u) => (u.id === id ? { ...u, mediaAlign: align } : u)),
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updates.length) return;
    const copy = [...updates];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    updateAttributes({ updates: copy });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    const isVideo = file.type.startsWith('video/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const type: 'image' | 'video' | 'pdf' = isPdf ? 'pdf' : isVideo ? 'video' : 'image';
    const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    if (isEdit) {
      setEditMediaUrl(url);
      setEditMediaType(type);
      setEditMediaFileName(file.name);
      setEditMediaFileSize(sizeStr);
    } else {
      setNewMediaUrl(url);
      setNewMediaType(type);
      setNewMediaFileName(file.name);
      setNewMediaFileSize(sizeStr);
    }
  };

  // Sort: pinned items first, then by timestamp desc
  const sortedUpdates = [...updates].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (b.timestamp || 0) - (a.timestamp || 0);
  });

  return (
    <div className={`be-live-updates-block my-6 w-full rounded-2xl border transition-all ${
      selected
        ? 'border-red-500/80 ring-2 ring-red-500/20 shadow-lg'
        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/90 shadow-xs'
    }`}>
      {/* Header Banner */}
      <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-800/80 bg-gradient-to-r from-red-50/70 via-white to-orange-50/50 dark:from-red-950/30 dark:via-gray-900 dark:to-orange-950/20 rounded-t-2xl space-y-2">
        {/* Row 1: Pulsing Live Badge & Title */}
        <div className="flex items-center gap-2 w-full min-w-0">
          <button
            type="button"
            onClick={() => updateAttributes({ isLive: !isLive })}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black tracking-wider uppercase transition-all cursor-pointer shrink-0 ${
              isLive
                ? 'bg-red-600 text-white shadow-md shadow-red-500/30 animate-pulse'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
            title="Click to toggle Live / Concluded status"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-white' : 'bg-gray-400'}`} />
            {isLive ? 'LIVE COVERAGE' : 'CONCLUDED'}
          </button>

          {/* Editable Feed Title */}
          <input
            type="text"
            value={feedTitle}
            onChange={(e) => updateAttributes({ feedTitle: e.target.value })}
            placeholder="Live Updates Headline..."
            className="flex-1 min-w-0 text-sm sm:text-base font-black text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-700 focus:border-red-500 outline-none px-1 py-0.5 transition-colors truncate"
          />
        </div>

        {/* Row 2: Count and Add Action Button */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-100/80 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-800/40">
            {updates.length} {updates.length === 1 ? 'Update' : 'Updates'}
          </span>

          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 transition-all cursor-pointer shrink-0 active:scale-95"
          >
            {isAdding ? <X size={13} /> : <Plus size={13} />}
            <span>{isAdding ? 'Close' : 'Post Live Update'}</span>
          </button>
        </div>
      </div>

      {/* Modern Add New Update Form Card */}
      {isAdding && (
        <form onSubmit={handleAddUpdate} className="m-2.5 sm:m-5 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-red-200 dark:border-red-900/60 bg-gradient-to-b from-red-50/50 via-white to-gray-50/40 dark:from-red-950/20 dark:via-gray-900 dark:to-gray-900 shadow-sm space-y-3.5">
          {/* Card Header with Status & Pin Action */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-gray-200/70 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900">
                <Radio size={12} className="animate-pulse text-red-600" />
                <span>NEW FLASH</span>
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate max-w-[180px] sm:max-w-none">
                Publish real-time news with Photo, Video, or PDF
              </span>
            </div>

            {/* Pin Switch Pill */}
            <button
              type="button"
              onClick={() => setNewIsPinned(!newIsPinned)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                newIsPinned
                  ? 'bg-amber-100/90 text-amber-900 border-amber-400/80 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700 shadow-xs'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700 hover:border-amber-400 hover:text-amber-600'
              }`}
            >
              <Pin size={12} className={newIsPinned ? 'fill-amber-600 text-amber-600' : ''} />
              <span>{newIsPinned ? 'Pinned 📌' : 'Pin to Top'}</span>
            </button>
          </div>

          {/* Headline Input Field */}
          <div className="space-y-1">
            <label className="flex items-center justify-between text-xs font-bold text-gray-800 dark:text-gray-200">
              <span>Headline / મુખ્ય સમાચાર <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. કોલકાતાની હોટલમાં મોડી રાત્રે ભીષણ આગ..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm font-bold bg-white dark:bg-gray-800/90 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/15 shadow-2xs"
            />
          </div>

          {/* Content Textarea Field */}
          <div className="space-y-1">
            <label className="flex items-center justify-between text-xs font-bold text-gray-800 dark:text-gray-200">
              <span>Details / વિગતવાર વર્ણન</span>
            </label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              placeholder="Write live update details, key highlights, or official statement..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-gray-800/90 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-500/15 shadow-2xs resize-y"
            />
          </div>

          {/* Media & Embed Attachment Section */}
          <div className="space-y-2.5 pt-2 border-t border-gray-200/80 dark:border-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Media & Embed Option Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,application/pdf,.pdf"
                  onChange={(e) => {
                    setNewEmbedList(['']);
                    setShowEmbedInput(false);
                    handleFileUpload(e, false);
                  }}
                  className="hidden"
                />

                {/* Upload File Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 hover:border-gray-400 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                >
                  <Upload size={13} className="text-red-500" />
                  <span>{newMediaUrl ? 'Change File' : '+ Upload Photo / Video / PDF'}</span>
                </button>

                {/* Embed Code / Social Link Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowEmbedInput(!showEmbedInput);
                    if (!showEmbedInput) {
                      setNewMediaUrl('');
                      setNewMediaFileName('');
                      setNewMediaFileSize('');
                      if (newEmbedList.length === 0) setNewEmbedList(['']);
                    }
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all border ${
                    showEmbedInput || newEmbedList.some((u) => u.trim())
                      ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <Code2 size={13} className={showEmbedInput || newEmbedList.some((u) => u.trim()) ? 'text-white' : 'text-blue-500'} />
                  <span>{newEmbedList.some((u) => u.trim()) ? `Embeds (${newEmbedList.filter((u) => u.trim()).length})` : '</> Embed Code / Social Link'}</span>
                </button>

                {(newMediaUrl || newEmbedList.some((u) => u.trim())) && (
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-xl border border-gray-300 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setNewMediaAlign('left')}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${newMediaAlign === 'left' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-2xs' : 'text-gray-500'}`}
                      title="Align Left"
                    >
                      <AlignLeft size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewMediaAlign('center')}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${newMediaAlign === 'center' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-2xs' : 'text-gray-500'}`}
                      title="Align Center"
                    >
                      <AlignCenter size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewMediaAlign('right')}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${newMediaAlign === 'right' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-2xs' : 'text-gray-500'}`}
                      title="Align Right"
                    >
                      <AlignRight size={12} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewMediaUrl('');
                        setNewMediaFileName('');
                        setNewMediaFileSize('');
                        setNewEmbedList(['']);
                        setShowEmbedInput(false);
                      }}
                      className="ml-1 p-0.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded cursor-pointer"
                      title="Remove attachment"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200/70 dark:hover:bg-gray-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl shadow-md shadow-red-500/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Check size={14} />
                  <span>Publish</span>
                </button>
              </div>
            </div>

            {/* Embed Code / URL Multi-Input List */}
            {showEmbedInput && (
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
                  <span className="flex items-center gap-1.5">
                    <Link2 size={14} className="text-blue-600" />
                    Paste YouTube / Twitter (X) / Instagram / Spotify / &lt;iframe&gt; links:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEmbedInput(false)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="space-y-2">
                  {newEmbedList.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => {
                          const val = e.target.value;
                          // If pasting multiple lines at once, split into multiple entries
                          if (val.includes('\n')) {
                            const split = val.split(/[\r\n]+/).map((s) => s.trim()).filter(Boolean);
                            const updated = [...newEmbedList];
                            updated.splice(idx, 1, ...split);
                            setNewEmbedList(updated);
                          } else {
                            const updated = [...newEmbedList];
                            updated[idx] = val;
                            setNewEmbedList(updated);
                          }
                          setNewMediaType('embed');
                        }}
                        placeholder="Paste YouTube URL, Twitter/X link, Instagram Reel/Post, Spotify or <iframe>..."
                        className="flex-1 px-3 py-2 text-xs font-mono bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      {newEmbedList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewEmbedList(newEmbedList.filter((_, i) => i !== idx))}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer"
                          title="Remove this embed"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setNewEmbedList([...newEmbedList, ''])}
                  className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100/70 hover:bg-blue-200/70 dark:bg-blue-900/40 dark:hover:bg-blue-900/70 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Plus size={13} />
                  <span>+ Add Another Link</span>
                </button>
              </div>
            )}

            {/* Uploaded Media / Embed Live Preview */}
            {newEmbedList.some((u) => u.trim()) && (
              <div className={`w-full flex ${newMediaAlign === 'left' ? 'justify-start' : newMediaAlign === 'right' ? 'justify-end' : 'justify-center'} pt-2`}>
                {renderLiveEmbedList(newEmbedList, newMediaAlign)}
              </div>
            )}

            {newMediaUrl && (
              <div className={`w-full flex ${newMediaAlign === 'left' ? 'justify-start' : newMediaAlign === 'right' ? 'justify-end' : 'justify-center'} pt-2`}>
                {newMediaType === 'pdf' ? (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl border border-red-200 dark:border-red-900 bg-white dark:bg-gray-800 shadow-xs max-w-md w-full">
                    <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-red-600 text-white rounded">PDF DOCUMENT</span>
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate mt-0.5">{newMediaFileName || 'Document.pdf'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative inline-block rounded-xl overflow-hidden max-h-56 shadow-sm border border-gray-200 dark:border-gray-700">
                    {newMediaType === 'video' ? (
                      <video src={newMediaUrl} className="max-h-56 w-auto object-contain rounded-xl" controls />
                    ) : (
                      <img src={newMediaUrl} alt="Preview" className="max-h-56 w-auto object-contain rounded-xl" />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      )}

      {/* Dashed Timeline View */}
      <div className="p-3.5 sm:p-7">
        {sortedUpdates.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <Radio size={32} className="text-red-400/60 mb-2 animate-pulse" />
            <p className="text-sm font-semibold">No live updates published yet.</p>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="mt-3 px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              + Post First Live Update
            </button>
          </div>
        ) : (
          <div className="relative pl-5 sm:pl-7 border-l-2 border-dashed border-gray-300 dark:border-gray-700 space-y-6 sm:space-y-8">
            {sortedUpdates.map((item, idx) => {
              const alignJustify = item.mediaAlign === 'left' ? 'justify-start' : item.mediaAlign === 'right' ? 'justify-end' : 'justify-center';
              const mediaContainerWidth = item.mediaAlign === 'left' || item.mediaAlign === 'right' ? 'w-full sm:w-[75%]' : 'w-full';

              return (
                <div key={item.id} className="relative group">
                  {/* Red Dot aligned with the Title at the top */}
                  <span className="absolute -left-[27px] sm:-left-[35px] top-1 w-3 h-3 rounded-full bg-[#ef4444] border-2 border-white dark:border-gray-900 shadow-xs" />

                  {editingId === item.id ? (
                    /* Polished Edit Mode Form */
                    <div className="space-y-3 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 shadow-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-blue-200/50 dark:border-blue-900/40">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                          <Edit2 size={13} /> Editing Live Update
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditIsPinned(!editIsPinned)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            editIsPinned
                              ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-white dark:bg-gray-800 text-gray-600 border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <Pin size={12} className={editIsPinned ? 'fill-amber-600 text-amber-600' : ''} />
                          <span>{editIsPinned ? 'Pinned 📌' : 'Pin to Top'}</span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">Headline</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs sm:text-sm font-bold bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">Details</label>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>

                      {/* Edit Embed Code Box */}
                      {showEditEmbedInput && (
                        <div className="space-y-2.5 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
                            <span>Embed Links / Codes</span>
                            <button
                              type="button"
                              onClick={() => setEditEmbedList([...editEmbedList, ''])}
                              className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                            >
                              <Plus size={11} /> Add Another Link
                            </button>
                          </div>

                          <div className="space-y-2">
                            {editEmbedList.map((url, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                                  {idx + 1}
                                </div>
                                <input
                                  type="text"
                                  value={url}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.includes('\n')) {
                                      const split = val.split(/[\r\n]+/).map((s) => s.trim()).filter(Boolean);
                                      const updated = [...editEmbedList];
                                      updated.splice(idx, 1, ...split);
                                      setEditEmbedList(updated);
                                    } else {
                                      const updated = [...editEmbedList];
                                      updated[idx] = val;
                                      setEditEmbedList(updated);
                                    }
                                  }}
                                  placeholder="Paste YouTube, Twitter (X), Instagram, Spotify or <iframe>..."
                                  className="flex-1 px-3 py-1.5 text-xs font-mono bg-white dark:bg-gray-900 border border-blue-300 dark:border-blue-700 rounded-lg text-gray-900 dark:text-white"
                                />
                                {editEmbedList.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setEditEmbedList(editEmbedList.filter((_, i) => i !== idx))}
                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer"
                                    title="Remove this embed"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <input
                            ref={editFileInputRef}
                            type="file"
                            accept="image/*,video/*,application/pdf,.pdf"
                            onChange={(e) => {
                              setEditEmbedList(['']);
                              setShowEditEmbedInput(false);
                              handleFileUpload(e, true);
                            }}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => editFileInputRef.current?.click()}
                            className="px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 border border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer"
                          >
                            Change File
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowEditEmbedInput(!showEditEmbedInput)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 border border-blue-300 dark:border-blue-700 rounded-xl cursor-pointer"
                          >
                            {editEmbedList.some((u) => u.trim()) ? `Edit Embeds (${editEmbedList.filter((u) => u.trim()).length})` : '+ Embed Code'}
                          </button>

                          {(editMediaUrl || editEmbedList.some((u) => u.trim())) && (
                            <div className="flex items-center bg-white dark:bg-gray-800 p-0.5 rounded-lg border border-gray-300 dark:border-gray-700">
                              <button
                                type="button"
                                onClick={() => setEditMediaAlign('left')}
                                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${editMediaAlign === 'left' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'text-gray-500'}`}
                              >
                                Left
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditMediaAlign('center')}
                                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${editMediaAlign === 'center' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'text-gray-500'}`}
                              >
                                Center
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditMediaAlign('right')}
                                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${editMediaAlign === 'right' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'text-gray-500'}`}
                              >
                                Right
                              </button>
                            </div>
                          )}

                          {(editMediaUrl || editEmbedList.some((u) => u.trim())) && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditMediaUrl('');
                                setEditMediaFileName('');
                                setEditMediaFileSize('');
                                setEditEmbedList(['']);
                                setShowEditEmbedInput(false);
                              }}
                              className="text-xs text-red-500 hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 text-xs font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            className="px-4 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>

                      {/* Edit Embed Live Preview */}
                      {editEmbedList.some((u) => u.trim()) && (
                        <div className={`w-full flex ${editMediaAlign === 'left' ? 'justify-start' : editMediaAlign === 'right' ? 'justify-end' : 'justify-center'} pt-2`}>
                          {renderLiveEmbedList(editEmbedList, editMediaAlign)}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Clean Item Display Mode */
                    <div className="relative">
                      {/* Top Row: Title and Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-snug">
                          {item.title}
                        </h4>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xs p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleTogglePin(item.id)}
                            className={`p-1 rounded-md cursor-pointer transition-colors ${
                              item.isPinned
                                ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                                : 'text-gray-400 hover:text-amber-600'
                            }`}
                            title={item.isPinned ? 'Unpin' : 'Pin to top'}
                          >
                            <Pin size={12} className={item.isPinned ? 'fill-amber-600' : ''} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMove(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 rounded-md cursor-pointer"
                            title="Move up"
                          >
                            <ChevronUp size={12} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMove(idx, 'down')}
                            disabled={idx === sortedUpdates.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 rounded-md cursor-pointer"
                            title="Move down"
                          >
                            <ChevronDown size={12} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md cursor-pointer"
                            title="Edit update"
                          >
                            <Edit2 size={12} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-md cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Date and Time with AM/PM (BELOW Title) */}
                      <div className="flex items-center gap-2 mb-2">
                        {item.isPinned && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/60">
                            <Pin size={9} /> PINNED
                          </span>
                        )}
                        <span className="text-[11px] sm:text-[13px] font-medium text-gray-500 dark:text-gray-400 select-none">
                          {formatDisplayDateTime(item)}
                        </span>
                      </div>

                      {/* Content Text */}
                      {item.content &&
                        !extractEmbedList(item.embedCode).some((e) => e.trim() === item.content.trim()) &&
                        item.content.trim() !== item.mediaUrl?.trim() && (
                          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap mb-2.5">
                            {item.content}
                          </p>
                        )}

                      {/* Embeds (YouTube, Twitter/X, Instagram, Spotify, iframe) with Alignment */}
                      {item.embedCode && (
                        <div className={`mt-2 w-full flex ${alignJustify}`}>
                          {renderLiveEmbedList(item.embedCode, item.mediaAlign)}
                        </div>
                      )}

                      {/* Media (Photo / Video / PDF) with Alignment */}
                      {item.mediaUrl && !item.embedCode && (
                        <div className={`mt-2 w-full flex ${alignJustify}`}>
                          {item.mediaType === 'pdf' ? (
                            /* Interactive PDF Card */
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-gradient-to-r from-red-50/70 via-white to-red-50/30 dark:from-red-950/40 dark:via-gray-900 dark:to-gray-900 shadow-2xs hover:shadow-xs transition-all w-full max-w-lg">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs font-black text-xs">
                                  PDF
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                                      Official PDF Document
                                    </span>
                                    {item.mediaFileSize && (
                                      <span className="text-[11px] text-gray-400">· {item.mediaFileSize}</span>
                                    )}
                                  </div>
                                  <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                    {item.mediaFileName || 'Document.pdf'}
                                  </p>
                                </div>
                              </div>

                              <a
                                href={item.mediaUrl}
                                download={item.mediaFileName || 'Document.pdf'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                              >
                                <Download size={13} />
                                <span>Download PDF</span>
                              </a>
                            </div>
                          ) : (
                            <div className={`${mediaContainerWidth} overflow-hidden rounded-xl`}>
                              {item.mediaType === 'video' ? (
                                <video
                                  src={item.mediaUrl}
                                  controls
                                  playsInline
                                  className="w-full h-auto max-h-[520px] rounded-xl block bg-black"
                                />
                              ) : (
                                <img
                                  src={item.mediaUrl}
                                  alt={item.title}
                                  className="w-full h-auto max-h-[600px] object-contain rounded-xl block"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
