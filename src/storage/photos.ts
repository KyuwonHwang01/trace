import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Photo } from '../types';
import { loadAllProjects, saveProjects, recomputeFolderStats } from './projects';

const PHOTOS_KEY_PREFIX = '@timelapse/photos/';
const PHOTO_DIR = `${FileSystem.documentDirectory}timelapse-photos/`;

async function ensurePhotoDir() {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

export async function loadPhotos(projectId: string): Promise<Photo[]> {
  const raw = await AsyncStorage.getItem(PHOTOS_KEY_PREFIX + projectId);
  if (!raw) return [];
  try {
    const photos = JSON.parse(raw) as Photo[];
    return photos.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

async function savePhotos(projectId: string, photos: Photo[]) {
  await AsyncStorage.setItem(PHOTOS_KEY_PREFIX + projectId, JSON.stringify(photos));
}

async function syncFolderCover(folderId?: string) {
  if (!folderId) return;
  await recomputeFolderStats(folderId);
}

export async function addPhoto(
  projectId: string,
  sourceUri: string,
  createdAt: number = Date.now()
): Promise<Photo> {
  await ensurePhotoDir();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const dest = `${PHOTO_DIR}${projectId}-${id}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });

  const photo: Photo = { id, uri: dest, createdAt, projectId };

  const photos = await loadPhotos(projectId);
  const updated = [photo, ...photos].sort((a, b) => b.createdAt - a.createdAt);
  await savePhotos(projectId, updated);

  const projects = await loadAllProjects();
  const target = projects.find((p) => p.id === projectId);
  const newest = updated[0];
  const hadCover = !!target?.coverPhotoUri;
  const next = projects.map((p) =>
    p.id === projectId
      ? {
          ...p,
          photoCount: updated.length,
          coverPhotoUri: hadCover ? p.coverPhotoUri : newest?.uri,
        }
      : p
  );
  await saveProjects(next);
  if (target?.folderId) await syncFolderCover(target.folderId);

  return photo;
}

export async function deletePhoto(projectId: string, photoId: string): Promise<void> {
  const photos = await loadPhotos(projectId);
  const target = photos.find((p) => p.id === photoId);
  if (target) {
    try {
      await FileSystem.deleteAsync(target.uri, { idempotent: true });
    } catch {}
  }
  const remaining = photos.filter((p) => p.id !== photoId);
  await savePhotos(projectId, remaining);

  const projects = await loadAllProjects();
  const targetProject = projects.find((p) => p.id === projectId);
  const wasCover = target && targetProject?.coverPhotoUri === target.uri;
  const nextCover = wasCover ? remaining[0]?.uri : targetProject?.coverPhotoUri;
  const nextProjects = projects.map((p) =>
    p.id === projectId
      ? {
          ...p,
          photoCount: remaining.length,
          coverPhotoUri: nextCover,
        }
      : p
  );
  await saveProjects(nextProjects);
  if (targetProject?.folderId) await syncFolderCover(targetProject.folderId);
}

export async function getLatestPhoto(projectId: string): Promise<Photo | null> {
  const photos = await loadPhotos(projectId);
  return photos[0] ?? null;
}

export async function deletePhotosForProjects(projectIds: string[]): Promise<void> {
  for (const id of projectIds) {
    const photos = await loadPhotos(id);
    for (const ph of photos) {
      try {
        await FileSystem.deleteAsync(ph.uri, { idempotent: true });
      } catch {}
    }
    await AsyncStorage.removeItem(PHOTOS_KEY_PREFIX + id);
  }
}
