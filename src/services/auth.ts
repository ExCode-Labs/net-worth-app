import { apiGet, apiPost, apiDelete, apiEnabled } from "@/services/api";
import type { MeDto } from "@/services/backend";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";

export interface SessionResult {
  accessToken:  string;
  refreshToken: string;
  user: MeDto;
}

export interface DeviceSession {
  id:         string;
  device:     string | null;
  ipAddress:  string | null;
  location:   string | null;
  createdAt:  string;
  lastUsedAt: string;
  current:    boolean;
}

function requireApi() {
  if (!apiEnabled) throw new Error("Backend not configured (EXPO_PUBLIC_API_URL).");
}

// ── Sign-in ───────────────────────────────────────────────────────────────────

export async function emailLogin(
  email: string,
  password: string,
): Promise<SessionResult | { twoFactor: true }> {
  requireApi();
  return apiPost<SessionResult | { twoFactor: true }>("/auth/email/login", { email, password });
}

// ── Sign-up ───────────────────────────────────────────────────────────────────

export async function emailRegister(
  firstName: string,
  email: string,
  password: string,
): Promise<void> {
  requireApi();
  await apiPost("/auth/email/register", { firstName, email, password });
}

// ── OTP ───────────────────────────────────────────────────────────────────────

export async function verifyEmailOtp(email: string, otp: string): Promise<SessionResult> {
  requireApi();
  return apiPost<SessionResult>("/auth/email/verify", { email, otp });
}

export async function resendOtp(email: string): Promise<void> {
  requireApi();
  await apiPost("/auth/email/resend", { email });
}

// ── Forgot / reset password ───────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<void> {
  requireApi();
  await apiPost("/auth/email/forgot", { email });
}

export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string,
): Promise<SessionResult> {
  requireApi();
  return apiPost<SessionResult>("/auth/email/reset", { email, otp, newPassword });
}

// ── Google ────────────────────────────────────────────────────────────────────

export async function loginWithGoogle(idToken: string): Promise<SessionResult> {
  requireApi();
  return apiPost<SessionResult>("/auth/google", { idToken });
}

// ── Finalise any successful login/register/reset ──────────────────────────────

export async function finishLogin(result: SessionResult): Promise<void> {
  await useAuthStore.getState().setSession(result.accessToken, result.refreshToken);
  const { user } = result;
  const store = useUserStore.getState();
  useUserStore.setState({
    guestName:        user.firstName ?? user.fullName ?? store.guestName,
    phone:            user.phone ?? store.phone,
    firstName:        user.firstName,
    lastName:         user.lastName,
    fullName:         user.fullName,
    email:            user.email,
    avatarUrl:        user.avatarUrl,
    hasPassword:      user.hasPassword ?? false,
    twoFactorEnabled: user.twoFactorEnabled ?? false,
  });
}

// ── Active sessions / devices ─────────────────────────────────────────────────

/** List the user's active login sessions (devices). */
export async function listSessions(): Promise<DeviceSession[]> {
  requireApi();
  return apiGet<DeviceSession[]>("/auth/sessions");
}

/** Revoke (sign out) a specific session by id. */
export async function revokeSession(id: string): Promise<void> {
  requireApi();
  await apiDelete(`/auth/sessions/${id}`);
}

/** Sign out the current device (revokes this session server-side). */
export async function logout(): Promise<void> {
  if (!apiEnabled) return;
  try {
    await apiPost("/auth/logout", {});
  } catch {
    // best-effort — local sign-out proceeds regardless
  }
}

/** Sign out everywhere (revokes all sessions for the user). */
export async function logoutAll(): Promise<void> {
  requireApi();
  await apiPost("/auth/logout-all", {});
}
