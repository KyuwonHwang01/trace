import AsyncStorage from '@react-native-async-storage/async-storage';
import { addFolder, loadFolders, saveFolders } from './folders';
import { loadAllProjects, saveProjects } from './projects';

const MIGRATION_KEY = '@trace/migrationVersion';
const CURRENT_VERSION = 1;

export async function runMigrations(): Promise<void> {
  const stored = await AsyncStorage.getItem(MIGRATION_KEY);
  const version = stored ? parseInt(stored, 10) : 0;
  if (version >= CURRENT_VERSION) return;

  if (version < 1) {
    await migrateProjectsIntoDefaultFolder();
  }

  await AsyncStorage.setItem(MIGRATION_KEY, String(CURRENT_VERSION));
}

async function migrateProjectsIntoDefaultFolder() {
  const projects = await loadAllProjects();
  const orphans = projects.filter((p) => !p.folderId);
  if (orphans.length === 0) return;

  const folders = await loadFolders();
  let defaultFolder = folders.find((f) => f.name === 'My Projects');
  if (!defaultFolder) {
    defaultFolder = await addFolder('My Projects');
  }
  const folderId = defaultFolder.id;

  const updated = projects.map((p) => (p.folderId ? p : { ...p, folderId }));
  await saveProjects(updated);

  const refreshedFolders = await loadFolders();
  const inFolder = updated.filter((p) => p.folderId === folderId);
  const cover = inFolder.find((p) => p.coverPhotoUri)?.coverPhotoUri;
  await saveFolders(
    refreshedFolders.map((f) =>
      f.id === folderId
        ? { ...f, projectCount: inFolder.length, coverPhotoUri: cover }
        : f
    )
  );
}
