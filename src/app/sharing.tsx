import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  useWindowDimensions,
} from "react-native";
// GH's ScrollView cooperates with child RN touchables; RN's horizontal
// pagingEnabled ScrollView swallows taps on its children on Android.
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useAnimatedRef,
  scrollTo,
  runOnJS,
  runOnUI,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { apiEnabled } from "@/services/api";
import {
  listOutgoing,
  listIncoming,
  shareCache,
  discoverFromContacts,
  contactsAvailable,
  SHARE_CATEGORIES,
  type OutgoingShare,
  type IncomingShare,
  type AppUser,
  type InviteContact,
} from "@/services/sharing";
import { toast } from "@/store/toastStore";
import { apiError } from "@/utils/apiError";

// Navigate to the category-picker screen for one recipient, seeding it with the
// current selection (categories + per-item picks) if a share already exists.
const openShareConfig = (id: string, name: string, share?: OutgoingShare) =>
  router.push({
    pathname: "/share-config",
    params: {
      id,
      name,
      sel: JSON.stringify({
        categories: share?.categories ?? [],
        items: share?.items ?? {},
      }),
    },
  });

const catLabel = (k: string) =>
  SHARE_CATEGORIES.find((c) => c.key === k)?.label ?? k;

const AnimatedPager = Animated.createAnimatedComponent(GHScrollView);

