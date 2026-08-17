import { create } from 'zustand';
import type { BlockInstance } from './types';
import { createBlock } from './blocks/registry';
import { cloneBlock, deepClone, createId } from './utils';
import { parseRichPasteToBlocks } from './richPasteEngine';

export type DeviceView = 'desktop' | 'tablet' | 'mobile';

interface EditorStore {
  blocks: BlockInstance[];
  selectedIds: string[];
  clipboard: BlockInstance[] | null;
  htmlModeBlockIds: string[];
  past: BlockInstance[][];
  future: BlockInstance[][];
  theme: 'light' | 'dark';
  documentTitle: string;
  deviceView: DeviceView;
  inserterOpen: boolean;
  settingsSidebarOpen: boolean;
  slashMenu: { open: boolean; blockId: string | null; anchor: { x: number; y: number } | null };

  insertBlock: (type: string, index?: number | null) => string | null;
  insertBlockInto: (targetId: string, type: string, index?: number | null) => string | null;
  insertBlockInstance: (block: BlockInstance, index?: number | null) => void;
  addBlocks: (newBlocks: BlockInstance[], targetId?: string | null) => void;
  updateBlock: (id: string, updater: (b: BlockInstance) => BlockInstance) => void;
  removeBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  moveBlock: (id: string, direction: 'up' | 'down') => void;
  moveBlockToIndex: (id: string, toIndex: number) => void;
  selectBlock: (id: string, additive?: boolean) => void;
  selectBlocks: (ids: string[]) => void;
  selectAllBlocks: () => void;
  clearSelection: () => void;
  copyBlocks: (ids?: string[]) => void;
  pasteBlocks: (index?: number | null) => void;
  deleteSelectedBlocks: () => void;
  duplicateSelectedBlocks: () => void;
  toggleHtmlMode: (id?: string) => void;
  updateBlocksFromHtml: (targetId: string, editedHtml: string) => void;
  setBlocks: (blocks: BlockInstance[]) => void;
  toggleTheme: () => void;
  setDocumentTitle: (title: string) => void;
  setDeviceView: (device: DeviceView) => void;
  setInserterOpen: (open: boolean) => void;
  setSettingsSidebarOpen: (open: boolean) => void;
  openSlashMenu: (blockId: string, x: number, y: number) => void;
  closeSlashMenu: () => void;
  groupSelectedBlocks: () => void;
  ungroupSelectedBlocks: () => void;
  undo: () => void;
  redo: () => void;
  loadFromJSON: (data: { blocks: BlockInstance[] }) => void;
  exportJSON: () => { blocks: BlockInstance[] };
}

const MAX_HISTORY = 100;

function pushHistory(state: EditorStore): Partial<EditorStore> {
  const lastState = state.past[state.past.length - 1];
  if (lastState && JSON.stringify(lastState) === JSON.stringify(state.blocks)) {
    return { future: [] };
  }
  return { past: [...state.past, deepClone(state.blocks)].slice(-MAX_HISTORY), future: [] };
}

export function findBlock(blocks: BlockInstance[], id: string): BlockInstance | null {
  for (const b of blocks) {
    if (b.id === id) return b;
    if (b.innerBlocks) {
      const f = findBlock(b.innerBlocks, id);
      if (f) return f;
    }
  }
  return null;
}

export function getAllBlockIds(blocks: BlockInstance[]): string[] {
  const ids: string[] = [];
  function traverse(list: BlockInstance[]) {
    list.forEach((b) => {
      ids.push(b.id);
      if (b.innerBlocks && b.innerBlocks.length > 0) {
        traverse(b.innerBlocks);
      }
    });
  }
  traverse(blocks);
  return ids;
}

export function updateInTree(blocks: BlockInstance[], id: string, updater: (b: BlockInstance) => BlockInstance): BlockInstance[] {
  return blocks.map((b) => {
    if (b.id === id) return updater(b);
    if (b.innerBlocks) return { ...b, innerBlocks: updateInTree(b.innerBlocks, id, updater) };
    return b;
  });
}

function removeFromTree(blocks: BlockInstance[], id: string): BlockInstance[] {
  return blocks
    .filter((b) => b.id !== id)
    .map((b) => (b.innerBlocks ? { ...b, innerBlocks: removeFromTree(b.innerBlocks, id) } : b));
}

