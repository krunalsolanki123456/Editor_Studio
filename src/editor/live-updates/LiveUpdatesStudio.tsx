import { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import { Pin, X, Edit, Trash2, Search, Plus, Play, Square, Upload, Check } from 'lucide-react';
import { useLiveUpdatesStore } from '../liveUpdatesStore';
import { fileToDataUrl } from '../media';

const FONT_FAMILIES = [
  { label: 'Hind Vadodara (Gujarati)', value: "'Hind Vadodara', 'Noto Sans Gujarati', sans-serif" },
  { label: 'Inter (Sans-Serif)', value: 'Inter, sans-serif' },
  { label: 'Georgia (Serif)', value: 'Georgia, serif' },
  { label: 'JetBrains Mono (Code)', value: '"JetBrains Mono", monospace' },
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28];

const POPULAR_TAGS = [
  'Breaking', 'Gujarat', 'Politics', 'Elections',
  'Crime', 'Sports', 'Business', 'Weather', 'National',
];

export default function LiveUpdatesStudio() {
  const updates = useLiveUpdatesStore((s) => s.updates);
  const isLiveBroadcasting = useLiveUpdatesStore((s) => s.isLiveBroadcasting);
  const toggleLiveBroadcasting = useLiveUpdatesStore((s) => s.toggleLiveBroadcasting);
  const addUpdate = useLiveUpdatesStore((s) => s.addUpdate);
  const updateLiveStory = useLiveUpdatesStore((s) => s.updateLiveStory);
  const deleteUpdate = useLiveUpdatesStore((s) => s.deleteUpdate);
  const togglePinUpdate = useLiveUpdatesStore((s) => s.togglePinUpdate);
  const editingUpdateId = useLiveUpdatesStore((s) => s.editingUpdateId);
  const setEditingUpdateId = useLiveUpdatesStore((s) => s.setEditingUpdateId);

  // Form State
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isPinned, setIsPinned] = useState(false);
  const [selectedFont, setSelectedFont] = useState(FONT_FAMILIES[0].value);
  const [selectedFontSize, setSelectedFontSize] = useState(16);
  const [searchFilter, setSearchFilter] = useState('');

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load item into form when editing
  useEffect(() => {
    if (editingUpdateId) {
      const item = updates.find((u) => u.id === editingUpdateId);
      if (item) {
        setTitle(item.title);
        setContentHtml(item.content);
        setTags(item.tags || []);
        setMediaUrl(item.mediaUrl || '');
        setMediaType(item.mediaType || 'image');
        setIsPinned(Boolean(item.isPinned));
        if (editorRef.current) {
          editorRef.current.innerHTML = item.content;
        }
      }
    }
  }, [editingUpdateId, updates]);

  const handleResetForm = () => {
    setTitle('');
    setContentHtml('');
    setTags([]);
    setNewTagInput('');
    setMediaUrl('');
    setMediaType('image');
    setIsPinned(false);
    setEditingUpdateId(null);
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  };

  const handleExecCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      setContentHtml(editorRef.current.innerHTML);
    }
  };

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    setMediaUrl(url);
    setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !contentHtml.trim()) return;

    if (editingUpdateId) {
      updateLiveStory(editingUpdateId, {
        title: title.trim(),
        content: contentHtml.trim(),
        tags,
        mediaUrl: mediaUrl.trim() || undefined,
        mediaType,
        isPinned,
      });
    } else {
      addUpdate({
        title: title.trim() || 'Breaking Update',
        content: contentHtml.trim(),
        tags,
        mediaUrl: mediaUrl.trim() || undefined,
        mediaType,
        isPinned,
      });
    }
    handleResetForm();
  };

  const filteredUpdates = updates.filter((u) => {
    return u.title.toLowerCase().includes(searchFilter.toLowerCase()) || 
           u.content.toLowerCase().includes(searchFilter.toLowerCase());
  });

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Left side - Studio/Form */}
      <div className="w-1/2 p-6 border-r border-gray-200 dark:border-gray-800 flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Live Updates Studio</h2>
          <button
            onClick={toggleLiveBroadcasting}
            className={`flex items-center px-4 py-2 rounded-full font-medium transition-colors ${
              isLiveBroadcasting ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {isLiveBroadcasting ? (
              <><Square className="w-4 h-4 mr-2" /> Stop Broadcasting</>
            ) : (
              <><Play className="w-4 h-4 mr-2" /> Start Broadcasting</>
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Breaking: Election Results"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
            <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-2 border-b border-gray-300 dark:border-gray-700 flex flex-wrap gap-2">
                <select 
                  value={selectedFont} 
                  onChange={(e) => { setSelectedFont(e.target.value); handleExecCmd('fontName', e.target.value); }}
                  className="px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                >
                  {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <select 
                  value={selectedFontSize} 
                  onChange={(e) => { setSelectedFontSize(Number(e.target.value)); handleExecCmd('fontSize', '3'); }}
                  className="px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                >
                  {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
                </select>
                <button type="button" onClick={() => handleExecCmd('bold')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><b>B</b></button>
                <button type="button" onClick={() => handleExecCmd('italic')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><i>I</i></button>
                <button type="button" onClick={() => handleExecCmd('underline')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"><u>U</u></button>
              </div>
              <div
                ref={editorRef}
                contentEditable
                onInput={() => {
                  if (editorRef.current) setContentHtml(editorRef.current.innerHTML);
                }}
                className="p-4 min-h-[150px] bg-white dark:bg-gray-800 focus:outline-none text-gray-900 dark:text-white"
                style={{ fontFamily: selectedFont, fontSize: `${selectedFontSize}px` }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Media</label>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg flex items-center"
              >
                <Upload className="w-4 h-4 mr-2" /> Upload Image/Video
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" className="hidden" />
            </div>
            {mediaUrl && (
              <div className="mt-4 relative inline-block rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700">
                {mediaType === 'image' ? (
                  <img src={mediaUrl} alt="Preview" className="max-h-48 object-cover" />
                ) : (
                  <video src={mediaUrl} className="max-h-48 object-cover" controls />
                )}
                <button type="button" onClick={() => { setMediaUrl(''); setMediaType('image'); }} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm flex items-center">
                  #{tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 text-blue-500 hover:text-blue-700"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag(newTagInput))}
                placeholder="Add a tag..."
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <button type="button" onClick={() => handleAddTag(newTagInput)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Add</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {POPULAR_TAGS.map(tag => (
                <button type="button" key={tag} onClick={() => handleAddTag(tag)} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-300 dark:hover:bg-gray-700">
                  +{tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input type="checkbox" id="pinUpdate" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="pinUpdate" className="text-sm text-gray-700 dark:text-gray-300">Pin this update to top</label>
          </div>

          <div className="flex space-x-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center">
              {editingUpdateId ? <><Check className="w-4 h-4 mr-2" /> Update</> : <><Plus className="w-4 h-4 mr-2" /> Post Update</>}
            </button>
            {editingUpdateId && (
              <button type="button" onClick={handleResetForm} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-medium rounded-lg">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Right side - Live Feed Preview */}
      <div className="w-1/2 p-6 flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <div className={`w-2.5 h-2.5 rounded-full mr-2 ${isLiveBroadcasting ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
            Live Feed Preview
          </h2>
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 pr-4 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {filteredUpdates.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
              No updates yet. Create your first live update!
            </div>
          ) : (
            filteredUpdates.map((update) => (
              <div key={update.id} className={`p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border ${update.isPinned ? 'border-yellow-400 dark:border-yellow-600' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    {update.isPinned && <Pin className="w-4 h-4 text-yellow-500" />}
                    <h3 className="font-bold text-gray-900 dark:text-white">{update.title}</h3>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button onClick={() => setEditingUpdateId(update.id)} className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => togglePinUpdate(update.id)} className={`p-1.5 rounded ${update.isPinned ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30'}`}>
                      <Pin className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteUpdate(update.id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="text-gray-700 dark:text-gray-300 text-sm mb-3" dangerouslySetInnerHTML={{ __html: update.content }} />
                
                {update.mediaUrl && (
                  <div className="mb-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    {update.mediaType === 'image' ? (
                      <img src={update.mediaUrl} alt="" className="w-full max-h-64 object-cover" />
                    ) : (
                      <video src={update.mediaUrl} className="w-full max-h-64 object-cover" controls />
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-1 mt-2">
                  {update.tags?.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
