import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path, Defs, ClipPath, G } from 'react-native-svg';

const AnimatedG = Animated.createAnimatedComponent(G);

const TEAL = '#4DD2BD';
const PINK = '#FF6EA4';

const BODY_PATH =
  'm70.2 27.3v-2.6h-3.1v2.7c-0.7 2.6-2.6 5-2.6 5l-6.3-7.3c0.9-1.6 1.5-3.9 1.5-6.4 0-5.6-5.3-17.2-12.6-17.2-5.5-0.2-12.7 9.4-12.7 17.2 0 2.5 0.6 4.7 1.7 6.5-1.6 1.5-4.5 5.1-6.5 7.3-0.7-1.1-1.8-3.4-2.5-5.2v-2.7h-3.3v2.6h-2.5v3.3h2.9c0.9 2.1 2.6 5.5 3.2 6.7 1 1.7 3.3 2 5.2-0.1-0.5 5.4 1.4 11.4 2.8 16.8-1-0.4-2-0.7-2.9-0.6-0.6 0.1-1.1 0.4-2.1 1.4-1.3 1.6-3.7 4.4-4.9 5.7h-2.5v3.3h5.8c0.7-2.1 4.4-5.8 4.4-5.8 1.1 0.5 2.7 1.5 3.6 2.3 1.5 7.4 1.1 18.2 6.5 25.8 3.1 4.4 8.2 8.4 15.2 8.9 6.7 0.4 12-3 14.4-7.1 1.2-2.1 1.8-4.1 1.8-6.9 0-6.1-4.2-12-11.4-12.3-5.8-0.2-10.8 4.1-10.8 9 0.1 2.8 1.9 5.9 4.5 6.8-0.6-1.4-1.6-2.9-1.5-5.4 0.1-3 2.7-5.9 6.7-5.9 4.6 0 7.4 3.7 7.5 6.8 0.3 5.3-3.9 9.7-10.1 9.7-6.7 0-12.5-5.5-12.6-13.6-0.1-5.4 2.4-10.2 4.3-12.9 2.1-1.8 4.8-3.7 9.4-5.2 1.1 0.8 4.2 4.4 4.5 5.8h5.9l0.1-3.4h-2.7c-0.9-1.4-3.4-4.5-5.1-6.1-0.7-0.6-1.3-1-2.3-0.9-0.9 0.1-2.1 0.3-3.4 0.7 1.9-3.4 4-9.1 4-14.3 0-0.7 0-1.5-0.1-2.4 1 0.8 1.8 1.3 2.8 1.3 1.2 0 1.9-0.4 2.5-1.4 1.2-1.8 3-6.2 3.1-6.7h2.9v-3.2h-2.7z';

const TAIL_PATH =
  'm63.2 68.6c4.4 0.3 10.1 4.1 9.9 12.4-0.2 5.6-4.6 12.8-12.9 13.8 6.4-0.2 11-4 12.8-7.5 1.1-2.1 1.6-3.9 1.6-6.5 0.1-6.6-5-12-11.4-12.2z';

// Wavy diagonal mask: a big shape whose top edge curves down-right (so right side
// reaches into the chameleon area first as the shape slides up-left). The shape
// extends well past the SVG so its corners never expose the chameleon.
const WAVE_PATH =
  'M -300 600 L -300 100 ' +
  'C -250 75, -210 130, -170 95 ' +
  'C -130 60, -90 115, -50 80 ' +
  'C -10 45, 30 100, 70 60 ' +
  'C 110 25, 150 80, 190 40 ' +
  'C 230 5, 270 60, 310 20 ' +
  'C 350 -15, 390 35, 420 -10 ' +
  'L 420 -50 L 420 600 Z';

interface Props {
  size?: number;
}

export default function Chameleon({ size = 200 }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(4500),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 6500,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.delay(500),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 10000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Diagonal slide tightly bracketed around the chameleon area so the entire
  // animation duration is spent actively wiping the visible region.
  const tx = pulse.interpolate({ inputRange: [0, 1], outputRange: [20, -25] });
  const ty = pulse.interpolate({ inputRange: [0, 1], outputRange: [55, -90] });

  return (
    <Svg viewBox="0 0 96 96" width={size} height={size}>
      <Defs>
        <ClipPath id="venomWipe">
          <AnimatedG x={tx} y={ty}>
            <Path d={WAVE_PATH} />
          </AnimatedG>
        </ClipPath>
      </Defs>

      <Path d={BODY_PATH} fill={TEAL} />
      <Path d={TAIL_PATH} fill={TEAL} />

      <G clipPath="url(#venomWipe)">
        <Path d={BODY_PATH} fill={PINK} />
        <Path d={TAIL_PATH} fill={PINK} />
      </G>
    </Svg>
  );
}
