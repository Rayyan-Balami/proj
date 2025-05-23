import { create } from 'zustand';
import { shallow } from 'zustand/shallow';
import { useEffect } from 'react';

export interface SelectableItem {
  id: string;
  type: 'folder' | 'document';
  name: string; // Changed from title to name
}

interface SelectionState {
  selectedIds: Set<string>;
  lastSelectedId: string | null;
  selectionAnchor: string | null;
  lastClickTime: number;
  lastClickId: string | null;
  itemPositions: Map<string, number>;
  visibleItems: SelectableItem[];
}

interface SelectionActions {
  select: (id: string, event: React.MouseEvent) => void;
  toggle: (id: string) => void;
  clear: () => void;
  selectRange: (startId: string, endId: string) => void;
  isSelected: (id: string) => boolean;
  updateItemPositions: (items: SelectableItem[]) => void;
  handleItemClick: (
    id: string,
    event: React.MouseEvent,
    onOpen?: () => void
  ) => void;
  selectAll: () => void;
  setVisibleItems: (items: SelectableItem[]) => void;
  deleteSelected: (onDelete?: (ids: Set<string>) => void) => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  getSelectedItems: () => SelectableItem[];
  logSelection: () => void;
}

type SelectionStore = SelectionState & SelectionActions;

const addToSet = <T>(set: Set<T>, item: T): Set<T> => {
  const newSet = new Set(set);
  newSet.add(item);
  return newSet;
};

