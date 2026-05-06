import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  Alert,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing, text } from '../theme/colors';
import { loadProjects, setProjectCover } from '../storage/projects';
import { deletePhoto, loadPhotos } from '../storage/photos';
import { importPhotosFromGallery } from '../storage/import';
import { Photo, Project } from '../types';
import type { RootStackParamList } from '../navigation/types';
import { useTranslation } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectDetail'>;

const NUM_COLUMNS = 3;
const GRID_GAP = 4;
const SCREEN_WIDTH = Dimensions.get('window').width;
const TILE_SIZE =
  (SCREEN_WIDTH - spacing.md * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

export default function ProjectDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { projectId } = route.params;
  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [projects, ps] = await Promise.all([
          loadProjects(),
          loadPhotos(projectId),
        ]);
        if (cancelled) return;
        setProject(projects.find((p) => p.id === projectId) ?? null);
        setPhotos(ps);
      })();
      return () => {
        cancelled = true;
      };
    }, [projectId])
  );

  const handleImport = useCallback(async () => {
    try {
      const { added } = await importPhotosFromGallery(projectId);
      if (added > 0) setPhotos(await loadPhotos(projectId));
    } catch {
      Alert.alert(t('project.importFail.title'), t('project.importFail.body'));
    }
  }, [projectId, t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleImport} style={styles.headerBtn} hitSlop={8}>
            <Feather name="image" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Export', { projectId })}
            style={styles.headerBtn}
            hitSlop={8}
          >
            <Feather name="share" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, handleImport, projectId]);

  const refreshProject = useCallback(async () => {
    const projects = await loadProjects();
    setProject(projects.find((p) => p.id === projectId) ?? null);
  }, [projectId]);

  const handlePhotoLongPress = (photo: Photo) => {
    const isCover = project?.coverPhotoUri === photo.uri;
    Alert.alert(t('photoAction.title'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      ...(isCover
        ? []
        : [
            {
              text: t('photoAction.setCover'),
              onPress: async () => {
                await setProjectCover(projectId, photo.uri);
                await refreshProject();
              },
            },
          ]),
      {
        text: t('common.delete'),
        style: 'destructive' as const,
        onPress: async () => {
          await deletePhoto(projectId, photo.id);
          setPhotos(await loadPhotos(projectId));
          await refreshProject();
        },
      },
    ]);
  };

  const stats = useMemo(() => {
    if (photos.length === 0) return null;
    const oldest = photos[photos.length - 1].createdAt;
    const newest = photos[0].createdAt;
    const span = Math.max(0, newest - oldest);
    const days = Math.floor(span / (24 * 60 * 60 * 1000));
    return { count: photos.length, days };
  }, [photos]);

  const groups = groupByDay(photos);

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.day}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.heroHeader}>
            <Text style={styles.heroEyebrow}>PROJECT</Text>
            <Text style={styles.heroTitle}>{project?.name ?? ''}</Text>
            {stats && (
              <View style={styles.statRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{stats.count}</Text>
                  <Text style={styles.statLabel}>{t('project.stat.photos')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{stats.days}</Text>
                  <Text style={styles.statLabel}>{t('project.stat.days')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {formatShortDate(photos[photos.length - 1].createdAt)}
                  </Text>
                  <Text style={styles.statLabel}>{t('project.stat.start')}</Text>
                </View>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{item.day}</Text>
            <View style={styles.grid}>
              {item.photos.map((photo, idx) => {
                const isCover = project?.coverPhotoUri === photo.uri;
                return (
                  <Pressable
                    key={photo.id}
                    style={[
                      styles.tile,
                      { marginRight: (idx + 1) % NUM_COLUMNS === 0 ? 0 : GRID_GAP },
                    ]}
                    onLongPress={() => handlePhotoLongPress(photo)}
                  >
                    <Image
                      source={{ uri: photo.uri }}
                      style={styles.tileImage}
                      contentFit="cover"
                      transition={200}
                    />
                    <View style={styles.tileBadge}>
                      <Text style={styles.tileBadgeText}>{formatTime(photo.createdAt)}</Text>
                    </View>
                    {isCover && (
                      <View style={styles.coverBadge}>
                        <Feather name="star" size={10} color={colors.white} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="camera" size={28} color={colors.textSubtle} />
            </View>
            <Text style={styles.emptyTitle}>{t('project.empty.title')}</Text>
            <Text style={styles.emptyBody}>{t('project.empty.body')}</Text>
          </View>
        }
      />

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnGhost]}
          onPress={() => navigation.navigate('Compare', { projectId })}
          disabled={photos.length < 2}
          activeOpacity={0.7}
        >
          <Feather
            name="layers"
            size={16}
            color={photos.length < 2 ? colors.textSubtle : colors.text}
          />
          <Text
            style={[
              styles.actionBtnGhostText,
              photos.length < 2 && { color: colors.textSubtle },
            ]}
          >
            {t('project.action.compare')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={() => navigation.navigate('Camera', { projectId })}
          activeOpacity={0.85}
        >
          <Feather name="camera" size={16} color={colors.white} />
          <Text style={styles.actionBtnPrimaryText}>{t('project.action.shoot')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function groupByDay(photos: Photo[]): { day: string; photos: Photo[] }[] {
  const map = new Map<string, Photo[]>();
  for (const p of photos) {
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
      d.getDate()
    ).padStart(2, '0')}`;
    const arr = map.get(key) ?? [];
    arr.push(p);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([day, photos]) => ({ day, photos }));
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatShortDate(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  headerBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: 140,
  },
  heroHeader: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  heroEyebrow: {
    ...text.caption,
    color: colors.accent,
    marginBottom: 6,
  },
  heroTitle: {
    ...text.display,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 2,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...text.title,
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    ...text.caption,
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...text.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    marginBottom: GRID_GAP,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  tileBadgeText: {
    ...text.caption,
    color: colors.white,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...text.title,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyBody: {
    ...text.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 22,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg + spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnPrimary: {
    backgroundColor: colors.accent,
  },
  actionBtnPrimaryText: {
    ...text.button,
    color: colors.white,
  },
  actionBtnGhost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnGhostText: {
    ...text.button,
    color: colors.text,
  },
});
