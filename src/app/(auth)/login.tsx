/**
 * Login screen — Sign In / Sign Up tabs + Forgot Password + Google.
 *
 * Stages:
 *   "auth"     Sign In tab: email + password  →  POST /auth/email/login   →  "otp"
 *              Sign Up tab: name + email + pw →  POST /auth/email/register →  "otp"
 *   "otp"      6-digit code (login OTP)       →  POST /auth/email/verify  →  session
 *   "forgot"   enter email                    →  POST /auth/email/forgot  →  "reset"
 *   "reset"    OTP + new password             →  POST /auth/email/reset   →  session
 *
 * Google (no OTP):
 *   GoogleSignin.signIn() → idToken → POST /auth/google → session
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Image,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";
import { apiError } from "@/utils/apiError";
import {
  emailLogin,
  emailRegister,
  verifyEmailOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  loginWithGoogle,
  finishLogin,
} from "@/services/auth";
import { S } from "@/constants/theme";

type Stage = "auth" | "otp" | "forgot" | "reset";
type AuthTab = "signin" | "signup";
type LoadingKey = "email" | "google" | "guest" | "otp" | "forgot" | "reset" | null;


GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

export default function LoginScreen() {
  // Navigation state
  const [stage, setStage] = useState<Stage>("auth");
  const [tab, setTab] = useState<AuthTab>("signin");
  const [loading, setLoading] = useState<LoadingKey>(null);

  // Sign-in fields
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siShowPass, setSiShowPass] = useState(false);

  // Sign-up fields
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suShowPass, setSuShowPass] = useState(false);

  // Shared across flows: the email that was submitted (used in OTP + reset stages)
  const [pendingEmail, setPendingEmail] = useState("");

  // OTP field
  const [otp, setOtp] = useState("");

  // Forgot / reset fields
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);

  const { continueAsGuest } = useAuthStore();
  const busy = loading !== null;

  // ── Floating logo ─────────────────────────────────────────────────────────
  const floatY = useSharedValue(0);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.9, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: 0.3,
  }));

  // ── Sign-in submit ────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    const email = siEmail.trim().toLowerCase();
    if (!email.includes("@")) { toast.error("Enter a valid email."); return; }
    if (siPassword.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setLoading("email");
    Keyboard.dismiss();
    try {
      await emailLogin(email, siPassword);
      setPendingEmail(email);
      setOtp("");
      setStage("otp");
      toast.success("Code sent — check your email.");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(null);
    }
  };

  // ── Sign-up submit ────────────────────────────────────────────────────────
  const handleSignUp = async () => {
    const name  = suName.trim();
    const email = suEmail.trim().toLowerCase();
    if (!name) { toast.error("Enter your name."); return; }
    if (!email.includes("@")) { toast.error("Enter a valid email."); return; }
    if (suPassword.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setLoading("email");
    Keyboard.dismiss();
    try {
      await emailRegister(name, email, suPassword);
      setPendingEmail(email);
      setOtp("");
      setStage("otp");
      toast.success("Account created! Check your email for the verification code.");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(null);
    }
  };

  // ── OTP verify ────────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length < 6) { toast.error("Enter the 6-digit code."); return; }
    setLoading("otp");
    Keyboard.dismiss();
    try {
      const result = await verifyEmailOtp(pendingEmail, otp);
      await finishLogin(result);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(null);
    }
  };

  const handleResendOtp = async () => {
    if (busy) return;
    try {
      await resendOtp(pendingEmail);
      toast.success("New code sent.");
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  // ── Forgot password ───────────────────────────────────────────────────────
  const handleForgot = async () => {
    const email = forgotEmail.trim().toLowerCase();
    if (!email.includes("@")) { toast.error("Enter a valid email."); return; }
    setLoading("forgot");
    Keyboard.dismiss();
    try {
      await forgotPassword(email);
      setPendingEmail(email);
      setResetOtp("");
      setNewPassword("");
      setStage("reset");
      toast.success("If that email is registered, a reset code has been sent.");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(null);
    }
  };

  // ── Reset password ────────────────────────────────────────────────────────
  const handleReset = async () => {
    if (resetOtp.length < 6) { toast.error("Enter the 6-digit reset code."); return; }
    if (newPassword.length < 8) { toast.error("New password must be at least 8 characters."); return; }
    setLoading("reset");
    Keyboard.dismiss();
    try {
      const result = await resetPassword(pendingEmail, resetOtp, newPassword);
      await finishLogin(result);
      toast.success("Password updated! You're now signed in.");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(null);
    }
  };

  // ── Google ────────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading("google");
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) return; // user cancelled
      const result = await loginWithGoogle(idToken);
      await finishLogin(result);
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && e.code === statusCodes.SIGN_IN_CANCELLED) return;
      toast.error(apiError(e));
    } finally {
      setLoading(null);
    }
  };

  // ── Guest ─────────────────────────────────────────────────────────────────
  const handleGuest = async () => {
    setLoading("guest");
    try {
      await continueAsGuest();
    } catch {
      toast.error("Could not start guest session.");
    } finally {
      setLoading(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Logo ─────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.duration(600).delay(80)} className="items-center mt-10 mb-4">
            <Animated.View
              style={[glowStyle, { position: "absolute", top: 0, width: 130, height: 130, borderRadius: 65, backgroundColor: "#a855f7" }]}
            />
            <Animated.View style={floatStyle}>
              <Image
                source={require("../../../assets/logo.png")}
                style={{ width: 80, height: 80, borderRadius: 22 }}
                resizeMode="contain"
              />
            </Animated.View>
            <Text style={{ fontSize: 30, fontWeight: "800", color: "#fff", letterSpacing: 0.3, marginTop: 14, marginBottom: 4 }}>
              Net<Text className="text-accent-purple">Worth</Text>
            </Text>
            <Text className="text-sm font-bold text-accent-purple tracking-widest mb-1">
              TRACK · ANALYZE · GROW
            </Text>
            <Text className="text-base text-muted text-center">
              Your complete financial operating system.
            </Text>
          </Animated.View>

          {/* ── Auth Card ─────────────────────────────────────── */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(380).springify()}
            className="w-full rounded-[22px] border border-white/[0.08] p-6 gap-4"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            {/* ── MAIN AUTH (sign-in / sign-up tabs) ──────────── */}
            {stage === "auth" && (
              <>
                {/* Tab switcher */}
                <Animated.View entering={FadeIn.duration(300).delay(420)} className="flex-row rounded-[13px] p-1" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                  {(["signin", "signup"] as AuthTab[]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setTab(t)}
                      disabled={busy}
                      className={`flex-1 py-2 rounded-[10px] items-center ${tab === t ? "bg-accent-purple" : ""}`}
                    >
                      <Text className={`text-sm font-bold ${tab === t ? "text-white" : "text-muted"}`}>
                        {t === "signin" ? "Sign In" : "Sign Up"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </Animated.View>

                {tab === "signin" ? (
                  /* ── Sign In ─────────────────────────────────── */
                  <Animated.View entering={FadeIn.duration(300)} className="gap-3">
                    <FieldRow icon="mail-outline" placeholder="your@email.com" value={siEmail}
                      onChangeText={setSiEmail} keyboardType="email-address" autoCapitalize="none"
                      autoCorrect={false} returnKeyType="next" editable={!busy} />

                    <PasswordRow placeholder="Password" value={siPassword} show={siShowPass}
                      onChangeText={setSiPassword} onToggle={() => setSiShowPass((p) => !p)}
                      returnKeyType="send" onSubmitEditing={handleSignIn} editable={!busy} />

                    <TouchableOpacity onPress={() => { setForgotEmail(siEmail); setStage("forgot"); }} disabled={busy} className="self-end">
                      <Text className="text-xs text-accent-purple font-semibold">Forgot password?</Text>
                    </TouchableOpacity>

                    <AuthButton icon={<Ionicons name="arrow-forward-outline" size={18} color="#fff" />}
                      label="Sign In" isLoading={loading === "email"} disabled={busy} primary onPress={handleSignIn} />
                  </Animated.View>
                ) : (
                  /* ── Sign Up ─────────────────────────────────── */
                  <Animated.View entering={FadeIn.duration(300)} className="gap-3">
                    <FieldRow icon="person-outline" placeholder="Your name" value={suName}
                      onChangeText={setSuName} autoCapitalize="words" returnKeyType="next" editable={!busy} />

                    <FieldRow icon="mail-outline" placeholder="your@email.com" value={suEmail}
                      onChangeText={setSuEmail} keyboardType="email-address" autoCapitalize="none"
                      autoCorrect={false} returnKeyType="next" editable={!busy} />

                    <PasswordRow placeholder="Password (min 8 chars)" value={suPassword} show={suShowPass}
                      onChangeText={setSuPassword} onToggle={() => setSuShowPass((p) => !p)}
                      returnKeyType="send" onSubmitEditing={handleSignUp} editable={!busy} />

                    <AuthButton icon={<Ionicons name="person-add-outline" size={18} color="#fff" />}
                      label="Create Account" isLoading={loading === "email"} disabled={busy} primary onPress={handleSignUp} />
                  </Animated.View>
                )}

                {/* Divider + Google */}
                <Animated.View entering={FadeIn.duration(300).delay(60)} className="flex-row items-center gap-3">
                  <View className="flex-1 h-px bg-white/[0.08]" />
                  <Text className="text-xs text-dim">or</Text>
                  <View className="flex-1 h-px bg-white/[0.08]" />
                </Animated.View>

                <Animated.View entering={FadeIn.duration(300).delay(80)}>
                  <AuthButton icon={<Ionicons name="logo-google" size={18} color="#9ca3af" />}
                    label="Continue with Google" isLoading={loading === "google"} disabled={busy} onPress={handleGoogle} />
                </Animated.View>

                {/* Guest */}
                <Animated.View entering={FadeIn.duration(300).delay(100)}>
                  <TouchableOpacity onPress={handleGuest} disabled={busy}
                    className="flex-row items-center justify-center gap-2 py-3 rounded-[13px] border border-white/[0.08]"
                    style={busy ? { opacity: 0.55 } : undefined} activeOpacity={0.75}>
                    <Ionicons name="person-outline" size={18} color="#6b7280" />
                    {loading === "guest"
                      ? <ActivityIndicator size="small" color="#6b7280" />
                      : <Text className="text-base text-muted font-semibold">Try as Guest</Text>}
                  </TouchableOpacity>
                  <Text className="text-xs text-dim text-center mt-1">No account needed · Data stored on device</Text>
                </Animated.View>

                <Text className="text-xs text-dim text-center" style={{ lineHeight: 17 }}>
                  By continuing you agree to our{" "}
                  <Text className="text-muted underline">Terms</Text> &amp;{" "}
                  <Text className="text-muted underline">Privacy Policy</Text>
                </Text>
              </>
            )}

            {/* ── OTP STAGE ─────────────────────────────────────── */}
            {stage === "otp" && (
              <>
                <BackButton onPress={() => { setStage("auth"); setOtp(""); }} disabled={busy} />

                <View className="items-center gap-1 mb-1">
                  <View className="w-12 h-12 rounded-full bg-accent-purple/[0.15] items-center justify-center mb-2">
                    <Ionicons name="mail-open-outline" size={24} color="#a855f7" />
                  </View>
                  <Text className="text-2xl font-bold text-white">Check your inbox</Text>
                  <Text className="text-base text-muted text-center" style={{ lineHeight: 20 }}>
                    We sent a 6-digit code to{"\n"}
                    <Text className="text-accent-purple font-bold">{pendingEmail}</Text>
                  </Text>
                </View>

                <OtpInput value={otp} onChangeText={setOtp} onSubmit={handleVerifyOtp} editable={!busy} />

                <AuthButton icon={<Ionicons name="checkmark-circle-outline" size={18} color="#fff" />}
                  label="Verify Code" isLoading={loading === "otp"} disabled={busy || otp.length < 6}
                  primary onPress={handleVerifyOtp} />

                <TouchableOpacity onPress={handleResendOtp} disabled={busy} className="items-center py-1">
                  <Text className="text-sm text-dim">
                    Didn&apos;t get it?{" "}
                    <Text className="text-accent-purple font-semibold">Resend code</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── FORGOT PASSWORD STAGE ─────────────────────────── */}
            {stage === "forgot" && (
              <>
                <BackButton onPress={() => setStage("auth")} disabled={busy} label="Back to sign in" />

                <View className="items-center gap-1 mb-1">
                  <View className="w-12 h-12 rounded-full bg-accent-purple/[0.15] items-center justify-center mb-2">
                    <Ionicons name="lock-open-outline" size={24} color="#a855f7" />
                  </View>
                  <Text className="text-2xl font-bold text-white">Reset password</Text>
                  <Text className="text-base text-muted text-center" style={{ lineHeight: 20 }}>
                    Enter your email and we&apos;ll send a reset code.
                  </Text>
                </View>

                <FieldRow icon="mail-outline" placeholder="your@email.com" value={forgotEmail}
                  onChangeText={setForgotEmail} keyboardType="email-address" autoCapitalize="none"
                  autoCorrect={false} returnKeyType="send" onSubmitEditing={handleForgot} editable={!busy} />

                <AuthButton icon={<Ionicons name="send-outline" size={18} color="#fff" />}
                  label="Send Reset Code" isLoading={loading === "forgot"} disabled={busy} primary onPress={handleForgot} />
              </>
            )}

            {/* ── RESET PASSWORD STAGE ──────────────────────────── */}
            {stage === "reset" && (
              <>
                <BackButton onPress={() => setStage("forgot")} disabled={busy} label="Back" />

                <View className="items-center gap-1 mb-1">
                  <View className="w-12 h-12 rounded-full bg-accent-purple/[0.15] items-center justify-center mb-2">
                    <Ionicons name="key-outline" size={24} color="#a855f7" />
                  </View>
                  <Text className="text-2xl font-bold text-white">New password</Text>
                  <Text className="text-base text-muted text-center" style={{ lineHeight: 20 }}>
                    Enter the reset code sent to{"\n"}
                    <Text className="text-accent-purple font-bold">{pendingEmail}</Text>
                  </Text>
                </View>

                <OtpInput value={resetOtp} onChangeText={setResetOtp} onSubmit={handleReset} editable={!busy} />

                <PasswordRow placeholder="New password (min 8 chars)" value={newPassword} show={showNewPass}
                  onChangeText={setNewPassword} onToggle={() => setShowNewPass((p) => !p)}
                  returnKeyType="send" onSubmitEditing={handleReset} editable={!busy} />

                <AuthButton icon={<Ionicons name="shield-checkmark-outline" size={18} color="#fff" />}
                  label="Set New Password" isLoading={loading === "reset"}
                  disabled={busy || resetOtp.length < 6 || newPassword.length < 8}
                  primary onPress={handleReset} />
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function BackButton({ onPress, disabled, label = "Back" }: { onPress: () => void; disabled: boolean; label?: string }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} className="flex-row items-center gap-1">
      <Ionicons name="chevron-back" size={16} color="#6b7280" />
      <Text className="text-sm text-muted font-semibold">{label}</Text>
    </TouchableOpacity>
  );
}

function FieldRow({ icon, ...props }: { icon: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="flex-row items-center rounded-[13px] border-[1.5px] border-white/[0.12] gap-[10px] px-[14px] py-3"
      style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
      <Ionicons name={icon as any} size={18} color="#6b7280" />
      <TextInput className="flex-1 text-base text-white" style={{ paddingVertical: 0 }}
        placeholderTextColor="#4b5563" {...props} />
    </View>
  );
}

function PasswordRow({
  placeholder, value, show, onChangeText, onToggle, ...rest
}: {
  placeholder: string;
  value: string;
  show: boolean;
  onChangeText: (t: string) => void;
  onToggle: () => void;
} & Omit<React.ComponentProps<typeof TextInput>, "value" | "onChangeText" | "placeholder">) {
  return (
    <View className="flex-row items-center rounded-[13px] border-[1.5px] border-white/[0.12] gap-[10px] px-[14px] py-3"
      style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
      <Ionicons name="lock-closed-outline" size={18} color="#6b7280" />
      <TextInput className="flex-1 text-base text-white" style={{ paddingVertical: 0 }}
        placeholder={placeholder} placeholderTextColor="#4b5563"
        value={value} onChangeText={onChangeText} secureTextEntry={!show} {...rest} />
      <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={18} color="#6b7280" />
      </TouchableOpacity>
    </View>
  );
}

function OtpInput({ value, onChangeText, onSubmit, editable }: {
  value: string;
  onChangeText: (t: string) => void;
  onSubmit: () => void;
  editable: boolean;
}) {
  return (
    <View className="flex-row items-center rounded-[13px] border-[1.5px] border-white/[0.12] gap-[10px] px-[14px] py-3"
      style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
      <Ionicons name="keypad-outline" size={18} color="#6b7280" />
      <TextInput
        style={{ flex: 1, fontSize: 24, fontWeight: "700", letterSpacing: 10, textAlign: "center", color: "#fff", paddingVertical: 0 }}
        placeholder="000000" placeholderTextColor="#4b5563"
        value={value} onChangeText={(t) => onChangeText(t.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad" returnKeyType="done" onSubmitEditing={onSubmit}
        editable={editable} maxLength={6} autoFocus />
    </View>
  );
}

function AuthButton({ icon, label, isLoading, disabled, primary = false, onPress }: {
  icon: React.ReactNode; label: string; isLoading: boolean;
  disabled: boolean; primary?: boolean; onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={pressStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 20, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 20, stiffness: 300 }); }}
        disabled={disabled} activeOpacity={1}
        className={`flex-row items-center rounded-[13px] border-[1.5px] py-[13px] px-4 gap-3 ${primary ? "bg-accent-purple border-accent-purple" : "border-white/[0.12]"} ${disabled ? "opacity-55" : ""}`}
        style={[!primary && { backgroundColor: "rgba(255,255,255,0.04)" }, primary && S.purpleSm]}
      >
        <View className="w-5 items-center">{icon}</View>
        {isLoading
          ? <ActivityIndicator size="small" color={primary ? "#fff" : "#9ca3af"} style={{ flex: 1 }} />
          : <Text className={`flex-1 text-base font-semibold ${primary ? "text-white" : "text-[#e5e7eb]"}`}>{label}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}
