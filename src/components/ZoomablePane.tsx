import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Pressable,
  LayoutChangeEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '../theme/colors';

interface Props {
  children: React.ReactNode;
  maxScale?: number;
  showResetButton?: boolean;
}

interface GestureStart {
  scale: number;
  tx: number;
  ty: number;
  pinchDist: number;
  panX: number;
  panY: number;
}

const SCALE_RESET_THRESHOLD = 1.04;

export default function ZoomablePane({
  children,
  maxScale = 4,
  showResetButton = true,
}: Props) {
  const [layout, setLayout] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const stateRef = useRef({ scale, tx, ty, layout });
  stateRef.current = { scale, tx, ty, layout };

  const startRef = useRef<GestureStart>({
    scale: 1,
    tx: 0,
    ty: 0,
    pinchDist: 0,
    panX: 0,
    panY: 0,
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ w: width, h: height });
  };

  const reset = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (e) => e.nativeEvent.touches.length === 2,
        onMoveShouldSetPanResponder: (e, gs) => {
          const n = e.nativeEvent.touches.length;
          if (n === 2) return true;
          if (
            n === 1 &&
            stateRef.current.scale > 1 &&
            (Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2)
          ) {
            return true;
          }
          return false;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const t = e.nativeEvent.touches;
          const cur = stateRef.current;
          if (t.length === 2) {
            const dx = t[0].pageX - t[1].pageX;
            const dy = t[0].pageY - t[1].pageY;
            startRef.current = {
              scale: cur.scale,
              tx: cur.tx,
              ty: cur.ty,
              pinchDist: Math.hypot(dx, dy),
              panX: 0,
              panY: 0,
            };
          } else if (t.length === 1) {
            startRef.current = {
              scale: cur.scale,
              tx: cur.tx,
              ty: cur.ty,
              pinchDist: 0,
              panX: t[0].pageX,
              panY: t[0].pageY,
            };
          }
        },
        onPanResponderMove: (e) => {
          const t = e.nativeEvent.touches;
          const { layout: L } = stateRef.current;
          if (L.w === 0 || L.h === 0) return;

          if (t.length === 2) {
            const dx = t[0].pageX - t[1].pageX;
            const dy = t[0].pageY - t[1].pageY;
            const dist = Math.hypot(dx, dy);
            if (startRef.current.pinchDist === 0) {
              startRef.current.pinchDist = dist;
              startRef.current.scale = stateRef.current.scale;
              startRef.current.tx = stateRef.current.tx;
              startRef.current.ty = stateRef.current.ty;
            }
            const ratio = dist / startRef.current.pinchDist;
            const newScale = Math.max(
              1,
              Math.min(maxScale, startRef.current.scale * ratio)
            );
            const maxTx = (L.w * (newScale - 1)) / 2;
            const maxTy = (L.h * (newScale - 1)) / 2;
            setScale(newScale);
            setTx(Math.max(-maxTx, Math.min(maxTx, startRef.current.tx)));
            setTy(Math.max(-maxTy, Math.min(maxTy, startRef.current.ty)));
          } else if (t.length === 1 && stateRef.current.scale > 1) {
            if (startRef.current.pinchDist > 0) {
              startRef.current.pinchDist = 0;
              startRef.current.panX = t[0].pageX;
              startRef.current.panY = t[0].pageY;
              startRef.current.tx = stateRef.current.tx;
              startRef.current.ty = stateRef.current.ty;
              return;
            }
            const dx = t[0].pageX - startRef.current.panX;
            const dy = t[0].pageY - startRef.current.panY;
            const sc = stateRef.current.scale;
            const maxTx = (L.w * (sc - 1)) / 2;
            const maxTy = (L.h * (sc - 1)) / 2;
            setTx(Math.max(-maxTx, Math.min(maxTx, startRef.current.tx + dx)));
            setTy(Math.max(-maxTy, Math.min(maxTy, startRef.current.ty + dy)));
          }
        },
        onPanResponderRelease: () => {
          if (stateRef.current.scale < SCALE_RESET_THRESHOLD) {
            reset();
          }
        },
      }),
    [maxScale]
  );

  const showReset = showResetButton && scale > 1.01;

  return (
    <View style={styles.container} onLayout={onLayout} {...responder.panHandlers}>
      <View
        style={[
          styles.content,
          { transform: [{ translateX: tx }, { translateY: ty }, { scale }] },
        ]}
      >
        {children}
      </View>

      {showReset && (
        <Pressable
          onPress={reset}
          style={styles.resetBtn}
          hitSlop={8}
          pointerEvents="box-only"
        >
          <Feather name="minimize-2" size={14} color={colors.white} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  resetBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
