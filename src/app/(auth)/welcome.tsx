/**
 * Welcome screen — horizontal slide carousel shown on first launch.
 * Slide data and Visual components live in src/constants/slides.tsx.
 *
 * Plain ScrollView, not FlatList: only 5 fixed slides, so there's nothing to
 * virtualize — and FlatList's windowing/getItemLayout/scrollToIndex machinery
 * was exactly what caused the "shrinks to a corner, other slides blank" glitch
 * on back-and-forth navigation. A ScrollView has no cell recycling to desync.
 */
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { useAuthStore } from "@/store/authStore";
import { SLIDES } from "@/constants/slides";
import { S } from "@/constants/theme";

export default function WelcomeScreen() {
  const { width: W } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const { completeWelcome } = useAuthStore();

  const isLast = currentIndex === SLIDES.length - 1;

  const scrollTo = (index: number) => {
    setCurrentIndex(index); // update immediately — no virtualization to wait on
    scrollRef.current?.scrollTo({ x: W * index, animated: true });
  };

  const handleNext = async () => {
    if (!isLast) {
      scrollTo(currentIndex + 1);
    } else {
      await completeWelcome();
      router.replace("/(auth)/login");
    }
  };
  const handleBack = () => {
    if (currentIndex > 0) scrollTo(currentIndex - 1);
  };
  const handleSkip = async () => {
    await completeWelcome();
    router.replace("/(auth)/login");
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / W));
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      className="flex-1 bg-cosmic-darker overflow-hidden"
    >
      {/* Top bar */}
      <View className="flex-row items-center justify-between px-5 py-2.5">
        {currentIndex > 0 ? (
          <TouchableOpacity
            onPress={handleBack}
            className="w-9 h-9 rounded-[10px] bg-white/[0.05] border border-white/[0.08] items-center justify-center"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color="#9ca3af" />
          </TouchableOpacity>
        ) : (
          <View className="w-9" />
        )}
        <TouchableOpacity
          onPress={handleSkip}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text className="text-sm text-muted font-semibold">Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={{ flex: 1 }}
      >
        {SLIDES.map((item) => (
          <View key={item.id} className="flex-1 px-6" style={{ width: W }}>
            {/* Visual area */}
            <View className="flex-1 items-center justify-center py-4">
              <item.Visual />
            </View>

            {/* Text area */}
            <View className="pb-3">
              <Text
                className="text-[11px] font-extrabold tracking-[2px] mb-2"
                style={{ color: item.accent }}
              >
                {item.tag}
              </Text>
              <Text className="text-[28px] font-extrabold text-white leading-[36px] mb-2">
                {item.headline}
              </Text>
              <Text className="text-sm text-secondary leading-[21px] mb-3">
                {item.sub}
              </Text>
              {item.highlights && (
                <View className="gap-[7px]">
                  {item.highlights.map((h) => (
                    <View key={h.text} className="flex-row items-center gap-2.5">
                      <Ionicons name={h.icon} size={14} color="#6b7280" />
                      <Text className="text-sm text-muted leading-[20px]">
                        {h.text}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom bar */}
      <Animated.View
        entering={FadeIn.duration(500)}
        className="px-6 pb-4 pt-3 gap-3 border-t border-white/[0.05]"
      >
        {/* Dots */}
        <View className="flex-row gap-1.5 items-center justify-center">
          {SLIDES.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => scrollTo(i)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View
                className="h-2 rounded-full"
                style={{
                  width: i === currentIndex ? 22 : 8,
                  backgroundColor:
                    i === currentIndex
                      ? SLIDES[currentIndex].accent
                      : "rgba(255,255,255,0.2)",
                }}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA */}
        {isLast ? (
          <TouchableOpacity
            onPress={handleNext}
            className="flex-row items-center justify-center gap-2.5 py-[15px] rounded-2xl"
            style={[
              { backgroundColor: SLIDES[currentIndex].accent },
              S.purpleSm,
            ]}
            activeOpacity={0.85}
          >
            <Text className="text-base font-bold text-white">
              Start Building Wealth
            </Text>
            <Ionicons name="rocket-outline" size={17} color="#fff" />
          </TouchableOpacity>
        ) : null}

        {/* Sign in link */}
        <TouchableOpacity onPress={handleSkip} className="items-center py-1">
          <Text className="text-xs text-dim text-center">
            Already have an account?{" "}
            <Text className="text-accent-purple font-bold">Sign in</Text>
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}
