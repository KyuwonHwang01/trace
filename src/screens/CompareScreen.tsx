import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing, text } from '../theme/colors';
import { loadPhotos } from '../storage/photos';
import { Photo } from '../types';
import type { RootStackParamList } from '../navigation/types';
import CompareSlider from '../components/CompareSlider';
import CompareStack from '../components/CompareStack';
import PhotoPickerSheet from '../components/PhotoPickerSheet';
import { useTranslation } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Compare'>;
type Slot = 'before' | 'after';
type Mode = 'stack' | 'slider';

export default function CompareScreen({ route }: Props) {
  const { t } = useTranslation();
  const { projectId } = route.params;
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [pickerSlot, setPickerSlot] = useState<Slot | null>(null);
  const [mode, setMode] = useState<Mode>('stack');

  useEffect(() => {
    loadPhotos(projectId).then((ps) => {
      setPhotos(ps);
      if (ps.length >= 2) {
        setBeforeId(ps[ps.length - 1].id);
        setAfterId(ps[0].id);
      }
    });
  }, [projectId]);

  const beforePhoto = photos.find((p) => p.id === beforeId) ?? null;
  const afterPhoto = photos.find((p) => p.id === afterId) ?? null;

  const handlePick = useCallback(
    (photo: Photo) => {
      if (pickerSlot === 'before') setBeforeId(photo.id);
      else if (pickerSlot === 'after') setAfterId(photo.id);
      setPickerSlot(null);
    },
    [pickerSlot]
  );

  return (
    <View style={styles.container}>
      <View style={styles.sliderArea}>
        {beforePhoto && afterPhoto ? (
          mode === 'stack' ? (
            <CompareStack
              beforeUri={beforePhoto.uri}
              afterUri={afterPhoto.uri}
              beforeLabel={formatDate(beforePhoto.createdAt)}
              afterLabel={formatDate(afterPhoto.createdAt)}
              beforeBadge={t('compare.beforeBadge')}
              afterBadge={t('compare.afterBadge')}
            />
          ) : (
            <CompareSlider
              beforeUri={beforePhoto.uri}
              afterUri={afterPhoto.uri}
              beforeLabel={formatDate(beforePhoto.createdAt)}
              afterLabel={formatDate(afterPhoto.createdAt)}
            />
          )
        ) : (
          <View style={styles.emptySlider}>
            <Feather name="layers" size={28} color={colors.textSubtle} />
            <Text style={styles.emptyText}>{t('compare.empty')}</Text>
          </View>
        )}

        {beforePhoto && afterPhoto && (
          <View style={styles.modeToggle}>
            <Pressable
              style={[styles.modeBtn, mode === 'stack' && styles.modeBtnActive]}
              onPress={() => setMode('stack')}
            >
              <Feather
                name="square"
                size={14}
                color={mode === 'stack' ? colors.accent : colors.white}
              />
              <Text
                style={[styles.modeText, mode === 'stack' && styles.modeTextActive]}
              >
                {t('compare.mode.stack')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeBtn, mode === 'slider' && styles.modeBtnActive]}
              onPress={() => setMode('slider')}
            >
              <Feather
                name="sliders"
                size={14}
                color={mode === 'slider' ? colors.accent : colors.white}
              />
              <Text
                style={[styles.modeText, mode === 'slider' && styles.modeTextActive]}
              >
                {t('compare.mode.slider')}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Text style={styles.bottomTitle}>{t('compare.eyebrow')}</Text>
        <View style={styles.slotRow}>
          <SlotPicker
            label={t('compare.slot.before')}
            placeholder={t('compare.slot.choose')}
            photo={beforePhoto}
            onPress={() => setPickerSlot('before')}
          />
          <View style={styles.slotDivider} />
          <SlotPicker
            label={t('compare.slot.after')}
            placeholder={t('compare.slot.choose')}
            photo={afterPhoto}
            onPress={() => setPickerSlot('after')}
          />
        </View>
      </SafeAreaView>

      <PhotoPickerSheet
        visible={pickerSlot !== null}
        title={
          pickerSlot === 'before'
            ? t('compare.sheet.beforeTitle')
            : t('compare.sheet.afterTitle')
        }
        photos={photos}
        selectedId={pickerSlot === 'before' ? beforeId : afterId}
        onSelect={handlePick}
        onClose={() => setPickerSlot(null)}
      />
    </View>
  );
}

function SlotPicker({
  label,
  placeholder,
  photo,
  onPress,
}: {
  label: string;
  placeholder: string;
  photo: Photo | null;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.slot} onPress={onPress}>
      <View style={styles.slotThumb}>
        {photo ? (
          <Image
            source={{ uri: photo.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : (
          <Feather name="plus" size={20} color={colors.textSubtle} />
        )}
      </View>
      <View style={styles.slotMeta}>
        <Text style={styles.slotLabel}>{label}</Text>
        <Text style={styles.slotDate}>
          {photo ? formatDate(photo.createdAt) : placeholder}
        </Text>
      </View>
    </Pressable>
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
  sliderArea: {
    flex: 1,
    backgroundColor: colors.black,
  },
  modeToggle: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radius.full,
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  modeText: {
    ...text.metaMedium,
    color: colors.white,
    fontSize: 12,
  },
  modeTextActive: {
    color: colors.accent,
  },
  emptySlider: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  emptyText: {
    ...text.body,
    color: colors.textMuted,
  },
  bottomBar: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  bottomTitle: {
    ...text.caption,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  slot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  slotThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  slotMeta: {
    flex: 1,
  },
  slotLabel: {
    ...text.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  slotDate: {
    ...text.bodyMedium,
    color: colors.text,
  },
  slotDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
});
