import AsyncStorage from '@react-native-async-storage/async-storage';
import { Folder } from '../types';
import { recomputeFolderStats } from './recompute';

const FOLDERS_KEY = '@trace/folders';

export async function loadFolders(): Promise<Folder[]> {
  const raw = await AsyncStorage.getItem(FOLDERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Folder[];
  } catch {
    return [];
  }
}

export async function loadTopLevelFolders(): Promise<Folder[]> {
  const all = await loadFolders();
  return all.filter((f) => !f.parentFolderId);
}

export async function loadSubfolders(parentFolderId: string): Promise<Folder[]> {
  const all = await loadFolders();
  return all.filter((f) => f.parentFolderId === parentFolderId);
}

export async function saveFolders(folders: Folder[]): Promise<void> {
  await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

export async function addFolder(
  name: string,
  parentFolderId?: string
): Promise<Folder> {
  const folders = await loadFolders();
  const folder: Folder = {
    id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    parentFolderId,
    name: name.trim(),
    createdAt: Date.now(),
    projectCount: 0,
  };
  await saveFolders([folder, ...folders]);
  if (parentFolderId) await recomputeFolderStats(parentFolderId);
  return folder;
}

export async function deleteFolder(id: string): Promise<void> {
  const folders = await loadFolders();
  await saveFolders(folders.filter((f) => f.id !== id));
}

export async function getFolder(id: string): Promise<Folder | null> {
  const folders = await loadFolders();
  return folders.find((f) => f.id === id) ?? null;
}

export async function collectDescendantFolderIds(
  rootId: string
): Promise<string[]> {
  const folders = await loadFolders();
  const result: string[] = [];
  const queue: string[] = [rootId];
  while (queue.length) {
    const current = queue.shift()!;
    result.push(current);
    for (const f of folders) {
      if (f.parentFolderId === current) queue.push(f.id);
    }
  }
  return result;
}
