import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing, text } from '../theme/colors';
import { loadPhotos } from '../storage/photos';
import { loadProjects } from '../storage/projects';
import { Photo, Project } from '../types';
import type { RootStackParamList } from '../navigation/types';
import { sharePhoto, savePhotosToAlbum, savePhotoToCameraRoll } from '../utils/share';
import { useTranslation } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Export'>;
type Mode = 'slideshow' | 'collage';

const SPEEDS = [0.5, 1, 1.5, 2];
const SCREEN_WIDTH = Dimensions.get('window').width;
const PREVIEW_PAD = spacing.md;
// Cap the preview at an iPhone-like max so the slideshow square doesn't
// dominate the iPad screen and push the Save button off-screen.
const MAX_CONTENT_WIDTH = 480;
const PREVIEW_WIDTH = Math.min(SCREEN_WIDTH - PREVIEW_PAD * 2, MAX_CONTENT_WIDTH);

export default function ExportScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { projectId } = route.params;
  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [mode, setMode] = useState<Mode>('slideshow');
  const [speed, setSpeed] = useState(1);
  const [slideIdx, setSlideIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const collageRef = useRef<View>(null);

  useEffect(() => {
    Promise.all([loadProjects(), loadPhotos(projectId)]).then(([projects, ps]) => {
      setProject(projects.find((p) => p.id === projectId) ?? null);
      setPhotos([...ps].reverse());
    });
  }, [projectId]);

  useEffect(() => {
    if (mode !== 'slideshow' || photos.length === 0) return;
    const id = setInterval(() => {
      setSlideIdx((i) => (i + 1) % photos.length);
    }, speed * 1000);
    return () => clearInterval(id);
  }, [mode, speed, photos.length]);

  const albumName = useMemo(
    () => `Trace${project?.name ? ` - ${project.name}` : ''}`,
    [project?.name]
  );

  const handleSaveSlideshow = useCallback(async () => {
    if (busy || photos.length === 0) return;
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { saved } = await savePhotosToAlbum(
        photos.map((p) => p.uri),
        albumName
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('export.savedAlert.title'),
        t('export.savedAlert.bodySlideshow', { count: saved, album: albumName })
      );
    } catch (e: any) {
      if (e?.message === 'PERMISSION_DENIED') {
        Alert.alert(t('export.permission.title'), t('export.permission.body'));
      } else {
        Alert.alert(t('export.fail.title'), t('export.fail.body'));
      }
    } finally {
      setBusy(false);
    }
  }, [busy, photos, albumName, t]);

  const handleExportCollage = useCallback(
    async (action: 'save' | 'share') => {
      if (busy || photos.length === 0 || !collageRef.current) return;
      setBusy(true);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const uri = await captureRef(collageRef, {
          format: 'jpg',
          quality: 0.92,
          result: 'tmpfile',
        });
        if (action === 'save') {
          await savePhotoToCameraRoll(uri);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(t('export.savedAlert.title'), t('export.savedAlert.bodyCollage'));
        } else {
          await sharePhoto(uri, t('export.shareDialogTitle'));
        }
      } catch (e: any) {
        if (e?.message === 'PERMISSION_DENIED') {
          Alert.alert(t('export.permission.title'), t('export.permission.body'));
        } else {
          Alert.alert(t('export.fail.title'), t('export.fail.body'));
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, photos, t]
  );

  if (photos.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title={t('export.title')} onBack={() => navigation.goBack()} />
        <View style={styles.empty}>
          <Feather name="image" size={28} color={colors.textSubtle} />
          <Text style={styles.emptyText}>{t('export.empty')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={t('export.title')} onBack={() => navigation.goBack()} />

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, mode === 'slideshow' && styles.tabActive]}
          onPress={() => setMode('slideshow')}
        >
          <Feather
            name="play-circle"
            size={15}
            color={mode === 'slideshow' ? colors.text : colors.textMuted}
          />
          <Text style={[styles.tabText, mode === 'slideshow' && styles.tabTextActive]}>
            {t('export.tab.slideshow')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === 'collage' && styles.tabActive]}
          onPress={() => setMode('collage')}
        >
          <Feather
            name="layout"
            size={15}
            color={mode === 'collage' ? colors.text : colors.textMuted}
          />
          <Text style={[styles.tabText, mode === 'collage' && styles.tabTextActive]}>
            {t('export.tab.collage')}
          </Text>
        </Pressable>
      </View>

      {mode === 'slideshow' ? (
        <View style={styles.slideContainer}>
          <View style={styles.slideContent}>
          <View style={styles.slidePreview}>
            {photos.map((p, i) => (
              <Image
                key={p.id}
                source={{ uri: p.uri }}
                style={[
                  StyleSheet.absoluteFill,
                  { opacity: i === slideIdx ? 1 : 0 },
                ]}
                contentFit="cover"
                transition={300}
              />
            ))}
            <View style={styles.slideBadge}>
              <Text style={styles.slideBadgeText}>
                {slideIdx + 1} / {photos.length}
              </Text>
            </View>
            <View style={styles.slideDateBadge}>
              <Text style={styles.slideDateText}>
                {formatDate(photos[slideIdx].createdAt)}
              </Text>
            </View>
          </View>

          <View style={styles.controlBlock}>
            <Text style={styles.controlLabel}>{t('export.speedLabel')}</Text>
            <View style={styles.speedRow}>
              {SPEEDS.map((s) => (
                <Pressable
                  key={s}
                  style={[styles.speedBtn, s === speed && styles.speedBtnActive]}
                  onPress={() => setSpeed(s)}
                >
                  <Text
                    style={[styles.speedText, s === speed && styles.speedTextActive]}
                  >
                    {t('export.speed.value', { n: s })}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.actionBar}>
            <Pressable
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={handleSaveSlideshow}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Feather name="download" size={16} color={colors.white} />
                  <Text style={styles.actionBtnPrimaryText}>
                    {t('export.slideshow.save')}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <Text style={styles.hint}>
            {t('export.slideshow.hint', { album: albumName })}
          </Text>
          </View>
        </View>
      ) : (
        <View style={styles.collageContainer}>
          <ScrollView
            style={styles.collageScroll}
            contentContainerStyle={{ paddingVertical: spacing.md }}
          >
            <View ref={collageRef} collapsable={false} style={styles.collageView}>
              <View style={styles.collageHeader}>
                <Text style={styles.collageEyebrow}>{t('export.collage.eyebrow')}</Text>
                <Text style={styles.collageTitle} numberOfLines={1}>
                  {project?.name}
                </Text>
              </View>
              {photos.map((p, i) => (
                <View key={p.id} style={styles.collageItem}>
                  <Image
                    source={{ uri: p.uri }}
                    style={styles.collageImage}
                    contentFit="cover"
                  />
                  <View style={styles.collageMeta}>
                    <Text style={styles.collageDayLabel}>
                      {t('export.collage.day', { n: i + 1 })}
                    </Text>
                    <Text style={styles.collageDate}>{formatDate(p.createdAt)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.actionBar}>
            <Pressable
              style={[styles.actionBtn, styles.actionBtnGhost]}
              onPress={() => handleExportCollage('save')}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <>
                  <Feather name="download" size={16} color={colors.text} />
                  <Text style={styles.actionBtnGhostText}>{t('export.action.save')}</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => handleExportCollage('share')}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Feather name="share" size={16} color={colors.white} />
                  <Text style={styles.actionBtnPrimaryText}>
                    {t('export.action.share')}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.headerBack}>
        <Feather name="chevron-left" size={24} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 24 }} />
    </View>
  );
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerBack: {
    width: 24,
  },
  headerTitle: {
    ...text.heading,
    color: colors.text,
    fontFamily: 'Lora_600SemiBold',
    fontSize: 17,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.surfaceElevated,
  },
  tabText: {
    ...text.button,
    color: colors.textMuted,
    fontSize: 14,
  },
  tabTextActive: {
    color: colors.text,
  },

  slideContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  slideContent: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  slidePreview: {
    width: PREVIEW_WIDTH,
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignSelf: 'center',
  },
  slideBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  slideBadgeText: {
    ...text.metaMedium,
    color: colors.white,
    fontSize: 11,
  },
  slideDateBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  slideDateText: {
    ...text.metaMedium,
    color: colors.white,
    fontSize: 12,
  },
  controlBlock: {
    paddingTop: spacing.lg,
  },
  controlLabel: {
    ...text.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  speedRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  speedBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  speedBtnActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  speedText: {
    ...text.bodyMedium,
    color: colors.textMuted,
  },
  speedTextActive: {
    color: colors.accent,
  },
  hint: {
    ...text.meta,
    color: colors.textSubtle,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },

  collageContainer: {
    flex: 1,
  },
  collageScroll: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  collageView: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  collageHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  collageEyebrow: {
    ...text.caption,
    color: colors.accent,
    marginBottom: 4,
  },
  collageTitle: {
    ...text.title,
    color: colors.text,
  },
  collageItem: {
    backgroundColor: colors.surface,
  },
  collageImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceElevated,
  },
  collageMeta: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  collageDayLabel: {
    ...text.caption,
    color: colors.accent,
  },
  collageDate: {
    ...text.metaMedium,
    color: colors.text,
  },

  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH + spacing.md * 2,
    alignSelf: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
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

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...text.body,
    color: colors.textMuted,
  },
});
