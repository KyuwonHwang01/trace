import {
  collectDescendantFolderIds,
  deleteFolder,
  getFolder,
  loadFolders,
  saveFolders,
} from './folders';
import {
  loadAllProjects,
  saveProjects,
  recomputeFolderStats,
} from './projects';
import { deletePhotosForProjects } from './photos';

export async function deleteFolderCascade(folderId: string): Promise<void> {
  const target = await getFolder(folderId);
  if (!target) return;

  const ids = await collectDescendantFolderIds(folderId);

  const projects = await loadAllProjects();
  const removedProjectIds = projects
    .filter((p) => p.folderId && ids.includes(p.folderId))
    .map((p) => p.id);

  await saveProjects(
    projects.filter((p) => !p.folderId || !ids.includes(p.folderId))
  );

  await deletePhotosForProjects(removedProjectIds);

  const folders = await loadFolders();
  await saveFolders(folders.filter((f) => !ids.includes(f.id)));

  if (target.parentFolderId) await recomputeFolderStats(target.parentFolderId);
}
