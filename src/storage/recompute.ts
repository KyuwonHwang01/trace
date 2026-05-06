import { loadFolders, saveFolders } from './folders';
import { loadAllProjects } from './projects';

export async function recomputeFolderStats(folderId: string): Promise<void> {
  const folders = await loadFolders();
  const all = await loadAllProjects();
  const directProjects = all.filter((p) => p.folderId === folderId);
  const directSubfolders = folders.filter((f) => f.parentFolderId === folderId);
  const cover =
    directProjects.find((p) => p.coverPhotoUri)?.coverPhotoUri ??
    directSubfolders.find((f) => f.coverPhotoUri)?.coverPhotoUri;

  const next = folders.map((f) =>
    f.id === folderId
      ? {
          ...f,
          projectCount: directProjects.length + directSubfolders.length,
          coverPhotoUri: cover,
        }
      : f
  );
  await saveFolders(next);

  const parentId = folders.find((f) => f.id === folderId)?.parentFolderId;
  if (parentId) await recomputeFolderStats(parentId);
}
