/**
 * Security settings — app lock, 2FA toggle, and set/change password.
 */
import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  TextInput, ActivityIndicator, Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { authenticate, biometricsAvailable } from "@/services/biometrics";
import { useSecurityStore } from "@/store/securityStore";
import { useUserStore } from "@/store/userStore";
import { toast } from "@/store/toastStore";
import { confirm } from "@/store/confirmStore";
import { updateMe } from "@/services/backend";
import { forgotPassword, resetPassword, finishLogin } from "@/services/auth";
import { apiError } from "@/utils/apiError";

type PwStage = "idle" | "sent" | "done";

export default function SecurityScreen() {
  const { appLockEnabled, setAppLock } = useSecurityStore();
  const { twoFactorEnabled, hasPassword, email } = useUserStore();

  // Password-change flow (inline)
  const [pwStage, setPwStage] = useState<PwStage>("idle");
  const [pwOtp, setPwOtp] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const onToggleAppLock = async (on: boolean) => {
    if (on) {
      if (!biometricsAvailable) {
        toast.error("Device authentication needs a native build of the app.");
        return;
      }
      const ok = await authenticate("Confirm to enable app lock");
      if (!ok) { toast.error("Authentication failed. App lock not enabled."); return; }
      await setAppLock(true);
      toast.success("App lock enabled.");
    } else {
      const ok = await authenticate("Confirm to disable app lock");
      if (!ok) { toast.error("Authentication failed."); return; }
      confirm({
        title: "Turn off app lock?",
        message: "The app will open without authentication.",
        confirmText: "Turn off",
        destructive: true,
        onConfirm: () => {
          void setAppLock(false).then(() => toast.success("App lock disabled."));
        },
      });
    }
  };

  const onToggle2FA = async (on: boolean) => {
    useUserStore.setState({ twoFactorEnabled: on });
    const result = await updateMe({ twoFactorEnabled: on });
    if (!result) {
      // rollback on failure
      useUserStore.setState({ twoFactorEnabled: !on });
      toast.error("Failed to update 2FA setting.");
    } else {
      toast.success(on ? "2FA enabled — you'll get a code on each login." : "2FA disabled.");
    }
  };

  const onSendPwCode = async () => {
    if (!email) { toast.error("No email on this account."); return; }
    setPwBusy(true);
    Keyboard.dismiss();
    try {
      await forgotPassword(email);
      setPwOtp("");
      setPwNew("");
      setPwStage("sent");
      toast.success("Reset code sent to your email.");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setPwBusy(false);
    }
  };

  const onSetPassword = async () => {
    if (pwOtp.length !== 6) { toast.error("Enter the 6-digit code."); return; }
    if (pwNew.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setPwBusy(true);
    Keyboard.dismiss();
    try {
      const result = await resetPassword(email!, pwOtp, pwNew);
      await finishLogin(result);
      useUserStore.setState({ hasPassword: true });
      setPwStage("idle");
      setPwOtp("");
      setPwNew("");
      toast.success(hasPassword ? "Password updated." : "Password set. You can now log in with email + password.");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      {/* Header */}
      <View className="flex-row items-center px-xl pt-3 pb-[14px] gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#9ca3af" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">Security</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-xl gap-4 mt-2">

          {/* ── App lock ───────────────────────────────────────── */}
          <Text className="text-xs font-bold text-secondary uppercase tracking-widest">App Lock</Text>
          <Text className="text-sm text-muted -mt-2" style={{ lineHeight: 20 }}>
            Lock NetWorth on every open using your phone&apos;s biometrics or device PIN —
            no custom PIN to set or remember.
          </Text>

          <View
            className="flex-row items-center gap-[14px] rounded-2xl border border-white/[0.08] p-4"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <View
              className="w-10 h-10 rounded-[11px] items-center justify-center"
              style={{ backgroundColor: "rgba(168,85,247,0.15)" }}
            >
              <Ionicons name="lock-closed-outline" size={20} color="#a855f7" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-white">App Lock</Text>
              <Text className="text-xs text-dim">Face ID, fingerprint, or device PIN</Text>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={onToggleAppLock}
              trackColor={{ false: "#374151", true: "#a855f7" }}
              thumbColor="#fff"
            />
          </View>

          {/* ── 2FA ────────────────────────────────────────────── */}
          <Text className="text-xs font-bold text-secondary uppercase tracking-widest mt-2">Login Security</Text>

          <View
            className="flex-row items-center gap-[14px] rounded-2xl border border-white/[0.08] p-4"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <View
              className="w-10 h-10 rounded-[11px] items-center justify-center"
              style={{ backgroundColor: "rgba(168,85,247,0.15)" }}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color="#a855f7" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-white">Two-Factor Auth</Text>
              <Text className="text-xs text-dim">Require email OTP on every login</Text>
            </View>
            <Switch
              value={twoFactorEnabled}
              onValueChange={onToggle2FA}
              trackColor={{ false: "#374151", true: "#a855f7" }}
              thumbColor="#fff"
            />
          </View>

          {/* ── Password ─────────────────────────────────────────── */}
          {email && (
            <>
              <Text className="text-xs font-bold text-secondary uppercase tracking-widest mt-2">Password</Text>

              {pwStage === "idle" && (
                <TouchableOpacity
                  onPress={onSendPwCode}
                  disabled={pwBusy}
                  className="flex-row items-center gap-[14px] rounded-2xl border border-white/[0.08] p-4"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)", opacity: pwBusy ? 0.55 : 1 }}
                  activeOpacity={0.75}
                >
                  <View
                    className="w-10 h-10 rounded-[11px] items-center justify-center"
                    style={{ backgroundColor: "rgba(168,85,247,0.15)" }}
                  >
                    <Ionicons name="key-outline" size={20} color="#a855f7" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-white">
                      {hasPassword ? "Change Password" : "Set Password"}
                    </Text>
                    <Text className="text-xs text-dim">
                      {hasPassword
                        ? "Send a reset code to your email"
                        : "Lets you also log in with email + password"}
                    </Text>
                  </View>
                  {pwBusy
                    ? <ActivityIndicator size="small" color="#a855f7" />
                    : <Ionicons name="chevron-forward" size={18} color="#4b5563" />}
                </TouchableOpacity>
              )}

              {pwStage === "sent" && (
                <View
                  className="rounded-2xl border border-white/[0.08] p-4 gap-4"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-white">
                      {hasPassword ? "Change Password" : "Set Password"}
                    </Text>
                    <TouchableOpacity onPress={() => setPwStage("idle")} disabled={pwBusy}>
                      <Text className="text-xs text-dim">Cancel</Text>
                    </TouchableOpacity>
                  </View>

                  <Text className="text-xs text-muted -mt-2">
                    Enter the 6-digit code sent to {email}.
                  </Text>

                  {/* OTP */}
                  <View
                    className="flex-row items-center rounded-[13px] border border-white/[0.12] gap-[10px] px-[14px] py-3"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                  >
                    <Ionicons name="keypad-outline" size={18} color="#6b7280" />
                    <TextInput
                      style={{ flex: 1, fontSize: 22, fontWeight: "700", letterSpacing: 8, textAlign: "center", color: "#fff", paddingVertical: 0 }}
                      placeholder="000000"
                      placeholderTextColor="#4b5563"
                      value={pwOtp}
                      onChangeText={(t) => setPwOtp(t.replace(/\D/g, "").slice(0, 6))}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!pwBusy}
                    />
                  </View>

                  {/* New password */}
                  <View
                    className="flex-row items-center rounded-[13px] border border-white/[0.12] gap-[10px] px-[14px] py-3"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                  >
                    <Ionicons name="lock-closed-outline" size={18} color="#6b7280" />
                    <TextInput
                      className="flex-1 text-base text-white"
                      style={{ paddingVertical: 0 }}
                      placeholder="New password (min 8 chars)"
                      placeholderTextColor="#4b5563"
                      value={pwNew}
                      onChangeText={setPwNew}
                      secureTextEntry={!showPw}
                      editable={!pwBusy}
                    />
                    <TouchableOpacity onPress={() => setShowPw((p) => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color="#6b7280" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={onSetPassword}
                    disabled={pwBusy || pwOtp.length !== 6 || pwNew.length < 8}
                    className="rounded-[13px] py-[13px] items-center"
                    style={{
                      backgroundColor: "rgba(168,85,247,0.9)",
                      opacity: pwBusy || pwOtp.length !== 6 || pwNew.length < 8 ? 0.55 : 1,
                    }}
                    activeOpacity={0.8}
                  >
                    {pwBusy
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text className="text-base font-bold text-white">
                          {hasPassword ? "Update Password" : "Set Password"}
                        </Text>}
                  </TouchableOpacity>

                  <TouchableOpacity onPress={onSendPwCode} disabled={pwBusy} className="items-center">
                    <Text className="text-xs text-dim">
                      Didn&apos;t get it?{" "}
                      <Text className="text-accent-purple font-semibold">Resend code</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
