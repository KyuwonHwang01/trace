import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  PanResponder,
  Animated,
  Easing,
  GestureResponderEvent,
  Linking,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing, text } from '../theme/colors';
import { addPhoto, loadPhotos } from '../storage/photos';
import { Photo } from '../types';
import type { RootStackParamList } from '../navigation/types';
import PhotoPickerSheet from '../components/PhotoPickerSheet';
import { useTranslation } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;

const ZOOM_PRESETS: { label: string; value: number }[] = [
  { label: '1x', value: 0 },
  { label: '2x', value: 0.02 },
  { label: '3x', value: 0.05 },
  { label: '5x', value: 0.1 },
];
const MAX_ZOOM = 0.5;

export default function CameraScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { projectId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const overlayOpacity = useRef(new Animated.Value(0.4)).current;
  const [overlayPct, setOverlayPct] = useState(40);
  const [showGrid, setShowGrid] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [focusPos, setFocusPos] = useState<{ x: number; y: number } | null>(null);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const cameraRef = useRef<CameraView | null>(null);
  const sliderTrackWidthRef = useRef(0);
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);

  const pinchResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (e) => e.nativeEvent.touches.length === 2,
        onMoveShouldSetPanResponder: (e) => e.nativeEvent.touches.length === 2,
        onPanResponderGrant: (e) => {
          const touches = e.nativeEvent.touches;
          if (touches.length !== 2) return;
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          pinchStartRef.current = { dist: Math.hypot(dx, dy), zoom };
        },
        onPanResponderMove: (e) => {
          const touches = e.nativeEvent.touches;
          if (touches.length !== 2 || !pinchStartRef.current) return;
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.hypot(dx, dy);
          const ratio = dist / pinchStartRef.current.dist;
          const next = pinchStartRef.current.zoom + (ratio - 1) * 0.15;
          setZoom(Math.max(0, Math.min(MAX_ZOOM, next)));
        },
        onPanResponderRelease: () => {
          pinchStartRef.current = null;
        },
        onPanResponderTerminate: () => {
          pinchStartRef.current = null;
        },
      }),
    [zoom]
  );

  const activePresetIdx = useMemo(() => {
    let best = 0;
    let bestDelta = Infinity;
    ZOOM_PRESETS.forEach((p, i) => {
      const d = Math.abs(p.value - zoom);
      if (d < bestDelta) {
        bestDelta = d;
        best = i;
      }
    });
    return bestDelta < 0.005 ? best : -1;
  }, [zoom]);

  useEffect(() => {
    loadPhotos(projectId).then((ps) => {
      setPhotos(ps);
      setReferenceId((curr) => curr ?? ps[0]?.id ?? null);
    });
  }, [projectId]);

  useEffect(() => {
    const id = overlayOpacity.addListener(({ value }) => {
      setOverlayPct(Math.round(value * 100));
    });
    return () => overlayOpacity.removeListener(id);
  }, [overlayOpacity]);

  const referencePhoto = photos.find((p) => p.id === referenceId) ?? null;

  // Auto-trigger the iOS permission prompt on first entry. Apple requires
  // that any pre-permission custom UI must lead directly to the request,
  // with no escape hatch (rejected under Guideline 5.1.1(iv) for v1.0 build 4).
  useEffect(() => {
    if (permission && permission.status === 'undetermined') {
      requestPermission();
    }
  }, [permission?.status]);

  if (!permission || permission.status === 'undetermined') {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    // Permission has already been requested and denied. Now we can show
    // explanatory UI with a path to Settings + a back button.
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>{t('camera.permission.deniedTitle')}</Text>
        <Text style={styles.permissionBody}>{t('camera.permission.deniedBody')}</Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.permissionBtnText}>
            {t('camera.permission.openSettings')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: spacing.md }}
        >
          <Text style={styles.permissionCancel}>{t('camera.permission.back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });
      if (!result?.uri) throw new Error('no uri');
      await addPhoto(projectId, result.uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('camera.captureFail.title'), t('camera.captureFail.body'));
      setCapturing(false);
    }
  };

  const handleFocusTap = (e: GestureResponderEvent) => {
    if (e.nativeEvent.touches.length > 1) return;
    const { locationX, locationY } = e.nativeEvent;
    setFocusPos({ x: locationX, y: locationY });
    Haptics.selectionAsync();
    focusAnim.setValue(0);
    Animated.sequence([
      Animated.timing(focusAnim, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(450),
      Animated.timing(focusAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSliderTouch = (e: GestureResponderEvent) => {
    const w = sliderTrackWidthRef.current;
    if (w === 0) return;
    const x = e.nativeEvent.locationX;
    const v = Math.max(0, Math.min(1, x / w));
    overlayOpacity.setValue(v);
  };

  return (
    <View style={styles.container} {...pinchResponder.panHandlers}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        zoom={zoom}
      />

      {referencePhoto && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: overlayOpacity }]}
        >
          <Image
            source={{ uri: referencePhoto.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        </Animated.View>
      )}

      {showGrid && <GridOverlay />}

      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleFocusTap}
      />

      {focusPos && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.focusBox,
            {
              left: focusPos.x - 38,
              top: focusPos.y - 38,
              opacity: focusAnim,
              transform: [
                {
                  scale: focusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1.6, 1],
                  }),
                },
              ],
            },
          ]}
        />
      )}

      <SafeAreaView style={styles.topBar} edges={['top']}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Feather name="x" size={20} color={colors.white} />
        </Pressable>
        <View style={styles.topRight}>
          <Pressable style={styles.iconBtn} onPress={() => setShowGrid((v) => !v)}>
            <Feather
              name="grid"
              size={18}
              color={colors.white}
              style={!showGrid && { opacity: 0.4 }}
            />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          >
            <Feather name="refresh-cw" size={18} color={colors.white} />
          </Pressable>
        </View>
      </SafeAreaView>

      {referencePhoto && (
        <View style={styles.overlayPill}>
          <View style={styles.overlayPillInner}>
            <Text style={styles.overlayPillLabel}>{t('camera.overlayLabel')}</Text>
            <View
              style={styles.sliderTrack}
              onLayout={(e) => {
                sliderTrackWidthRef.current = e.nativeEvent.layout.width;
              }}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={handleSliderTouch}
              onResponderMove={handleSliderTouch}
            >
              <View style={styles.sliderTrackBg} />
              <Animated.View
                style={[
                  styles.sliderFill,
                  {
                    width: overlayOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.sliderThumb,
                  {
                    left: overlayOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.overlayPillValue}>{overlayPct}%</Text>
          </View>
        </View>
      )}

      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        <View style={styles.zoomRow}>
          {ZOOM_PRESETS.map((preset, i) => {
            const active = i === activePresetIdx;
            return (
              <Pressable
                key={preset.label}
                style={[styles.zoomPill, active && styles.zoomPillActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setZoom(preset.value);
                }}
              >
                <Text
                  style={[styles.zoomPillText, active && styles.zoomPillTextActive]}
                >
                  {active ? preset.label : preset.label.replace('x', '')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.bottomBarInner}>
          <Pressable
            style={styles.thumbSlot}
            onPress={() => {
              Haptics.selectionAsync();
              setPickerVisible(true);
            }}
          >
            {referencePhoto ? (
              <Image
                source={{ uri: referencePhoto.uri }}
                style={styles.thumb}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty]}>
                <Text style={styles.thumbEmptyText}>{t('camera.referenceEmpty')}</Text>
              </View>
            )}
            {referencePhoto && (
              <View style={styles.thumbBadge}>
                <Text style={styles.thumbBadgeText}>{t('camera.referenceLabel')}</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={styles.shutter}
            onPress={handleCapture}
            disabled={capturing}
          >
            <View style={styles.shutterInner}>
              {capturing && <ActivityIndicator color={colors.accent} />}
            </View>
          </Pressable>

          <View style={styles.thumbSlot} />
        </View>
      </SafeAreaView>

      <PhotoPickerSheet
        visible={pickerVisible}
        title={t('camera.sheet.title')}
        photos={photos}
        selectedId={referenceId}
        onSelect={(p) => {
          setReferenceId(p.id);
          setPickerVisible(false);
        }}
        onClose={() => setPickerVisible(false)}
        extraOption={{
          label: t('camera.sheet.disable'),
          active: referenceId === null,
          onPress: () => {
            setReferenceId(null);
            setPickerVisible(false);
          },
        }}
      />
    </View>
  );
}

function GridOverlay() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.gridLine, styles.gridLineH, { top: '33.33%' }]} />
      <View style={[styles.gridLine, styles.gridLineH, { top: '66.66%' }]} />
      <View style={[styles.gridLine, styles.gridLineV, { left: '33.33%' }]} />
      <View style={[styles.gridLine, styles.gridLineV, { left: '66.66%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  permissionTitle: {
    ...text.title,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  permissionBody: {
    ...text.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
  },
  permissionBtnText: {
    ...text.button,
    color: colors.white,
  },
  permissionCancel: {
    ...text.meta,
    color: colors.textMuted,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  topRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayPill: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
  },
  overlayPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  overlayPillLabel: {
    ...text.caption,
    color: colors.white,
    opacity: 0.7,
  },
  overlayPillValue: {
    ...text.metaMedium,
    color: colors.white,
    minWidth: 36,
    textAlign: 'right',
  },
  sliderTrack: {
    width: 130,
    height: 22,
    justifyContent: 'center',
  },
  sliderTrackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.white,
  },
  sliderThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.white,
    marginLeft: -7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  zoomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  zoomPill: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomPillActive: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  zoomPillText: {
    ...text.metaMedium,
    color: colors.white,
  },
  zoomPillTextActive: {
    ...text.metaMedium,
    color: colors.accent,
    fontSize: 12,
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  thumbSlot: {
    width: 56,
    height: 56,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.white,
  },
  thumbEmpty: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  thumbEmptyText: {
    ...text.caption,
    color: colors.white,
    opacity: 0.85,
  },
  thumbBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  thumbBadgeText: {
    color: colors.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 0.3,
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  focusBox: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFCC00',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 1.5,
  },
  gridLineH: {
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineV: {
    top: 0,
    bottom: 0,
    width: 1,
  },
});
