import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing, text } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import { useTranslation } from '../i18n';
import { LANGS, Lang } from '../i18n/strings';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { lang, setLang, t } = useTranslation();

  const handlePick = (next: Lang) => {
    Haptics.selectionAsync();
    setLang(next);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.headerBack}>
          <Feather name="chevron-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>{t('settings.language.section')}</Text>
        <View style={styles.card}>
          {LANGS.map((l, idx) => {
            const selected = l.code === lang;
            return (
              <Pressable
                key={l.code}
                onPress={() => handlePick(l.code)}
                style={[styles.row, idx > 0 && styles.rowDivider]}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>{l.nativeLabel}</Text>
                  {l.nativeLabel !== l.label && (
                    <Text style={styles.rowSubtitle}>{l.label}</Text>
                  )}
                </View>
                {selected && <Feather name="check" size={18} color={colors.accent} />}
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.description}>{t('settings.language.description')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
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
  headerBack: { width: 24 },
  headerTitle: {
    ...text.heading,
    color: colors.text,
    fontFamily: 'Lora_600SemiBold',
    fontSize: 17,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    ...text.caption,
    color: colors.accent,
    marginLeft: spacing.xs,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  rowLeft: {
    flex: 1,
  },
  rowTitle: {
    ...text.bodyMedium,
    color: colors.text,
  },
  rowSubtitle: {
    ...text.meta,
    color: colors.textMuted,
    marginTop: 2,
  },
  description: {
    ...text.meta,
    color: colors.textSubtle,
    marginTop: spacing.sm + 2,
    marginHorizontal: spacing.xs,
    lineHeight: 18,
  },
});
