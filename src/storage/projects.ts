import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project } from '../types';
import { recomputeFolderStats as _recompute } from './recompute';

export { recomputeFolderStats } from './recompute';

const PROJECTS_KEY = '@timelapse/projects';

export async function loadAllProjects(): Promise<Project[]> {
  const raw = await AsyncStorage.getItem(PROJECTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
}

export async function loadProjects(folderId?: string): Promise<Project[]> {
  const all = await loadAllProjects();
  if (folderId === undefined) return all;
  return all.filter((p) => p.folderId === folderId);
}

export async function loadStandaloneProjects(): Promise<Project[]> {
  const all = await loadAllProjects();
  return all.filter((p) => !p.folderId);
}

export async function saveProjects(projects: Project[]): Promise<void> {
  await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}


export async function addProject(name: string, folderId?: string): Promise<Project> {
  const projects = await loadAllProjects();
  const project: Project = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    folderId,
    name: name.trim(),
    createdAt: Date.now(),
    photoCount: 0,
  };
  await saveProjects([project, ...projects]);
  if (folderId) await _recompute(folderId);
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await loadAllProjects();
  const target = projects.find((p) => p.id === id);
  await saveProjects(projects.filter((p) => p.id !== id));
  if (target?.folderId) await _recompute(target.folderId);
}

export async function deleteProjectsInFolder(folderId: string): Promise<string[]> {
  const projects = await loadAllProjects();
  const removed = projects.filter((p) => p.folderId === folderId).map((p) => p.id);
  await saveProjects(projects.filter((p) => p.folderId !== folderId));
  return removed;
}

export async function setProjectCover(projectId: string, coverUri: string): Promise<void> {
  const projects = await loadAllProjects();
  const target = projects.find((p) => p.id === projectId);
  await saveProjects(
    projects.map((p) => (p.id === projectId ? { ...p, coverPhotoUri: coverUri } : p))
  );
  if (target?.folderId) await _recompute(target.folderId);
}
