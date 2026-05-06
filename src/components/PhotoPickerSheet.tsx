import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, radius, spacing, text } from '../theme/colors';
import { useTranslation } from '../i18n';
import { Photo } from '../types';

interface Props {
  visible: boolean;
  title: string;
  photos: Photo[];
  selectedId?: string | null;
  onSelect: (photo: Photo) => void;
  onClose: () => void;
  extraOption?: { label: string; onPress: () => void; active?: boolean };
}

export default function PhotoPickerSheet({
  visible,
  title,
  photos,
  selectedId,
  onSelect,
  onClose,
  extraOption,
}: Props) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>

          {extraOption && (
            <Pressable
              style={[
                styles.extraOption,
                extraOption.active && styles.extraOptionActive,
              ]}
              onPress={extraOption.onPress}
            >
              <Text
                style={[
                  styles.extraOptionText,
                  extraOption.active && styles.extraOptionTextActive,
                ]}
              >
                {extraOption.label}
              </Text>
            </Pressable>
          )}

          {photos.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('photoPicker.empty')}</Text>
            </View>
          ) : (
            <FlatList
              data={photos}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={styles.grid}
              columnWrapperStyle={{ gap: 4 }}
              renderItem={({ item }) => {
                const selected = item.id === selectedId;
                return (
                  <Pressable
                    style={[styles.tile, selected && styles.tileSelected]}
                    onPress={() => onSelect(item)}
                  >
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.tileImage}
                      contentFit="cover"
                    />
                    <View style={styles.tileBadge}>
                      <Text style={styles.tileBadgeText}>{formatDate(item.createdAt)}</Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    maxHeight: '75%',
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.sm,
  },
  title: {
    ...text.title,
    color: colors.text,
    marginBottom: spacing.md,
  },
  grid: {
    paddingBottom: spacing.lg,
    gap: 4,
  },
  tile: {
    flex: 1 / 3,
    aspectRatio: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
  },
  tileSelected: {
    borderWidth: 3,
    borderColor: colors.accent,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tileBadgeText: {
    ...text.caption,
    color: colors.white,
    fontSize: 10,
    textAlign: 'center',
  },
  empty: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...text.body,
    color: colors.textMuted,
  },
  extraOption: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  extraOptionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  extraOptionText: {
    ...text.button,
    color: colors.text,
  },
  extraOptionTextActive: {
    color: colors.white,
  },
});
