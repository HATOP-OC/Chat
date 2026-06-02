import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  name?: string;
}

function Dot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: -6,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[styles.dot, { transform: [{ translateY: anim }] }]}
    />
  );
}

export function TypingIndicator({ visible, name }: Props) {
  const colors = useColors();
  if (!visible) return null;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: colors.bubble.received },
        ]}
      >
        <Dot delay={0} />
        <Dot delay={160} />
        <Dot delay={320} />
      </View>
      {name && (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {name} is typing…
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginVertical: 4,
    gap: 8,
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#8a9ab0",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
