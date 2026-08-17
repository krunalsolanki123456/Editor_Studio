import { useState, useRef } from 'react';
import {
  Sparkles, Volume2, Upload, Edit3, Image as ImageIcon, X, Check, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import { useEditorStore } from './store';
import { fileToDataUrl } from './media';
import CustomSelect from './CustomSelect';

function transliterateGujaratiToEnglish(text: string): string {
  const charMap: Record<string, string> = {
    // Vowels
    'અ': 'a', 'આ': 'a', 'ઈ': 'i', 'ઇ': 'i', 'ઉ': 'u', 'ઊ': 'u', 'ઋ': 'ru',
    'એ': 'e', 'ઐ': 'ai', 'ઓ': 'o', 'ઔ': 'au', 'અં': 'am', 'અઃ': 'ah',
    // Consonants
    'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ઙ': 'ng',
    'ચ': 'ch', 'છ': 'chh', 'જ': 'j', 'ઝ': 'z', 'ઞ': 'ny',
    'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n',
    'ત': 't', 'થ': 'th', 'દ': 'd', 'ધ': 'dh', 'ન': 'n',
    'પ': 'p', 'ફ': 'ph', 'બ': 'b', 'ભ': 'bh', 'મ': 'm',
    'ય': 'y', 'ર': 'r', 'લ': 'l', 'વ': 'v', 'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h', 'ળ': 'l',
    'ક્ષ': 'ksh', 'જ્ઞ': 'jnya',
    // Matras
    'ા': 'a', 'િ': 'i', 'ી': 'i', 'ુ': 'u', 'ૂ': 'u', 'ૃ': 'ru',
    'ે': 'e', 'ૈ': 'ai', 'ો': 'o', 'ૌ': 'au', 'ં': 'm', 'ઃ': 'h', '્': '',
    // Digits
    '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4', '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9',
  };

  let transliterated = '';
  for (const char of text) {
    if (charMap[char] !== undefined) {
      transliterated += charMap[char];
    } else {
      transliterated += char;
    }
  }

  return transliterated
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function PublishingHeader() {
  const documentTitle = useEditorStore((s) => s.documentTitle);
  const setDocumentTitle = useEditorStore((s) => s.setDocumentTitle);
  const blocks = useEditorStore((s) => s.blocks);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(documentTitle);
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [featuredIn, setFeaturedIn] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [layout, setLayout] = useState('');
  const [summary, setSummary] = useState('');
  const [featuredMedia, setFeaturedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [toast, setToast] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // AI Modal state
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiModel, setAIModel] = useState('gemini-2.5-flash');
  const [aiTemperature, setAITemperature] = useState(0.7);
  const [aiTopP, setAITopP] = useState(0.95);
  const [aiTopK, setAITopK] = useState(40);
  const [aiMaxTokens, setAIMaxTokens] = useState(256);
  const [aiCustomInstruction, setAICustomInstruction] = useState(
    "Convert the provided text into a short and catchy news summary in the style and tone of the 'Gujarat Samachar' newspaper (News Writer Style). This summary must be strictly in the Gujarati language only (without any English words). It must cover the core elements of 5W&H (Who, What, Where), but without using them as subheadings. The length of the summary must strictly be between 50 and 65 words. The numbers within the Gujarati text must be in English digits. The summary must not exceed 65 words."
  );
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiSettingsOpen, setAISettingsOpen] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Audio Modal state
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [audioModel, setAudioModel] = useState('gemini-2.5-flash-preview-tts');
  const [audioVoice, setAudioVoice] = useState('Charon');
  const [audioTemperature, setAudioTemperature] = useState(1.0);
  const [audioStyleInstruction, setAudioStyleInstruction] = useState(
    'Speak like a professional news anchor. 1.4x speed. Also you can check content and decide tone accordingly.'
  );
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(true);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [audioStatus, setAudioStatus] = useState<'Not Generated' | 'Generating...' | 'Ready'>('Not Generated');
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');

  const hasTitle = Boolean(documentTitle.trim() && documentTitle !== 'Untitled Story');
  const hasSlug = Boolean(slug.trim());
  const hasCategory = Boolean(category.trim());
  const hasMedia = Boolean(featuredMedia);
  const completedCount = [hasTitle, hasSlug, hasCategory, hasMedia].filter(Boolean).length;
  const isReadyToSave = completedCount === 4;

  const showNotification = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveStory = () => {
    if (!hasTitle) {
      showNotification('⚠️ Please enter Story Title before saving');
      return;
    }
    if (!hasSlug) {
      const generated = transliterateGujaratiToEnglish(documentTitle);
      if (generated) {
        setSlug(generated);
      } else {
        showNotification('⚠️ Please generate or enter SLUG before saving');
        return;
      }
    }
    if (!hasCategory) {
      showNotification('⚠️ Please select Category before saving');
      return;
    }
    if (!hasMedia) {
      showNotification('⚠️ Please upload Featured Media (Image or Video) before saving');
      return;
    }

    setIsPublished(true);
    showNotification('🎉 Story Saved & Published Successfully!');
  };

  const handleSaveTitle = () => {
    const trimmed = tempTitle.trim();
    setDocumentTitle(trimmed || 'Untitled Story');
    setIsEditingTitle(false);
    if (!slug) {
      const generated = transliterateGujaratiToEnglish(trimmed || 'Untitled Story');
      setSlug(generated || 'story-title');
    }
    showNotification('Title saved successfully');
  };

  const handleCancelTitle = () => {
    setTempTitle(documentTitle);
    setIsEditingTitle(false);
  };

  const handleGenerateSlug = () => {
    const raw = documentTitle.trim() || 'Untitled Story';
    const cleanSlug = transliterateGujaratiToEnglish(raw);
    setSlug(cleanSlug || 'story-title');
    showNotification('English slug generated from title');
  };

  const getBlocksText = () =>
    blocks
      .map((b) => {
        if (Array.isArray(b.attributes?.content)) {
          return b.attributes.content.map((c: any) => c.text || '').join('');
        }
        return typeof b.attributes?.content === 'string' ? b.attributes.content : '';
      })
      .filter(Boolean)
      .join(' ');

  const handleGenerateSummaryFromModal = () => {
    setIsGeneratingSummary(true);
    const allText = getBlocksText();
    setTimeout(() => {
      if (!allText.trim()) {
        setSummary('This story discusses important updates and news coverage. Add more content to generate a detailed summary.');
      } else {
        const words = allText.trim().split(/\s+/).filter(Boolean);
        const sliced = words.slice(0, 65).join(' ');
        setSummary(sliced + (words.length > 65 ? '...' : ''));
      }
      setIsGeneratingSummary(false);
      setShowAIModal(false);
      showNotification('✨ AI Summary generated successfully');
    }, 1500);
  };

  const handlePlayAudio = () => {
    setShowAudioModal(true);
  };

  // Convert raw PCM16 LE bytes → WAV Blob so browser can play it
  const pcm16ToWavBlob = (pcmBase64: string, sampleRate = 24000, channels = 1): Blob => {
    const pcmBytes = Uint8Array.from(atob(pcmBase64), (c) => c.charCodeAt(0));
    const numSamples = pcmBytes.byteLength / 2;
    const wavBuffer = new ArrayBuffer(44 + pcmBytes.byteLength);
    const view = new DataView(wavBuffer);
    const write = (off: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
    write(0, 'RIFF'); view.setUint32(4, 36 + pcmBytes.byteLength, true);
    write(8, 'WAVE'); write(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, channels, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true); write(36, 'data');
    view.setUint32(40, pcmBytes.byteLength, true);
    new Uint8Array(wavBuffer, 44).set(pcmBytes);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  };

  const handleGenerateAudio = async () => {
    if (!summary.trim()) { showNotification('No summary text to convert to audio'); return; }
    if (!geminiApiKey.trim()) { showNotification('⚠️ Please enter Gemini API Key'); return; }

    setIsGeneratingAudio(true);
    setAudioStatus('Generating...');

    const stylePrefix = audioStyleInstruction.trim() ? `${audioStyleInstruction}\n\n` : '';
    const textToSpeak = `${stylePrefix}${summary}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${audioModel}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: textToSpeak }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: audioVoice },
                },
              },
              temperature: audioTemperature,
            },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const audioBase64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioBase64) throw new Error('No audio data received from Gemini');

      const wavBlob = pcm16ToWavBlob(audioBase64);
      const audioUrl = URL.createObjectURL(wavBlob);

      // Stop previous audio
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);

      const estimatedDuration = Math.round(summary.split(' ').length * 0.6);
      setGeneratedAudioUrl(audioUrl);
      setAudioDuration(estimatedDuration);
      setAudioStatus('Ready');
      setLastGeneratedAt(new Date().toLocaleTimeString());
      setIsGeneratingAudio(false);
      setShowAudioModal(false);

      // Auto-play
      audio.play();
      setIsPlayingAudio(true);
      showNotification('🎵 Gujarati audio generated successfully');
    } catch (err: any) {
      setIsGeneratingAudio(false);
      setAudioStatus('Not Generated');
      showNotification(`❌ Audio error: ${err.message || 'Unknown error'}`);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');
    const url = await fileToDataUrl(file);
    setFeaturedMedia(url);
    showNotification(`${isVideo ? 'Featured Video' : 'Featured Image'} uploaded`);
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-2xs transition-colors shrink-0">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl shadow-2xl animate-bounce border border-gray-700">
          {toast}
        </div>
      )}



      {/* ACCORDION TOGGLE HEADER BAR */}
      <div className="w-full px-3 sm:px-4 py-2 bg-gray-50/90 dark:bg-gray-800/80 border-b border-gray-200/80 dark:border-gray-800 flex items-center justify-between gap-3 select-none">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 cursor-pointer group flex-1 min-w-0"
        >
          <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 transition-colors shrink-0">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 tracking-wide flex items-center gap-2 shrink-0">
            <span>Publishing & Story Metadata</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all ${isReadyToSave ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
              {completedCount}/4 {isReadyToSave ? '✓ Ready' : 'Required'}
            </span>
          </span>
          {!isExpanded && documentTitle && documentTitle !== 'Untitled Story' && (
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[320px] hidden md:inline ml-2 italic">
              — "{documentTitle}"
            </span>
          )}
        </div>

        {/* Right Controls / Quick Save Button when Collapsed */}
        <div className="flex items-center gap-2 shrink-0">
          {!isExpanded && (
            <button
              type="button"
              onClick={handleSaveStory}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1"
            >
              <CheckCircle2 size={13} />
              <span>Save & Publish</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg hover:bg-gray-200/60 dark:hover:bg-gray-700/60 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
            title={isExpanded ? "Collapse Publishing Header" : "Expand Publishing Header"}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* METADATA PANEL GRID SECTION (COLLAPSIBLE ACCORDION BODY) */}
      {isExpanded && (
        <div className="p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start border-t border-gray-100 dark:border-gray-800/60 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* LEFT COLUMN: TITLE, SLUG, CATEGORIES, & AI SUMMARY (9 Cols) */}
          <div className="lg:col-span-9 space-y-2.5">
            {/* ROW 0: TITLE */}
            <div className="flex items-center gap-3 bg-gray-50/70 dark:bg-gray-800/40 p-2 rounded-xl border border-gray-200/80 dark:border-gray-800">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wider shrink-0 w-12 flex items-center">
                TITLE<span className="text-red-500 ml-0.5">*</span>
              </span>
              <div className="flex-1 relative flex items-center gap-2">
                {isEditingTitle ? (
                  <>
                    <input
                      type="text"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle();
                        if (e.key === 'Escape') handleCancelTitle();
                      }}
                      autoFocus
                      placeholder="Enter story title..."
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-primary-500 text-xs font-bold text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500/40 transition-all placeholder-gray-400 shadow-2xs"
                    />
                    {/* Save Check Button */}
                    <button
                      type="button"
                      onClick={handleSaveTitle}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      title="Save Story Title"
                    >
                      <Check size={14} />
                      <span>Save</span>
                    </button>
                    {/* Cancel X Button */}
                    <button
                      type="button"
                      onClick={handleCancelTitle}
                      className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      title="Cancel Title Editing"
                    >
                      <X size={14} />
                      <span>Cancel</span>
                    </button>
                  </>
                ) : (
                  <div
                    onClick={() => {
                      setTempTitle(documentTitle);
                      setIsEditingTitle(true);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between cursor-pointer hover:border-primary-400 dark:hover:border-primary-600 transition-colors group"
                  >
                    <span className="truncate">
                      {documentTitle || 'Enter story title...'}
                    </span>
                    <Edit3 size={13} className="text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors shrink-0 ml-2" />
                  </div>
                )}
              </div>
            </div>

            {/* ROW 1: SLUG */}
            <div className="flex items-center gap-3 bg-gray-50/70 dark:bg-gray-800/40 p-2 rounded-xl border border-gray-200/80 dark:border-gray-800">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wider shrink-0 w-12">
                SLUG
              </span>
              <div className="flex-1 relative flex items-center">
                <span className="absolute left-3 text-xs text-gray-400 font-mono">🔗</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="—"
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-800 dark:text-gray-200 outline-none focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
              <button
                type="button"
                onClick={handleGenerateSlug}
                className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-semibold text-xs rounded-lg shadow-2xs transition-all cursor-pointer shrink-0"
              >
                generate
              </button>
            </div>

            {/* ROW 2: CATEGORY, FEATURED IN, TAGS, LAYOUT */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 bg-gray-50/70 dark:bg-gray-800/40 p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-800">
              {/* Category */}
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">
                  Category<span className="text-red-500 ml-0.5">*</span>:
                </label>
                <CustomSelect
                  size="sm"
                  value={category}
                  onChange={setCategory}
                  placeholder="Select category..."
                  options={[
                    { value: 'politics', label: 'Politics' },
                    { value: 'entertainment', label: 'Entertainment' },
                    { value: 'sports', label: 'Sports' },
                    { value: 'business', label: 'Business' },
                    { value: 'tech', label: 'Tech' },
                    { value: 'gujarat', label: 'Gujarat' },
                  ]}
                />
              </div>

              {/* Featured In */}
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">
                  Featured In:
                </label>
                <CustomSelect
                  size="sm"
                  value={featuredIn}
                  onChange={setFeaturedIn}
                  placeholder="Select featured in..."
                  options={[
                    { value: 'top-news', label: 'Top News' },
                    { value: 'breaking', label: 'Breaking News' },
                    { value: 'editors-pick', label: "Editor's Pick" },
                    { value: 'trending', label: 'Trending Stories' },
                  ]}
                />
              </div>

              {/* Location */}
              {/* <div className="flex flex-col gap-1 min-w-0">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">
                  Location:
                </label>
                <CustomSelect
                  size="sm"
                  value={location}
                  onChange={setLocation}
                  placeholder="Select location..."
                  options={[
                    { value: 'ahmedabad', label: 'Ahmedabad' },
                    { value: 'surat', label: 'Surat' },
                    { value: 'vadodara', label: 'Vadodara' },
                    { value: 'rajkot', label: 'Rajkot' },
                    { value: 'national', label: 'National' },
                  ]}
                />
              </div> */}

              {/* Tags */}
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">
                  Tags:
                </label>
                <CustomSelect
                  size="sm"
                  value={tags}
                  onChange={setTags}
                  placeholder="Select tags..."
                  options={[
                    { value: 'gujarat-news', label: 'Gujarat News' },
                    { value: 'breaking', label: 'Breaking' },
                    { value: 'live', label: 'Live Updates' },
                    { value: 'special', label: 'Special Report' },
                  ]}
                />
              </div>

              {/* Layout */}
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">
                  Layout:
                </label>
                <CustomSelect
                  size="sm"
                  value={layout}
                  onChange={setLayout}
                  placeholder="Select layout..."
                  options={[
                    { value: 'standard', label: 'Standard Article' },
                    { value: 'hero', label: 'Hero Cover' },
                    { value: 'gallery', label: 'Photo Story' },
                    { value: 'video', label: 'Video Story' },
                  ]}
                />
              </div>
            </div>

            {/* ROW 3: AI GENERATED SUMMARY PANEL */}
            <div className="bg-gray-50/70 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-200/80 dark:border-gray-800">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2">
                AI Generated Summary
              </span>

              <div className="relative w-full">
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Add description text... Write a brief summary of this story to help readers and SEO."
                  className="w-full p-3 pb-10 rounded-xl bg-white dark:bg-gray-900 border border-blue-400 dark:border-blue-500 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                />

                {/* Word count hint */}
                <div className="absolute bottom-10 left-3 text-[10px] text-gray-400 pointer-events-none">
                  For optimal results, a summary of approximately 60 words is recommended. (Current: {summary.trim() ? summary.trim().split(/\s+/).filter(Boolean).length : 0} words)
                </div>

                {/* Bottom Right Action Buttons */}
                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                  {/* Audio Button */}
                  <button
                    type="button"
                    onClick={handlePlayAudio}
                    title={isPlayingAudio ? 'Stop audio' : 'Listen to summary'}
                    className={`p-1.5 rounded-lg border shadow-2xs transition-all cursor-pointer ${
                      isPlayingAudio
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:text-amber-500 hover:border-amber-400'
                    }`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="5" x2="18" y2="19"/>
                      <line x1="12" y1="8" x2="12" y2="16"/>
                      <line x1="6" y1="11" x2="6" y2="13"/>
                      <line x1="0" y1="10" x2="0" y2="14"/>
                      <line x1="24" y1="10" x2="24" y2="14"/>
                    </svg>
                  </button>

                  {/* AI Generate Button */}
                  <button
                    type="button"
                    onClick={() => setShowAIModal(true)}
                    title="Generate AI Summary"
                    className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white border border-blue-600 shadow-2xs transition-all cursor-pointer"
                  >
                    <Sparkles size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: FEATURED MEDIA CARD (3 Cols) */}
          <div className="lg:col-span-3 space-y-1 h-full">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
              Featured Media (Image or Video)<span className="text-red-500">*</span>
            </label>

            <div className="relative w-full h-[248px] rounded-xl border-2 border-dashed border-blue-500/60 dark:border-blue-400/60 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 transition-all flex flex-col items-center justify-center p-3 text-center cursor-pointer overflow-hidden group">
              {featuredMedia ? (
                <div className="relative w-full h-full group">
                  {mediaType === 'video' ? (
                    <video src={featuredMedia} className="w-full h-full object-cover rounded-lg" controls />
                  ) : (
                    <img src={featuredMedia} alt="Featured preview" className="w-full h-full object-cover rounded-lg" />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <label className="px-2.5 py-1 bg-white text-gray-800 font-bold text-[11px] rounded-lg shadow-md hover:bg-gray-100 cursor-pointer flex items-center gap-1">
                      <Upload size={12} /> Replace
                      <input type="file" accept="image/*,video/*" onChange={handleMediaUpload} className="hidden" />
                    </label>
                    <button
                      type="button"
                      onClick={() => setFeaturedMedia(null)}
                      className="p-1 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 cursor-pointer"
                      title="Remove Media"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaUpload}
                    className="hidden"
                  />
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 shadow-2xs group-hover:scale-110 transition-transform">
                    <ImageIcon size={18} />
                  </div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    Add Featured Media
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    Image or Video file
                  </span>
                </label>
              )}
            </div>

            {/* Save / Publish Action Card */}
            <div className="pt-1.5 space-y-1.5">
              <button
                type="button"
                onClick={handleSaveStory}
                className={`w-full py-2 px-3 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] ${isPublished
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                  : isReadyToSave
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 animate-pulse'
                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
              >
                <CheckCircle2 size={15} />
                <span>{isPublished ? 'Update Story' : 'Save & Publish Story'}</span>
              </button>

              {/* Validation Checklist Indicator */}
              <div className="flex items-center justify-between text-[11px] font-semibold px-2.5 py-1 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200/80 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Required Checklist:</span>
                <span
                  className={`font-bold ${isReadyToSave
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                    }`}
                >
                  {completedCount}/4 {isReadyToSave ? '✓ Ready' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── AI SUMMARY MODAL ─────────────────────────────────────── */}
      {showAIModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAIModal(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-blue-600" />
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Generate AI Summary</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAIModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* AI Settings Collapsible */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAISettingsOpen(!aiSettingsOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  <span>AI Settings</span>
                  {aiSettingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {aiSettingsOpen && (
                  <div className="p-4 space-y-5 bg-white dark:bg-gray-900">
                    {/* Model */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Model</label>
                      <div className="relative">
                        <select
                          value={aiModel}
                          onChange={(e) => setAIModel(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none cursor-pointer"
                        >
                          <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                          <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                          <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                          <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Temperature & Top P */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Temperature</label>
                        <input
                          type="range" min={0} max={2} step={0.01}
                          value={aiTemperature}
                          onChange={(e) => setAITemperature(parseFloat(e.target.value))}
                          className="w-full accent-gray-800 dark:accent-gray-200"
                        />
                        <p className="text-xs text-gray-400 mt-1">Range: 0.00 - 2.00 (Current: {aiTemperature.toFixed(1)})</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Top P</label>
                        <input
                          type="range" min={0} max={1} step={0.01}
                          value={aiTopP}
                          onChange={(e) => setAITopP(parseFloat(e.target.value))}
                          className="w-full accent-gray-800 dark:accent-gray-200"
                        />
                        <p className="text-xs text-gray-400 mt-1">Range: 0.00 - 1.00 (Current: {aiTopP.toFixed(2)})</p>
                      </div>
                    </div>

                    {/* Top K & Max Output Tokens */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Top K</label>
                        <input
                          type="number" min={1} max={200}
                          value={aiTopK}
                          onChange={(e) => setAITopK(parseInt(e.target.value) || 40)}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500/40"
                        />
                        <p className="text-xs text-gray-400 mt-1">Integer value (e.g. 40)</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Max Output Tokens</label>
                        <input
                          type="number" min={1} max={8192}
                          value={aiMaxTokens}
                          onChange={(e) => setAIMaxTokens(parseInt(e.target.value) || 256)}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500/40"
                        />
                        <p className="text-xs text-gray-400 mt-1">Minimum: 1 (e.g. 1024)</p>
                      </div>
                    </div>

                    {/* Custom Instruction */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Custom Instruction</label>
                      <textarea
                        rows={4}
                        value={aiCustomInstruction}
                        onChange={(e) => setAICustomInstruction(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                      />
                      <p className="text-xs text-gray-400 mt-1">Optional: Custom instructions for the AI model</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button
                type="button"
                onClick={() => setShowAIModal(false)}
                className="px-5 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateSummaryFromModal}
                disabled={isGeneratingSummary}
                className="px-6 py-2 text-sm font-bold text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-xl hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isGeneratingSummary ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" opacity=".25"/>
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate Summary
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIO GENERATION SETTINGS MODAL ──────────────────────── */}
      {showAudioModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAudioModal(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-950/40 flex items-center justify-center text-green-600 dark:text-green-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Audio Generation Settings</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAudioModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Collapsible Settings */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAudioSettingsOpen(!audioSettingsOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  <span>Model, voice &amp; generation options</span>
                  {audioSettingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {audioSettingsOpen && (
                  <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
                    {/* Gemini API Key */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Gemini API Key <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="AIza..."
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500/40 font-mono"
                      />
                      <p className="text-xs text-gray-400 mt-1">Your Gemini API key — required for TTS generation</p>
                    </div>

                    {/* Model Name + Voice */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Model Name</label>
                        <div className="relative">
                          <select
                            value={audioModel}
                            onChange={(e) => setAudioModel(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none cursor-pointer"
                          >
                            <option value="gemini-2.5-flash-preview-tts">gemini-2.5-flash-preview-tts</option>
                            <option value="gemini-2.5-pro-preview-tts">gemini-2.5-pro-preview-tts</option>
                            <option value="gemini-1.5-flash-tts">gemini-1.5-flash-tts</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Voice</label>
                        <div className="relative">
                          <select
                            value={audioVoice}
                            onChange={(e) => setAudioVoice(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none cursor-pointer"
                          >
                            <option value="Charon">Charon</option>
                            <option value="Aoede">Aoede</option>
                            <option value="Fenrir">Fenrir</option>
                            <option value="Kore">Kore</option>
                            <option value="Puck">Puck</option>
                            <option value="Zephyr">Zephyr</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Temperature */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Temperature</label>
                      <input
                        type="range" min={0} max={2} step={0.01}
                        value={audioTemperature}
                        onChange={(e) => setAudioTemperature(parseFloat(e.target.value))}
                        className="w-full accent-gray-800 dark:accent-gray-200"
                      />
                      <p className="text-xs text-gray-400 mt-1">Range: 0.00 - 2.00 (Current: {audioTemperature.toFixed(0)})</p>
                    </div>

                    {/* Style Instructions */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Style Instructions</label>
                      <textarea
                        rows={4}
                        value={audioStyleInstruction}
                        onChange={(e) => setAudioStyleInstruction(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Describe how the voice should sound (e.g. "Speak like a professional news anchor in a calm tone"). Do not ask the model to summarize or generate text.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Generated Audio Section */}
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Generated Audio</p>
                <div className="rounded-xl bg-[#c5cae9] dark:bg-indigo-900/60 p-4 space-y-2">
                  {/* Native audio player row */}
                  <div className="bg-white/80 dark:bg-white/10 rounded-full px-4 py-2.5 flex items-center gap-3 shadow-sm">
                    <button
                      type="button"
                      onClick={() => {
                        if (audioRef.current) {
                          if (isPlayingAudio) {
                            audioRef.current.pause();
                            audioRef.current.currentTime = 0;
                            setIsPlayingAudio(false);
                          } else {
                            audioRef.current.play();
                            setIsPlayingAudio(true);
                          }
                        }
                      }}
                      className="w-7 h-7 rounded-full bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      {isPlayingAudio ? (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="3" height="8"/><rect x="6" y="1" width="3" height="8"/></svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="2,1 9,5 2,9"/></svg>
                      )}
                    </button>
                    <span className="text-xs text-gray-500 dark:text-gray-300 shrink-0 font-mono">
                      0:00 {audioDuration ? `/ 0:${String(audioDuration).padStart(2, '0')}` : '/ 0:00'}
                    </span>
                    {/* Fake progress bar */}
                    <div className="flex-1 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div className={`h-full bg-gray-600 dark:bg-gray-300 rounded-full transition-all duration-300 ${isPlayingAudio ? 'w-1/3' : 'w-0'}`} />
                    </div>
                    <button type="button" className="text-gray-500 dark:text-gray-300 cursor-pointer" title="Volume">
                      <Volume2 size={15} />
                    </button>
                    <button type="button" className="text-gray-500 dark:text-gray-300 cursor-pointer">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                    </button>
                  </div>

                  {/* Duration & hint */}
                  <div className="px-1 space-y-0.5">
                    <p className="text-xs text-indigo-800 dark:text-indigo-200 font-medium">
                      Duration: {audioDuration ? `${audioDuration} seconds` : '—'}
                    </p>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                      Preview the generated audio. You can regenerate or save settings.
                    </p>
                  </div>
                </div>

                {/* Last Generated / Status bar */}
                <div className="mt-2 rounded-xl bg-[#9fa8da] dark:bg-indigo-800/70 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-900/70 dark:text-indigo-200/70 uppercase tracking-wider mb-0.5">Last Generated</p>
                    <p className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">
                      {lastGeneratedAt ? `Today at ${lastGeneratedAt}` : 'Not yet generated'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-indigo-900/70 dark:text-indigo-200/70 uppercase tracking-wider mb-0.5">Status</p>
                    <p className={`text-sm font-semibold ${
                      audioStatus === 'Ready' ? 'text-emerald-700 dark:text-emerald-300' :
                      audioStatus === 'Generating...' ? 'text-amber-700 dark:text-amber-300' :
                      'text-indigo-950 dark:text-indigo-100'
                    }`}>
                      {audioStatus}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button
                type="button"
                onClick={() => setShowAudioModal(false)}
                className="px-5 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateAudio}
                disabled={isGeneratingAudio}
                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isGeneratingAudio ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" opacity=".25"/>
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  'Apply'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