function insertIntoTree(
  blocks: BlockInstance[],
  targetId: string,
  child: BlockInstance,
  index: number | null = null,
): { blocks: BlockInstance[]; inserted: boolean } {
  let inserted = false;

  const next = blocks.map((b) => {
    if (b.id === targetId) {
      const innerBlocks = [...(b.innerBlocks ?? [])];
      const idx = index === null || index < 0 || index > innerBlocks.length ? innerBlocks.length : index;
      innerBlocks.splice(idx, 0, child);
      inserted = true;
      return { ...b, innerBlocks };
    }
    if (b.innerBlocks) {
      const result = insertIntoTree(b.innerBlocks, targetId, child, index);
      if (result.inserted) {
        inserted = true;
        return { ...b, innerBlocks: result.blocks };
      }
    }
    return b;
  });

  return { blocks: next, inserted };
}



function moveInTree(
  blocks: BlockInstance[],
  id: string,
  direction: 'up' | 'down'
): { blocks: BlockInstance[]; moved: boolean } {
  const idx = blocks.findIndex((b) => b.id === id);
  if (idx !== -1) {
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx >= 0 && newIdx < blocks.length) {
      const next = [...blocks];
      const [item] = next.splice(idx, 1);
      next.splice(newIdx, 0, item);
      return { blocks: next, moved: true };
    }
    return { blocks, moved: true };
  }

  let moved = false;
  const next = blocks.map((b) => {
    if (moved || !b.innerBlocks || b.innerBlocks.length === 0) return b;
    const res = moveInTree(b.innerBlocks, id, direction);
    if (res.moved) {
      moved = true;
      return { ...b, innerBlocks: res.blocks };
    }
    return b;
  });

  return { blocks: next, moved };
}

function moveToIndexInTree(
  blocks: BlockInstance[],
  id: string,
  toIndex: number
): { blocks: BlockInstance[]; moved: boolean } {
  const idx = blocks.findIndex((b) => b.id === id);
  if (idx !== -1) {
    const next = [...blocks];
    const [item] = next.splice(idx, 1);
    const clamped = Math.max(0, Math.min(toIndex, next.length));
    next.splice(clamped, 0, item);
    return { blocks: next, moved: true };
  }

  let moved = false;
  const next = blocks.map((b) => {
    if (moved || !b.innerBlocks || b.innerBlocks.length === 0) return b;
    const res = moveToIndexInTree(b.innerBlocks, id, toIndex);
    if (res.moved) {
      moved = true;
      return { ...b, innerBlocks: res.blocks };
    }
    return b;
  });

  return { blocks: next, moved };
}

function duplicateInTree(
  blocks: BlockInstance[],
  id: string
): { blocks: BlockInstance[]; duplicatedId: string | null } {
  const idx = blocks.findIndex((b) => b.id === id);
  if (idx !== -1) {
    const copy = cloneBlock(blocks[idx]);
    const next = [...blocks];
    next.splice(idx + 1, 0, copy);
    return { blocks: next, duplicatedId: copy.id };
  }

  let duplicatedId: string | null = null;
  const next = blocks.map((b) => {
    if (duplicatedId || !b.innerBlocks || b.innerBlocks.length === 0) return b;
    const res = duplicateInTree(b.innerBlocks, id);
    if (res.duplicatedId) {
      duplicatedId = res.duplicatedId;
      return { ...b, innerBlocks: res.blocks };
    }
    return b;
  });

  return { blocks: next, duplicatedId };
}

function sanitizeBlocks(blocks: any[]): BlockInstance[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter((b) => b && typeof b === 'object' && typeof b.id === 'string' && typeof b.type === 'string')
    .map((b) => ({
      id: b.id || createId(),
      type: b.type || 'paragraph',
      attributes: b.attributes && typeof b.attributes === 'object' ? b.attributes : {},
      innerBlocks: Array.isArray(b.innerBlocks) ? sanitizeBlocks(b.innerBlocks) : [],
    }));
}

function getInitialBlocks(): BlockInstance[] {
  try {
    const saved = localStorage.getItem('be-autosave');
    if (saved) {
      const data = JSON.parse(saved);
      if (Array.isArray(data.blocks)) {
        const cleaned = sanitizeBlocks(data.blocks);
        if (cleaned.length > 0) return cleaned;
      }
    }
  } catch { /* ignore */ }
  const defaultBlock = createBlock('paragraph');
  return defaultBlock ? [defaultBlock] : [{ id: 'default-p', type: 'paragraph', attributes: { content: [{ text: '' }] }, innerBlocks: [] }];
}

