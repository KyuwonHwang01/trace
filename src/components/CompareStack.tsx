import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius, spacing, text } from '../theme/colors';
import ZoomablePane from './ZoomablePane';

interface Props {
  beforeUri: string;
  afterUri: string;
  beforeLabel?: string;
  afterLabel?: string;
  beforeBadge?: string;
  afterBadge?: string;
}

export default function CompareStack({
  beforeUri,
  afterUri,
  beforeLabel,
  afterLabel,
  beforeBadge = 'BEFORE',
  afterBadge = 'AFTER',
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.pane}>
        <ZoomablePane>
          <Image
            source={{ uri: beforeUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        </ZoomablePane>
        {beforeLabel && (
          <View style={styles.labelWrap} pointerEvents="none">
            <Text style={styles.eyebrow}>{beforeBadge}</Text>
            <Text style={styles.dateText}>{beforeLabel}</Text>
          </View>
        )}
      </View>
      <View style={styles.divider} />
      <View style={styles.pane}>
        <ZoomablePane>
          <Image
            source={{ uri: afterUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        </ZoomablePane>
        {afterLabel && (
          <View style={styles.labelWrap} pointerEvents="none">
            <Text style={styles.eyebrow}>{afterBadge}</Text>
            <Text style={styles.dateText}>{afterLabel}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  pane: {
    flex: 1,
    overflow: 'hidden',
  },
  divider: {
    height: 2,
    backgroundColor: colors.background,
  },
  labelWrap: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  eyebrow: {
    ...text.caption,
    color: colors.accent,
    fontSize: 9,
    marginBottom: 1,
  },
  dateText: {
    ...text.metaMedium,
    color: colors.white,
    fontSize: 12,
  },
});
