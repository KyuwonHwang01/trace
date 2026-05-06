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
  const perm = await MediaLibrary.requestPermissionsAsync();
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
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) throw new Error('PERMISSION_DENIED');
  await MediaLibrary.createAssetAsync(uri);
}