function getInitialTitle(): string {
  try {
    const saved = localStorage.getItem('be-title');
    if (saved) return saved;
    const autosave = localStorage.getItem('be-autosave');
    if (autosave) {
      const parsed = JSON.parse(autosave);
      if (parsed.documentTitle) return parsed.documentTitle;
    }
  } catch { /* ignore */ }
  return 'Untitled Document';
}

function getInitialTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem('be-theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* ignore */ }
  return 'light';
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  blocks: getInitialBlocks(),
  selectedIds: [],
  clipboard: null,
  htmlModeBlockIds: [],
  past: [],
  future: [],
  theme: getInitialTheme(),
  documentTitle: getInitialTitle(),
  deviceView: 'desktop',
  inserterOpen: true,
  settingsSidebarOpen: true,
  slashMenu: { open: false, blockId: null, anchor: null },

  toggleHtmlMode: (id) => {
    set((state) => {
      const targetId = id || (state.selectedIds.length > 0 ? state.selectedIds[0] : null);
      if (!targetId) return {};
      const exists = state.htmlModeBlockIds.includes(targetId);
      const htmlModeBlockIds = exists
        ? state.htmlModeBlockIds.filter((i) => i !== targetId)
        : [...state.htmlModeBlockIds, targetId];
      return { htmlModeBlockIds };
    });
  },

  updateBlocksFromHtml: (targetId, editedHtml) => {
    set((state) => {
      if (!editedHtml || !editedHtml.trim()) {
        return { htmlModeBlockIds: state.htmlModeBlockIds.filter((i) => i !== targetId) };
      }

      const generatedBlocks = parseRichPasteToBlocks(editedHtml);
      if (generatedBlocks.length === 0) {
        return { htmlModeBlockIds: state.htmlModeBlockIds.filter((i) => i !== targetId) };
      }

      let updated = [...state.blocks];
      const targetBlock = findBlock(updated, targetId);
      if (targetBlock) {
        const replaceInTree = (tree: BlockInstance[]): BlockInstance[] => {
          const idx = tree.findIndex((b) => b.id === targetId);
          if (idx !== -1) {
            const copy = [...tree];
            copy.splice(idx, 1, ...generatedBlocks);
            return copy;
          }
          return tree.map((b) => {
            if (!b.innerBlocks) return b;
            return { ...b, innerBlocks: replaceInTree(b.innerBlocks) };
          });
        };
        updated = replaceInTree(updated);
      } else {
        updated.push(...generatedBlocks);
      }

      return {
        ...pushHistory(state),
        blocks: updated,
        selectedIds: generatedBlocks.map((b) => b.id),
        htmlModeBlockIds: state.htmlModeBlockIds.filter((i) => i !== targetId),
      };
    });
  },

  setDocumentTitle: (title) => {
    try {
      localStorage.setItem('be-title', title);
    } catch { /* ignore */ }
    set({ documentTitle: title });
  },
  setDeviceView: (device) => set({ deviceView: device }),

  insertBlock: (type, index = null) => {
    const block = createBlock(type);
    if (!block) return null;
    set((state) => {
      const blocks = [...state.blocks];
      const idx = index === null || index < 0 || index > blocks.length ? blocks.length : index;

      // Inherit font family and styling attributes from preceding/selected block
      const prevBlock = idx > 0 ? blocks[idx - 1] : (state.selectedIds.length > 0 ? state.blocks.find((b) => b.id === state.selectedIds[0]) : null);
      if (prevBlock && prevBlock.attributes) {
        if (prevBlock.attributes.fontFamily) {
          block.attributes.fontFamily = prevBlock.attributes.fontFamily;
        }
        if (prevBlock.attributes.fontFamilyLabel) {
          block.attributes.fontFamilyLabel = prevBlock.attributes.fontFamilyLabel;
        }
        if (prevBlock.attributes.textColor) {
          block.attributes.textColor = prevBlock.attributes.textColor;
        }
      }

      blocks.splice(idx, 0, block);
      return { ...pushHistory(state), blocks, selectedIds: [block.id] };
    });
    return block.id;
  },

  insertBlockInto: (targetId, type, index = null) => {
    const targetBlock = findBlock(get().blocks, targetId);
    if (targetBlock?.type === 'cover' && type !== 'heading' && type !== 'paragraph') {
      return null;
    }
    const block = createBlock(type);
    if (!block) return null;
    set((state) => {
      const result = insertIntoTree(state.blocks, targetId, block, index);
      if (!result.inserted) return {};
      return { ...pushHistory(state), blocks: result.blocks, selectedIds: [block.id] };
    });
    return block.id;
  },

  insertBlockInstance: (block, index = null) => {
    set((state) => {
      const blocks = [...state.blocks];
      const idx = index === null || index < 0 || index > blocks.length ? blocks.length : index;
      blocks.splice(idx, 0, block);
      return { ...pushHistory(state), blocks, selectedIds: [block.id] };
    });
  },

  addBlocks: (newBlocks, targetId = null) => {
    if (!newBlocks || newBlocks.length === 0) return;
    set((state) => {
      const selectedId = targetId || (state.selectedIds.length > 0 ? state.selectedIds[0] : null);

      if (selectedId) {
        const targetBlock = findBlock(state.blocks, selectedId);
        if (targetBlock && targetBlock.attributes) {
          const inheritedFontFamily = targetBlock.attributes.fontFamily;
          const inheritedFontFamilyLabel = targetBlock.attributes.fontFamilyLabel;
          const inheritedTextColor = targetBlock.attributes.textColor;

          if (inheritedFontFamily) {
            newBlocks.forEach((nb) => {
              if (nb.attributes) {
                if (!nb.attributes.fontFamily) {
                  nb.attributes.fontFamily = inheritedFontFamily;
                }
                if (!nb.attributes.fontFamilyLabel && inheritedFontFamilyLabel) {
                  nb.attributes.fontFamilyLabel = inheritedFontFamilyLabel;
                }
                if (!nb.attributes.textColor && inheritedTextColor) {
                  nb.attributes.textColor = inheritedTextColor;
                }
              }
            });
          }

          const containerTypes = ['column', 'group', 'cover', 'stack'];
          if (containerTypes.includes(targetBlock.type)) {
            const filteredNewBlocks = targetBlock.type === 'cover'
              ? newBlocks.filter((b) => b.type === 'heading' || b.type === 'paragraph')
              : newBlocks;
            if (filteredNewBlocks.length === 0) return {};
            const updated = updateInTree(state.blocks, selectedId, (b) => ({
              ...b,
              innerBlocks: [...(b.innerBlocks ?? []), ...filteredNewBlocks],
            }));
            return {
              ...pushHistory(state),
              blocks: updated,
              selectedIds: filteredNewBlocks.map((b) => b.id),
            };
          } else {
            let inserted = false;
            const insertAfterInTree = (tree: BlockInstance[]): BlockInstance[] => {
              const idx = tree.findIndex((b) => b.id === selectedId);
              if (idx !== -1) {
                inserted = true;
                const copy = [...tree];
                copy.splice(idx + 1, 0, ...newBlocks);
                return copy;
              }
              return tree.map((b) => {
                if (inserted || !b.innerBlocks) return b;
                return { ...b, innerBlocks: insertAfterInTree(b.innerBlocks) };
              });
            };

            const updated = insertAfterInTree(state.blocks);
            if (inserted) {
              return {
                ...pushHistory(state),
                blocks: updated,
                selectedIds: newBlocks.map((b) => b.id),
              };
            }
          }
        }
      }

      const blocks = [...state.blocks, ...newBlocks];
      return {
        ...pushHistory(state),
        blocks,
        selectedIds: newBlocks.map((b) => b.id),
      };
    });
  },

  updateBlock: (id, updater) => {
    set((state) => ({ ...pushHistory(state), blocks: updateInTree(state.blocks, id, updater) }));
  },

  removeBlock: (id) => {
    set((state) => ({
      ...pushHistory(state),
      blocks: removeFromTree(state.blocks, id),
      selectedIds: state.selectedIds.filter((s) => s !== id),
    }));
  },

  duplicateBlock: (id) => {
    set((state) => {
      const res = duplicateInTree(state.blocks, id);
      if (!res.duplicatedId) return {};
      return {
        ...pushHistory(state),
        blocks: res.blocks,
        selectedIds: [res.duplicatedId],
      };
    });
  },

  moveBlock: (id, direction) => {
    set((state) => {
      const res = moveInTree(state.blocks, id, direction);
      if (!res.moved) return {};
      return { ...pushHistory(state), blocks: res.blocks };
    });
  },

  moveBlockToIndex: (id, toIndex) => {
    set((state) => {
      const res = moveToIndexInTree(state.blocks, id, toIndex);
      if (!res.moved) return {};
      return { ...pushHistory(state), blocks: res.blocks };
    });
  },

  selectBlock: (id, additive = false) => {
    set((state) => {
      if (additive) {
        return state.selectedIds.includes(id)
          ? { selectedIds: state.selectedIds.filter((s) => s !== id) }
          : { selectedIds: [...state.selectedIds, id] };
      }
      return { selectedIds: [id] };
    });
  },

  selectBlocks: (ids) => set({ selectedIds: ids }),
  selectAllBlocks: () => {
    const state = get();
    const allIds = getAllBlockIds(state.blocks);
    set({ selectedIds: allIds });
  },
  clearSelection: () => set({ selectedIds: [] }),

  copyBlocks: (ids) => {
    const state = get();
    const targetIds = ids ?? state.selectedIds;
    const copied = targetIds
      .map((id) => findBlock(state.blocks, id))
      .filter((b): b is BlockInstance => b !== null)
      .map((b) => cloneBlock(b, false));
    set({ clipboard: copied });
  },

  pasteBlocks: (index) => {
    const state = get();
    if (!state.clipboard) return;
    const blocks = [...state.blocks];
    let insertAt = index ?? blocks.length;
    const newIds: string[] = [];
    for (const block of state.clipboard) {
      const copy = cloneBlock(block, true);
      blocks.splice(insertAt, 0, copy);
      newIds.push(copy.id);
      insertAt++;
    }
    set({ ...pushHistory(state), blocks, selectedIds: newIds });
  },

  deleteSelectedBlocks: () => {
    set((state) => {
      if (state.selectedIds.length === 0) return {};
      let updated = [...state.blocks];
      state.selectedIds.forEach((id) => {
        updated = removeFromTree(updated, id);
      });
      return { ...pushHistory(state), blocks: updated, selectedIds: [] };
    });
  },

  duplicateSelectedBlocks: () => {
    set((state) => {
      if (state.selectedIds.length === 0) return {};
      let updated = [...state.blocks];
      const newSelectedIds: string[] = [];

      state.selectedIds.forEach((id) => {
        const res = duplicateInTree(updated, id);
        if (res.duplicatedId) {
          updated = res.blocks;
          newSelectedIds.push(res.duplicatedId);
        }
      });

      if (newSelectedIds.length === 0) return {};
      return { ...pushHistory(state), blocks: updated, selectedIds: newSelectedIds };
    });
  },

  setBlocks: (blocks) => set({ blocks }),

  toggleTheme: () => set((s) => {
    const next = s.theme === 'light' ? 'dark' : 'light';
    try {
      localStorage.setItem('be-theme', next);
    } catch { /* ignore */ }
    return { theme: next };
  }),
  setInserterOpen: (open) => set((s) => ({ inserterOpen: open, settingsSidebarOpen: open ? false : s.settingsSidebarOpen })),
  setSettingsSidebarOpen: (open) => set((s) => ({ settingsSidebarOpen: open, inserterOpen: open ? false : s.inserterOpen })),
  openSlashMenu: (blockId, x, y) => set({ slashMenu: { open: true, blockId, anchor: { x, y } } }),
  closeSlashMenu: () => set({ slashMenu: { open: false, blockId: null, anchor: null } }),
  groupSelectedBlocks: () => {
    set((state) => {
      if (state.selectedIds.length === 0) return {};
      const selectedBlocks = state.selectedIds.map((id) => findBlock(state.blocks, id)).filter((b): b is BlockInstance => b !== null);
      if (selectedBlocks.length === 0) return {};

      const newGroup = createBlock('group', {
        attributes: { padding: 16, gap: 12, borderRadius: 16, backgroundColor: '#ffffff' },
        innerBlocks: deepClone(selectedBlocks),
      });

      const firstId = state.selectedIds[0];
      const removeOtherIds = new Set(state.selectedIds.slice(1));

      const updateRecursive = (list: BlockInstance[]): BlockInstance[] => {
        const result: BlockInstance[] = [];
        for (const item of list) {
          if (item.id === firstId) {
            result.push(newGroup);
          } else if (!removeOtherIds.has(item.id)) {
            if (item.innerBlocks && item.innerBlocks.length > 0) {
              result.push({ ...item, innerBlocks: updateRecursive(item.innerBlocks) });
            } else {
              result.push(item);
            }
          }
        }
        return result;
      };

      const newBlocks = updateRecursive(state.blocks);
      return {
        ...pushHistory(state),
        blocks: newBlocks,
        selectedIds: [newGroup.id],
      };
    });
  },

  ungroupSelectedBlocks: () => {
    set((state) => {
      if (state.selectedIds.length === 0) return {};
      const groupId = state.selectedIds[0];
      const targetGroup = findBlock(state.blocks, groupId);
      if (!targetGroup || targetGroup.type !== 'group') return {};

      const children = targetGroup.innerBlocks ?? [];

      const unwrapRecursive = (list: BlockInstance[]): BlockInstance[] => {
        const result: BlockInstance[] = [];
        for (const item of list) {
          if (item.id === groupId) {
            result.push(...deepClone(children));
          } else if (item.innerBlocks && item.innerBlocks.length > 0) {
            result.push({ ...item, innerBlocks: unwrapRecursive(item.innerBlocks) });
          } else {
            result.push(item);
          }
        }
        return result;
      };

      const newBlocks = unwrapRecursive(state.blocks);
      return {
        ...pushHistory(state),
        blocks: newBlocks,
        selectedIds: children.map((c) => c.id),
      };
    });
  },

  undo: () => {
    set((state) => {
      if (state.past.length === 0) return {};
      const previous = state.past[state.past.length - 1];
      return {
        blocks: previous,
        past: state.past.slice(0, -1),
        future: [deepClone(state.blocks), ...state.future].slice(0, MAX_HISTORY),
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) return {};
      const next = state.future[0];
      return {
        blocks: next,
        past: [...state.past, deepClone(state.blocks)].slice(-MAX_HISTORY),
        future: state.future.slice(1),
      };
    });
  },

  loadFromJSON: (data) => set({
    blocks: Array.isArray(data.blocks) ? data.blocks : [],
    selectedIds: [], past: [], future: [],
  }),

  exportJSON: () => ({ blocks: get().blocks }),
}));

