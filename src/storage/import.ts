import * as ImagePicker from 'expo-image-picker';
import { addPhoto } from './photos';
import { Photo } from '../types';

function parseExifDate(exif: Record<string, any> | undefined): number | null {
  if (!exif) return null;
  const raw =
    exif.DateTimeOriginal ??
    exif.DateTime ??
    exif['{Exif}']?.DateTimeOriginal ??
    exif['{TIFF}']?.DateTime;
  if (typeof raw !== 'string') return null;
  // EXIF format: "YYYY:MM:DD HH:MM:SS"
  const m = raw.match(
    /^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
  );
  if (!m) {
    const t = Date.parse(raw);
    return Number.isFinite(t) ? t : null;
  }
  const [, y, mo, d, h, mi, s] = m;
  const t = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s)
  ).getTime();
  return Number.isFinite(t) ? t : null;
}

export async function importPhotosFromGallery(
  projectId: string
): Promise<{ added: number; cancelled: boolean }> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 0,
    exif: true,
    quality: 1,
  });

  if (result.canceled) return { added: 0, cancelled: true };

  let added = 0;
  for (const asset of result.assets ?? []) {
    const exifDate = parseExifDate(asset.exif as Record<string, any> | undefined);
    const createdAt = exifDate ?? Date.now();
    await addPhoto(projectId, asset.uri, createdAt);
    added += 1;
  }
  return { added, cancelled: false };
}

export type ImportedPhoto = Photo;
