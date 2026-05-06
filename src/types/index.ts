export interface Photo {
  id: string;
  uri: string;
  createdAt: number;
  projectId: string;
}

export interface Project {
  id: string;
  folderId?: string;
  name: string;
  createdAt: number;
  coverPhotoUri?: string;
  photoCount: number;
}

export interface Folder {
  id: string;
  parentFolderId?: string;
  name: string;
  createdAt: number;
  coverPhotoUri?: string;
  projectCount: number;
}
