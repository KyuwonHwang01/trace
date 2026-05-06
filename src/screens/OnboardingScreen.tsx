import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fonts, radius, spacing, text } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import { setOnboarded } from '../storage/onboarding';
import Chameleon from '../components/Chameleon';
import { useTranslation } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const handleStart = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setOnboarded();
    navigation.replace('Home');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.illustration}>
          <Chameleon size={220} />
        </View>

        <View style={styles.heroBlock}>
          <Text style={styles.brand}>{t('onboarding.brand')}</Text>
          <Text style={styles.tagline}>— {t('onboarding.tagline')} —</Text>
          <Text style={styles.body}>{t('onboarding.body')}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={handleStart}
        >
          <Text style={styles.ctaText}>{t('onboarding.cta')}</Text>
          <Feather name="arrow-right" size={18} color={colors.white} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  illustration: {
    marginBottom: spacing.xl,
  },
  heroBlock: {
    alignItems: 'center',
  },
  brand: {
    fontFamily: fonts.serifBold,
    fontSize: 64,
    color: colors.text,
    letterSpacing: -1.5,
    lineHeight: 68,
  },
  tagline: {
    fontFamily: fonts.serifItalic,
    fontSize: 15,
    color: colors.accent,
    marginTop: spacing.sm,
    letterSpacing: 1,
  },
  body: {
    ...text.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radius.md,
    gap: 10,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaPressed: {
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    ...text.button,
    color: colors.white,
    fontSize: 16,
  },
});
