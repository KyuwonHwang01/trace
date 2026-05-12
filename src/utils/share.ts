import { Alert, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

export async function sharePhoto(uri: string, dialogTitle?: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) return;
  await Sharing.shareAsync(uri, {
    mimeType: 'image/jpeg',
    UTI: 'public.jpeg',
    dialogTitle: dialogTitle ?? 'Share Trace photo',
  });
}

export async function savePhotosToAlbum(
  uris: string[],
  albumName: string
): Promise<{ saved: number }> {
  // writeOnly = true requests "Add Only" access (NSPhotoLibraryAddUsageDescription).
  // The iOS prompt becomes a clean Allow/Don't Allow (no Limited Access option),
  // which matches what Trace actually does: it only writes app-created exports
  // to the photo library and never reads existing user photos.
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) {
    throw new Error('PERMISSION_DENIED');
  }

  if (uris.length === 0) return { saved: 0 };

  const assets = await Promise.all(
    uris.map((uri) => MediaLibrary.createAssetAsync(uri))
  );

  if (Platform.OS === 'ios') {
    const album = await MediaLibrary.getAlbumAsync(albumName);
    if (album == null) {
      await MediaLibrary.createAlbumAsync(albumName, assets[0], false);
      if (assets.length > 1) {
        await MediaLibrary.addAssetsToAlbumAsync(assets.slice(1), album ?? albumName, false);
      }
    } else {
      await MediaLibrary.addAssetsToAlbumAsync(assets, album, false);
    }
  } else {
    const album = await MediaLibrary.getAlbumAsync(albumName);
    if (album == null) {
      await MediaLibrary.createAlbumAsync(albumName, assets[0], false);
      if (assets.length > 1) {
        const newAlbum = await MediaLibrary.getAlbumAsync(albumName);
        if (newAlbum) {
          await MediaLibrary.addAssetsToAlbumAsync(assets.slice(1), newAlbum, false);
        }
      }
    } else {
      await MediaLibrary.addAssetsToAlbumAsync(assets, album, false);
    }
  }

  return { saved: assets.length };
}

export async function savePhotoToCameraRoll(uri: string): Promise<void> {
  // See savePhotosToAlbum: writeOnly avoids the Limited Access prompt for an
  // app that only writes to the photo library.
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) throw new Error('PERMISSION_DENIED');
  await MediaLibrary.createAssetAsync(uri);
}