const removeFromSet = <T>(set: Set<T>, item: T): Set<T> => {
  const newSet = new Set(set);
  newSet.delete(item);
  return newSet;
};

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  selectedIds: new Set<string>(),
  lastSelectedId: null,
  selectionAnchor: null,
  lastClickTime: 0,
  lastClickId: null,
  itemPositions: new Map<string, number>(),
  visibleItems: [],
  
  setVisibleItems: (items: SelectableItem[]) => {
    set({ visibleItems: items });
    get().updateItemPositions(items);
  },
  
  selectAll: () => {
    const { visibleItems } = get();
    if (!visibleItems.length) return;
    
    const newSelectedIds = new Set<string>();
    for (const item of visibleItems) {
      newSelectedIds.add(item.id);
    }
    
    set({
      selectedIds: newSelectedIds,
      lastSelectedId: visibleItems[visibleItems.length - 1].id,
      selectionAnchor: visibleItems[0].id
    });
    
    // Log the selection
    console.log(`Selected all ${newSelectedIds.size} items`);
    get().logSelection();
  },
  
  getSelectedItems: () => {
    const { selectedIds, visibleItems } = get();
    return visibleItems.filter(item => selectedIds.has(item.id));
  },
  
  logSelection: () => {
    const selectedItems = get().getSelectedItems();
    if (selectedItems.length === 0) {
      console.log("No items selected");
      return;
    }
    
    console.group(`${selectedItems.length} item(s) selected:`);
    
    // Group by type for better organization
    const folders = selectedItems.filter(item => item.type === 'folder');
    const documents = selectedItems.filter(item => item.type === 'document');
    
    if (folders.length > 0) {
      console.group(`Folders (${folders.length}):`);
      folders.forEach(folder => {
        console.log(`- ${folder.name} (ID: ${folder.id})`); // Changed title to name
      });
      console.groupEnd();
    }
    
    if (documents.length > 0) {
      console.group(`Documents (${documents.length}):`);
      documents.forEach(doc => {
        console.log(`- ${doc.name} (ID: ${doc.id})`); // Changed title to name
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  },
  
  deleteSelected: (onDelete?: (ids: Set<string>) => void) => {
    const { selectedIds } = get();
    if (selectedIds.size === 0) return;
    
    // Log items being deleted
    console.log(`Deleting ${selectedIds.size} items:`);
    get().logSelection();
    
    if (onDelete) {
      onDelete(selectedIds);
    } else {
      console.log('Delete action for items:', Array.from(selectedIds));
    }
    
    set({
      selectedIds: new Set<string>(),
      lastSelectedId: null,
      selectionAnchor: null
    });
  },
  
  handleKeyDown: (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      e.preventDefault();
      get().selectAll();
    }
    
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const { selectedIds } = get();
      if (selectedIds.size > 0) {
        e.preventDefault();
        get().deleteSelected();
      }
    }
    
    if (e.key === 'Escape') {
      get().clear();
    }
  },
  
  select: (id: string, event: React.MouseEvent) => {
    const { selectedIds, visibleItems } = get();
    
    if (event.metaKey || event.ctrlKey) {
      // Toggle selection with Ctrl/Cmd
      set(state => ({
        selectedIds: state.selectedIds.has(id) 
          ? removeFromSet(state.selectedIds, id)
          : addToSet(state.selectedIds, id),
        lastSelectedId: id,
        selectionAnchor: id
      }));
    } else if (event.shiftKey && get().selectionAnchor) {
      // Shift-select for range
      const anchorId = get().selectionAnchor;
      get().selectRange(anchorId, id);
    } else {
      // Normal single selection
      const newSelection = new Set<string>([id]);
      set({
        selectedIds: newSelection,
        lastSelectedId: id,
        selectionAnchor: id
      });
    }
    
    // Log selection after a small delay to ensure state has updated
    setTimeout(() => get().logSelection(), 0);
  },
  
  toggle: (id: string) => {
    set(state => ({
      selectedIds: state.selectedIds.has(id)
        ? removeFromSet(state.selectedIds, id)
        : addToSet(state.selectedIds, id),
      lastSelectedId: id,
      selectionAnchor: id
    }));
    
    setTimeout(() => get().logSelection(), 0);
  },
  
  clear: () => {
    const { selectedIds } = get();
    if (selectedIds.size === 0) return;
    set({
      selectedIds: new Set<string>(),
      lastSelectedId: null
    });
    console.log("Selection cleared");
  },
  
  updateItemPositions: (items: SelectableItem[]) => {
    const itemPositions = new Map<string, number>();
    items.forEach((item, index) => {
      itemPositions.set(item.id, index);
    });
    set({ itemPositions });
  },
  
  selectRange: (startId: string, endId: string) => {
    const { itemPositions, visibleItems } = get();
    
    let startIndex = itemPositions.get(startId) ?? -1;
    let endIndex = itemPositions.get(endId) ?? -1;
    
    if (startIndex === -1 || endIndex === -1) {
      // Try to find positions in visibleItems
      startIndex = visibleItems.findIndex(item => item.id === startId);
      endIndex = visibleItems.findIndex(item => item.id === endId);
    }
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    
    const newSelectedIds = new Set<string>();
    for (let i = start; i <= end; i++) {
      if (i < visibleItems.length) {
        newSelectedIds.add(visibleItems[i].id);
      }
    }
    
    set({ 
      selectedIds: newSelectedIds,
      lastSelectedId: endId
    });
    
    setTimeout(() => get().logSelection(), 0);
  },
  
  isSelected: (id: string) => {
    return get().selectedIds.has(id);
  },
  
  handleItemClick: (id: string, event: React.MouseEvent, onOpen?: () => void) => {
    const now = Date.now();
    const { lastClickTime, lastClickId } = get();
    
    if (lastClickId === id && now - lastClickTime < 350) {
      // Double click
      if (onOpen) {
        requestAnimationFrame(() => onOpen());
      }
      set({ lastClickTime: 0, lastClickId: null });
    } else {
      // Single click
      get().select(id, event);
      set({ lastClickTime: now, lastClickId: id });
    }
  }
}));

export function useKeyboardShortcuts(onDelete?: (ids: Set<string>) => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      useSelectionStore.getState().handleKeyDown(e);
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete) {
        const selectedIds = useSelectionStore.getState().selectedIds;
        if (selectedIds.size > 0) {
          onDelete(selectedIds);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onDelete]);
}

export const useSelectedIds = () => 
  useSelectionStore(state => state.selectedIds);

export const useSelectionCount = () =>
  useSelectionStore(state => state.selectedIds.size);

export const selectedIdsEqual = (prev: Set<string>, next: Set<string>) => {
  if (prev.size !== next.size) return false;
  for (const id of prev) {
    if (!next.has(id)) return false;
  }
  return true;
};