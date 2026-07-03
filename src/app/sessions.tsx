/**
 * Active sessions / devices — list every device signed in to this account,
 * with the current one badged. Sign out individual devices, all others, or all.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  listSessions,
  revokeSession,
  logout,
  type DeviceSession,
} from "@/services/auth";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { clearAllDataStores } from "@/services/sync";
import { confirm } from "@/store/confirmStore";
import { toast } from "@/store/toastStore";
import { apiError } from "@/utils/apiError";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h !== 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d !== 1 ? "s" : ""} ago`;
}

function deviceIcon(device: string | null): React.ComponentProps<typeof Ionicons>["name"] {
  const d = (device ?? "").toLowerCase();
  if (/mobile|android|iphone/.test(d)) return "phone-portrait-outline";
  if (/ipad|tablet/.test(d)) return "tablet-portrait-outline";
  if (/safari|chrome|firefox|edge|opera/.test(d)) return "globe-outline";
  return "desktop-outline";
}

export default function SessionsScreen() {
  const [sessions, setSessions]     = useState<DeviceSession[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revokingId, setRevokingId]     = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [signingOutCurrent, setSigningOutCurrent] = useState(false);
  const { signOut } = useAuthStore();
  const { reset: resetUser } = useUserStore();

  const load = useCallback(async () => {
    try {
      const list = await listSessions();
      setSessions(list);
    } catch (e) {
      toast.error(apiError(e, "Couldn't load your devices."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const doSignOut = useCallback(async () => {
    setSigningOutCurrent(true);
    try {
      await logout();
      clearAllDataStores();
      await signOut();
      router.replace("/(auth)/login");
    } catch (e) {
      toast.error(apiError(e, "Couldn't sign out. Try again."));
      setSigningOutCurrent(false);
    }
  }, [signOut]);

  // Sign out one specific other-device session.
  const onRevoke = (s: DeviceSession) => {
    const label = s.device ?? s.location ?? "this device";
    confirm({
      title: "Sign out device?",
      message: `${label} will be signed out and need to log in again.`,
      confirmText: "Sign out",
      destructive: true,
      onConfirm: () => {
        void (async () => {
          setRevokingId(s.id);
          try {
            await revokeSession(s.id);
            setSessions((prev) => prev.filter((x) => x.id !== s.id));
            toast.success("Device signed out.");
          } catch (e) {
            toast.error(apiError(e, "Couldn't sign out that device."));
          } finally {
            setRevokingId(null);
          }
        })();
      },
    });
  };

  // Sign out current device → full local logout too.
  const onRevokeCurrent = () => {
    confirm({
      title: "Sign out this device?",
      message: "You'll be signed out and redirected to the login screen.",
      confirmText: "Sign out",
      destructive: true,
      onConfirm: () => { void doSignOut(); },
    });
  };

  const others = sessions.filter((s) => !s.current);

  const onRevokeOthers = () => {
    if (others.length === 0) return;
    confirm({
      title: `Sign out ${others.length} other device${others.length !== 1 ? "s" : ""}?`,
      message: "Every device except this one will be signed out.",
      confirmText: "Sign out others",
      destructive: true,
      onConfirm: () => {
        void (async () => {
          setRevokingOthers(true);
          try {
            await Promise.all(others.map((s) => revokeSession(s.id)));
            setSessions((prev) => prev.filter((s) => s.current));
            toast.success("Other devices signed out.");
          } catch (e) {
            toast.error(apiError(e, "Couldn't sign out the other devices."));
            void load();
          } finally {
            setRevokingOthers(false);
          }
        })();
      },
    });
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-cosmic-darker">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-xl pt-3 pb-[14px]">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#9ca3af" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">Devices</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#a855f7" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor="#a855f7"
            />
          }
        >
          <Text className="text-xs text-dim mb-4" style={{ lineHeight: 17 }}>
            Devices currently signed in to your account. Sign out any you don&apos;t recognise.
          </Text>

          <View className="gap-3">
            {sessions.map((s) => (
              <View
                key={s.id}
                className="rounded-[14px] border border-white/[0.08] overflow-hidden"
                style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
              >
                <View className="flex-row items-center gap-3 p-[14px]">
                  {/* Icon */}
                  <View
                    className="w-[46px] h-[46px] rounded-[13px] items-center justify-center shrink-0"
                    style={{
                      backgroundColor: s.current
                        ? "rgba(74,222,128,0.15)"
                        : "rgba(59,130,246,0.15)",
                    }}
                  >
                    <Ionicons
                      name={deviceIcon(s.device)}
                      size={22}
                      color={s.current ? "#4ade80" : "#3b82f6"}
                    />
                  </View>

                  {/* Info */}
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="text-[14px] font-semibold text-white" numberOfLines={1}>
                        {s.device ?? "Unknown device"}
                      </Text>
                      {s.current && (
                        <View
                          className="px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "rgba(74,222,128,0.15)" }}
                        >
                          <Text className="text-[10px] font-bold text-accent-green">
                            This device
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Location + IP + time */}
                    <Text className="text-[11px] text-muted mt-0.5" numberOfLines={1}>
                      {s.location
                        ? `${s.location} · ${relativeTime(s.lastUsedAt)}`
                        : `${s.ipAddress ?? "Unknown IP"} · ${relativeTime(s.lastUsedAt)}`}
                    </Text>
                    {s.location && s.ipAddress && (
                      <Text className="text-[10px] text-dim mt-0.5" numberOfLines={1}>
                        {s.ipAddress}
                      </Text>
                    )}
                  </View>

                  {/* Sign out button for OTHER devices */}
                  {!s.current && (
                    <TouchableOpacity
                      onPress={() => onRevoke(s)}
                      disabled={revokingId === s.id}
                      className="px-3 py-2 rounded-full border border-accent-red/35 items-center justify-center"
                      style={{ backgroundColor: "rgba(248,113,113,0.12)", minWidth: 74 }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      {revokingId === s.id
                        ? <ActivityIndicator size="small" color="#f87171" />
                        : <Text className="text-[12px] font-semibold text-accent-red">Sign out</Text>}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Sign out THIS device — shown as a bottom strip on the current-device card */}
                {s.current && (
                  <TouchableOpacity
                    onPress={onRevokeCurrent}
                    disabled={signingOutCurrent}
                    className="flex-row items-center justify-center gap-1.5 py-2.5 border-t border-white/[0.06]"
                    style={{ backgroundColor: "rgba(248,113,113,0.06)" }}
                  >
                    {signingOutCurrent ? (
                      <ActivityIndicator size="small" color="#f87171" />
                    ) : (
                      <>
                        <Ionicons name="log-out-outline" size={14} color="#f87171" />
                        <Text className="text-[12px] font-semibold text-accent-red">
                          Sign out this device
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Sign out all other devices */}
          {others.length > 0 && (
            <TouchableOpacity
              onPress={onRevokeOthers}
              disabled={revokingOthers}
              className="flex-row items-center justify-center gap-2 rounded-[14px] py-4 mt-5 border border-accent-red/20"
              style={{ backgroundColor: "rgba(248,113,113,0.08)", opacity: revokingOthers ? 0.6 : 1 }}
              activeOpacity={0.8}
            >
              {revokingOthers ? (
                <ActivityIndicator size="small" color="#f87171" />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={17} color="#f87171" />
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#f87171" }}>
                    Sign out all other devices
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
