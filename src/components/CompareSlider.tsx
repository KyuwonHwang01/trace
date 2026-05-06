import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
  Text,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, radius, text } from '../theme/colors';

interface Props {
  beforeUri: string;
  afterUri: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export default function CompareSlider({
  beforeUri,
  afterUri,
  beforeLabel,
  afterLabel,
}: Props) {
  const [width, setWidth] = useState(0);
  const [splitX, setSplitX] = useState(0);
  const splitRef = useRef(0);
  const widthRef = useRef(0);
  const grabOffsetRef = useRef(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
    if (splitRef.current === 0) {
      splitRef.current = w / 2;
      setSplitX(w / 2);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        const w = widthRef.current;
        const current = splitRef.current;
        // If touch is near the current divider, grab it; else jump
        if (Math.abs(x - current) < 60) {
          grabOffsetRef.current = current - x;
        } else {
          grabOffsetRef.current = 0;
          splitRef.current = clamp(x, 0, w);
          setSplitX(splitRef.current);
        }
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        const w = widthRef.current;
        splitRef.current = clamp(x + grabOffsetRef.current, 0, w);
        setSplitX(splitRef.current);
      },
    })
  ).current;

  return (
    <View style={styles.container} onLayout={onLayout} {...panResponder.panHandlers}>
      <Image
        source={{ uri: afterUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <View
        style={[styles.beforeWrap, { width: splitX }]}
        pointerEvents="none"
      >
        <Image
          source={{ uri: beforeUri }}
          style={[StyleSheet.absoluteFill, { width }]}
          contentFit="cover"
        />
      </View>

      {beforeLabel && (
        <View style={[styles.label, styles.labelLeft]} pointerEvents="none">
          <Text style={styles.labelText}>{beforeLabel}</Text>
        </View>
      )}
      {afterLabel && (
        <View style={[styles.label, styles.labelRight]} pointerEvents="none">
          <Text style={styles.labelText}>{afterLabel}</Text>
        </View>
      )}

      {width > 0 && (
        <View
          style={[styles.divider, { left: splitX - 1 }]}
          pointerEvents="none"
        >
          <View style={styles.handle}>
            <Feather name="chevron-left" size={18} color={colors.accent} />
            <Feather name="chevron-right" size={18} color={colors.accent} />
          </View>
        </View>
      )}
    </View>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    overflow: 'hidden',
  },
  beforeWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  divider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    position: 'absolute',
    top: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  labelLeft: { left: 16 },
  labelRight: { right: 16 },
  labelText: {
    ...text.caption,
    color: colors.white,
    fontSize: 11,
  },
});
