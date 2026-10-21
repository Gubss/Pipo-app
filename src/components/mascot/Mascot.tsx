import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { mascotSvg, type MascotMood, type MascotStage } from './mascotSvg';

export type { MascotMood, MascotStage };

type Props = {
  mood: MascotMood;
  size?: number;
  stage?: MascotStage;
  animated?: boolean;
};

// Respira devagar o tempo todo; quando comemora, dá pulinhos.
export default function Mascot({ mood, size = 140, stage = 2, animated = true }: Props) {
  const xml = useMemo(() => mascotSvg(mood, stage), [mood, stage]);
  const breath = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const duration = mood === 'sleeping' ? 2600 : 1600;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animated, mood, breath]);

  useEffect(() => {
    if (!animated || mood !== 'celebrating') {
      hop.setValue(0);
      return;
    }
    const jump = Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(hop, { toValue: 0, duration: 260, easing: Easing.bounce, useNativeDriver: true }),
    ]);
    const loop = Animated.loop(Animated.sequence([jump, jump, Animated.delay(900)]));
    loop.start();
    return () => loop.stop();
  }, [animated, mood, hop]);

  const scaleY = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const scaleX = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] });
  const translateY = hop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.12] });

  return (
    <Animated.View
      style={{ width: size, height: size, transform: [{ translateY }, { scaleX }, { scaleY }] }}
      accessibilityRole="image"
      accessibilityLabel={`Pipo, ${moodLabel[mood]}`}
    >
      <SvgXml xml={xml} width={size} height={size} />
    </Animated.View>
  );
}

const moodLabel: Record<MascotMood, string> = {
  happy: 'feliz',
  thinking: 'pensando',
  worried: 'preocupado',
  celebrating: 'comemorando',
  sleeping: 'dormindo',
  listening: 'ouvindo',
  sad: 'com saudade',
};
