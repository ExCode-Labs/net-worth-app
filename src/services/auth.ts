import { apiPost, apiEnabled } from "@/services/api";
import type { MeDto } from "@/services/backend";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";

export interface SessionResult {
  accessToken:  string;
  refreshToken: string;
  user: MeDto;
}

function requireApi() {
  if (!apiEnabled) throw new Error("Backend not configured (EXPO_PUBLIC_API_URL).");
}

// ── Sign-in ───────────────────────────────────────────────────────────────────

export async function emailLogin(email: string, password: string): Promise<void> {
  requireApi();
  await apiPost("/auth/email/login", { email, password });
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
    guestName: user.firstName ?? user.fullName ?? store.guestName,
    phone:     user.phone ?? store.phone,
    firstName: user.firstName,
    lastName:  user.lastName,
    fullName:  user.fullName,
    email:     user.email,
    avatarUrl: user.avatarUrl,
  });
}
