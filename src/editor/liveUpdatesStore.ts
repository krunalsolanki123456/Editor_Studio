import { create } from 'zustand';
import { createId } from './utils';

export interface LiveStoryItem {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  isPinned?: boolean;
  createdAt: number;
}

interface LiveUpdatesState {
  mode: 'story' | 'live-update';
  updates: LiveStoryItem[];
  isLiveBroadcasting: boolean;
  editingUpdateId: string | null;
  setMode: (mode: 'story' | 'live-update') => void;
  toggleLiveBroadcasting: () => void;
  addUpdate: (update: Omit<LiveStoryItem, 'id' | 'createdAt'>) => void;
  updateLiveStory: (id: string, update: Partial<LiveStoryItem>) => void;
  deleteUpdate: (id: string) => void;
  togglePinUpdate: (id: string) => void;
  setEditingUpdateId: (id: string | null) => void;
}

export const useLiveUpdatesStore = create<LiveUpdatesState>((set) => ({
  mode: 'live-update',
  updates: [],
  isLiveBroadcasting: false,
  editingUpdateId: null,
  setMode: (mode) => set({ mode }),
  toggleLiveBroadcasting: () => set((state) => ({ isLiveBroadcasting: !state.isLiveBroadcasting })),
  addUpdate: (update) => set((state) => ({
    updates: [
      { ...update, id: createId(), createdAt: Date.now() },
      ...state.updates
    ]
  })),
  updateLiveStory: (id, update) => set((state) => ({
    updates: state.updates.map(u => u.id === id ? { ...u, ...update } : u)
  })),
  deleteUpdate: (id) => set((state) => ({
    updates: state.updates.filter(u => u.id !== id)
  })),
  togglePinUpdate: (id) => set((state) => ({
    updates: state.updates.map(u => u.id === id ? { ...u, isPinned: !u.isPinned } : u)
  })),
  setEditingUpdateId: (id) => set({ editingUpdateId: id }),
}));
