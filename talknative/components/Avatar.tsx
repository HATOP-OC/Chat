import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  uri?: string | null;
  name?: string | null;
  size?: number;
  isOnline?: boolean;
}

export function Avatar({ uri, name, size = 44, isOnline }: Props) {
  const colors = useColors();
  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.img,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.secondary,
            },
          ]}
        >
          {name ? (
            <Text
              style={[
                styles.initials,
                {
                  color: colors.primary,
                  fontSize: size * 0.36,
                },
              ]}
            >
              {initials}
            </Text>
          ) : (
            <Ionicons
              name="person"
              size={size * 0.5}
              color={colors.mutedForeground}
            />
          )}
        </View>
      )}
      {isOnline !== undefined && (
        <View
          style={[
            styles.onlineDot,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              backgroundColor: isOnline ? colors.online : colors.mutedForeground,
              borderColor: colors.card,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  img: { resizeMode: "cover" },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: "Inter_600SemiBold",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
});