function Avatar({ name }: { name: string }) {
  return (
    <View
      className="w-11 h-11 rounded-full items-center justify-center shrink-0"
      style={{ backgroundColor: "rgba(168,85,247,0.15)" }}
    >
      <Text className="text-base font-bold text-accent-purple">
        {(name || "?").charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

type ContactsState = "idle" | "loading" | "ok" | "denied" | "unavailable";

export default function SharingScreen() {
  const { width } = useWindowDimensions();

  // ── Tab animation ────────────────────────────────────────────────────────────
  const [tab, setTab] = useState(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  const tabBarW = useSharedValue(0);

  const goToTab = useCallback(
    (next: number) => {
      runOnUI(() => {
        "worklet";
        scrollTo(scrollRef, next * width, 0, true);
      })();
      setTab(next);
    },
    [scrollRef, width],
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
    onMomentumEnd: (e) => {
      const next = Math.round(e.contentOffset.x / Math.max(1, width));
      runOnJS(setTab)(next);
    },
  });

  // Indicator tracks scroll position in real-time
  const indicatorStyle = useAnimatedStyle(() => {
    const tw = tabBarW.value / 2;
    const iw = tw * 0.6;
    const baseLeft = (tw - iw) / 2;
    const progress = scrollX.value / Math.max(1, width);
    return { left: baseLeft + progress * tw, width: iw };
  });

  // ── Data ─────────────────────────────────────────────────────────────────────
  const [outgoing, setOutgoing] = useState<OutgoingShare[]>(
    shareCache.data?.out ?? [],
  );
  const [incoming, setIncoming] = useState<IncomingShare[]>(
    shareCache.data?.inc ?? [],
  );
  const [loadingShares, setLoadingShares] = useState(!shareCache.data);

  const [contactsState, setContactsState] = useState<ContactsState>("idle");
  const [netUsers, setNetUsers] = useState<AppUser[]>([]);
  const [invitable, setInvitable] = useState<InviteContact[]>([]);
  const contactsLoaded = useRef(false);

  const loadShares = useCallback(async () => {
    if (!apiEnabled) {
      setLoadingShares(false);
      return;
    }
    if (!shareCache.data) setLoadingShares(true);
    try {
      const [out, inc] = await Promise.all([listOutgoing(), listIncoming()]);
      shareCache.data = { out, inc };
      setOutgoing(out);
      setIncoming(inc);
    } catch {
      /* keep stale */
    } finally {
      setLoadingShares(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadShares();
    }, [loadShares]),
  );

  const loadContacts = useCallback(async () => {
    if (!contactsAvailable) {
      setContactsState("unavailable");
      return;
    }
    setContactsState("loading");
    try {
      const res = await discoverFromContacts();
      setNetUsers(res.users);
      setInvitable(res.invitable);
      setContactsState(res.status);
    } catch (e) {
      toast.error(apiError(e, "Couldn't load contacts."));
      setContactsState("ok");
    }
  }, []);

  useEffect(() => {
    if (tab === 1 && !contactsLoaded.current) {
      contactsLoaded.current = true;
      void loadContacts();
    }
  }, [tab, loadContacts]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const inviteContact = (c: InviteContact) => {
    Share.share({
      message: `Hey ${c.name.split(" ")[0]}! I use NetWorth to track my finances. Join me — ${process.env.EXPO_PUBLIC_APP_URL}/invite`,
    }).catch((e) => toast.error(apiError(e, "Couldn't open share sheet.")));
  };

  const sharingWithIds = new Set(outgoing.map((s) => s.recipient.id));

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      {/* Header */}
      <View className="flex-row items-center px-xl pt-3 pb-2 gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#9ca3af" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white flex-1">Sharing</Text>
      </View>

      {/* Tab bar */}
      <View
        className="flex-row border-b border-white/[0.07]"
        onLayout={(e) => {
          tabBarW.value = e.nativeEvent.layout.width;
        }}
      >
        {["Sharing", "Contacts"].map((label, i) => (
          <TouchableOpacity
            key={label}
            onPress={() => goToTab(i)}
            activeOpacity={0.8}
            className="flex-1 items-center py-3"
          >
            <Text
              className="text-sm font-bold"
              style={{ color: tab === i ? "#a855f7" : "#6b7280" }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
        {/* Animated sliding indicator */}
        <Animated.View
          style={[
            {
              position: "absolute",
              bottom: 0,
              height: 2,
              backgroundColor: "#a855f7",
              borderRadius: 2,
            },
            indicatorStyle,
          ]}
        />
      </View>

      {/* Swipeable content — both tabs rendered side-by-side */}
      <AnimatedPager
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        style={{ flex: 1 }}
        contentContainerStyle={{ alignItems: "stretch" }}
      >
        {/* ── Tab 0: Sharing ── */}
        <View style={{ width }}>
          {!apiEnabled ? (
            <View className="flex-1 items-center justify-center px-8">
              <Text className="text-sm text-muted text-center">
                Sharing needs the backend to be connected.
              </Text>
            </View>
          ) : loadingShares ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#a855f7" />
            </View>
          ) : (
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <Text className="text-xs font-bold text-muted uppercase tracking-widest px-xl mt-5 mb-1">
                You&apos;re sharing with
              </Text>
              {outgoing.length === 0 ? (
                <View className="px-xl py-6 items-center gap-2">
                  <Ionicons
                    name="share-social-outline"
                    size={28}
                    color="#374151"
                  />
                  <Text className="text-sm text-dim text-center">
                    Not sharing yet.{"\n"}Go to Contacts to start.
                  </Text>
                </View>
              ) : (
                outgoing.map((s, i) => (
                  <React.Fragment key={s.recipient.id}>
                    <TouchableOpacity
                      onPress={() =>
                        openShareConfig(s.recipient.id, s.recipient.name, s)
                      }
                      activeOpacity={0.7}
                      className="flex-row items-center gap-3 px-xl py-3"
                    >
                      <Avatar name={s.recipient.name} />
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-white">
                          {s.recipient.name}
                        </Text>
                        <Text className="text-xs text-dim" numberOfLines={1}>
                          {s.categories.map(catLabel).join(", ")}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#374151"
                      />
                    </TouchableOpacity>
                    {i < outgoing.length - 1 && (
                      <View className="h-px bg-white/[0.04] ml-[76px] mr-xl" />
                    )}
                  </React.Fragment>
                ))
              )}

              <View className="h-px bg-white/[0.06] mx-xl my-4" />

              <Text className="text-xs font-bold text-muted uppercase tracking-widest px-xl mb-1">
                Shared with you
              </Text>
              {incoming.length === 0 ? (
                <View className="px-xl py-4">
                  <Text className="text-sm text-dim">
                    No one is sharing with you yet.
                  </Text>
                </View>
              ) : (
                incoming.map((s, i) => (
                  <React.Fragment key={s.owner.id}>
                    <TouchableOpacity
                      onPress={() => router.push(`/shared/${s.owner.id}`)}
                      activeOpacity={0.7}
                      className="flex-row items-center gap-3 px-xl py-3"
                    >
                      <Avatar name={s.owner.name} />
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-white">
                          {s.owner.name}
                        </Text>
                        <Text className="text-xs text-dim" numberOfLines={1}>
                          {s.categories.map(catLabel).join(", ")}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#374151"
                      />
                    </TouchableOpacity>
                    {i < incoming.length - 1 && (
                      <View className="h-px bg-white/[0.04] ml-[76px] mr-xl" />
                    )}
                  </React.Fragment>
                ))
              )}
            </ScrollView>
          )}
        </View>

        {/* ── Tab 1: Contacts ── */}
        <View style={{ width }}>
          {contactsState === "idle" || contactsState === "loading" ? (
            <View className="flex-1 items-center justify-center gap-3">
              <ActivityIndicator color="#a855f7" />
              <Text className="text-sm text-muted">
                Finding contacts on NetWorth…
              </Text>
            </View>
          ) : contactsState === "denied" ? (
            <View className="flex-1 items-center justify-center px-8 gap-3">
              <View
                className="w-14 h-14 rounded-2xl items-center justify-center border border-white/[0.08]"
                style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={26}
                  color="#6b7280"
                />
              </View>
              <Text className="text-base font-semibold text-white text-center">
                Contacts permission needed
              </Text>
              <Text className="text-sm text-muted text-center">
                Allow contacts access to find friends on NetWorth. Their numbers
                are hashed on-device.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  contactsLoaded.current = false;
                  void loadContacts();
                }}
                className="px-6 py-3 rounded-2xl mt-1"
                style={{ backgroundColor: "rgba(168,85,247,0.9)" }}
              >
                <Text className="text-sm font-bold text-white">
                  Grant Permission
                </Text>
              </TouchableOpacity>
            </View>
          ) : contactsState === "unavailable" ? (
            <View className="flex-1 items-center justify-center px-8">
              <Text className="text-sm text-muted text-center">
                Contact discovery requires a native build of the app.
              </Text>
            </View>
          ) : (
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <Text className="text-xs font-bold text-muted uppercase tracking-widest px-xl mt-5 mb-1">
                On NetWorth
              </Text>
              {netUsers.length === 0 ? (
                <View className="px-xl py-4">
                  <Text className="text-sm text-dim">
                    None of your contacts are on NetWorth yet.
                  </Text>
                </View>
              ) : (
                netUsers.map((u, i) => {
                  const already = sharingWithIds.has(u.id);
                  const displayName = u.contactName || u.name;
                  return (
                    <React.Fragment key={u.id}>
                      <TouchableOpacity
                        onPress={() =>
                          openShareConfig(
                            u.id,
                            displayName,
                            outgoing.find((s) => s.recipient.id === u.id),
                          )
                        }
                        activeOpacity={0.7}
                        className="flex-row items-center gap-3 px-xl py-3"
                      >
                        <Avatar name={displayName} />
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-white">
                            {displayName}
                          </Text>
                          <Text className="text-xs text-dim">
                            {already ? "Tap to edit sharing" : "On NetWorth"}
                          </Text>
                        </View>
                        {already && (
                          <View
                            className="px-3 py-1 rounded-full"
                            style={{ backgroundColor: "rgba(34,197,94,0.15)" }}
                          >
                            <Text
                              className="text-xs font-semibold"
                              style={{ color: "#22c55e" }}
                            >
                              Sharing
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      {i < netUsers.length - 1 && (
                        <View className="h-px bg-white/[0.04] ml-[76px] mr-xl" />
                      )}
                    </React.Fragment>
                  );
                })
              )}

              {invitable.length > 0 && (
                <>
                  <View className="h-px bg-white/[0.06] mx-xl my-4" />
                  <Text className="text-xs font-bold text-muted uppercase tracking-widest px-xl mb-1">
                    Invite to NetWorth
                  </Text>
                  {invitable.map((c, i) => (
                    <React.Fragment key={`${c.name}-${i}`}>
                      <TouchableOpacity
                        onPress={() => inviteContact(c)}
                        activeOpacity={0.7}
                        className="flex-row items-center gap-3 px-xl py-3"
                      >
                        <Avatar name={c.name || "?"} />
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-white">
                            {c.name || c.phone}
                          </Text>
                          <Text className="text-xs text-dim">{c.phone}</Text>
                        </View>
                        <View
                          className="px-3 py-1 rounded-full border border-white/[0.1]"
                          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                        >
                          <Text className="text-xs font-semibold text-muted">
                            Invite
                          </Text>
                        </View>
                      </TouchableOpacity>
                      {i < invitable.length - 1 && (
                        <View className="h-px bg-white/[0.04] ml-[76px] mr-xl" />
                      )}
                    </React.Fragment>
                  ))}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </AnimatedPager>
    </SafeAreaView>
  );
}