// IndexedDB Persistence Helper for Unlimited & Guaranteed Auto-Save
const DB_NAME = 'EditorStudioDB';
const STORE_NAME = 'autosave';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveToIndexedDB(data: { blocks: BlockInstance[]; documentTitle: string }) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ ...data, updatedAt: Date.now() }, 'current');
  } catch (e) {
    console.warn('IndexedDB save failed:', e);
  }
}

export async function loadFromIndexedDB(): Promise<{ blocks: BlockInstance[]; documentTitle?: string } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('current');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

function sanitizeForLocalStorage(blocks: BlockInstance[]): BlockInstance[] {
  return blocks.map((b) => {
    const newAttr: Record<string, unknown> = { ...b.attributes };
    for (const key in newAttr) {
      if (typeof newAttr[key] === 'string' && (newAttr[key] as string).length > 30000 && (newAttr[key] as string).startsWith('data:')) {
        newAttr[key] = '';
      }
    }
    const innerBlocks = b.innerBlocks ? sanitizeForLocalStorage(b.innerBlocks) : undefined;
    return { ...b, attributes: newAttr, innerBlocks };
  });
}

// Automatic subscription to persist blocks in localStorage + IndexedDB on every mutation
useEditorStore.subscribe((state) => {
  const fullPayload = { blocks: state.blocks, documentTitle: state.documentTitle };

  // 1. Always save to IndexedDB (unlimited storage, survives refresh 100%)
  saveToIndexedDB(fullPayload);

  // 2. Save sanitized payload to localStorage (no quota warnings!)
  try {
    const localPayload = { blocks: sanitizeForLocalStorage(state.blocks), documentTitle: state.documentTitle };
    localStorage.setItem('be-autosave', JSON.stringify(localPayload));
    localStorage.setItem('be-title', state.documentTitle);
  } catch {
    /* IndexedDB holds full data safely */
  }
});

// Auto-sync from IndexedDB on startup if IndexedDB has saved data
if (typeof window !== 'undefined') {
  setTimeout(() => {
    loadFromIndexedDB().then((data) => {
      if (data && Array.isArray(data.blocks) && data.blocks.length > 0) {
        const currentBlocks = useEditorStore.getState().blocks;
        if (JSON.stringify(currentBlocks) !== JSON.stringify(data.blocks)) {
          useEditorStore.getState().loadFromJSON({ blocks: data.blocks });
          if (data.documentTitle) {
            useEditorStore.getState().setDocumentTitle(data.documentTitle);
          }
        }
      }
    });
  }, 50);
}
