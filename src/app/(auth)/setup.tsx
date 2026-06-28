import React, { useState, useRef, useEffect, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInRight,
  FadeInLeft,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { router } from "expo-router";
import PhoneInput, {
  isValidPhoneNumber,
  type ICountry,
} from "react-native-international-phone-number";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { useAccountStore } from "@/store/accountStore";
import { pushAllLocal } from "@/services/sync";
import { toast } from "@/store/toastStore";
import CurrencyStep from "@/components/onboarding/CurrencyStep";
import AccountStep from "@/components/onboarding/AccountStep";
import AssetForm, {
  EMPTY_ASSET_DRAFT,
  buildAsset,
} from "@/components/assets/AssetForm";
import SuccessStep from "@/components/onboarding/SuccessStep";
import { Button } from "@/components/ui/Button";

const TOTAL = 4;

// ── Animated dot ──────────────────────────────────────────────────────────────
const StepDot = memo(function StepDot({
  index,
  currentStep,
}: {
  index: number;
  currentStep: number;
}) {
  const w = useSharedValue(index === 0 ? 22 : 8);

  useEffect(() => {
    w.value = withSpring(index + 1 === currentStep ? 22 : 8, {
      damping: 18,
      stiffness: 220,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const dotAnim = useAnimatedStyle(() => ({ width: w.value }));

  return (
    <Animated.View
      style={[
        { height: 8, borderRadius: 4 },
        index + 1 <= currentStep
          ? { backgroundColor: "#a855f7" }
          : { backgroundColor: "rgba(255,255,255,0.12)" },
        dotAnim,
      ]}
    />
  );
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function SetupScreen() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [guestName, setGuestName] = useState("");

  const { completeOnboarding, isGuest } = useAuthStore();
  const { setName, setPhone, phone: savedPhone } = useUserStore();
  const { setCurrency: saveCurrency, addAccount, addAsset } = useAccountStore();

  // Phone: the library manages the national-number portion (`phone`) and the
  // selected country separately. We store the full international number
  // (calling code + national) so contact discovery can normalize it server-side.
  const [phone, setPhoneLocal] = useState(savedPhone ?? "");
  const [country, setCountry] = useState<ICountry | null>(null);
  const phoneValid = !!country && isValidPhoneNumber(phone, country);
  // Calling code = idd.root (+ the lone suffix where a country has exactly one).
  const callingCode = country
    ? `${country.idd.root}${country.idd.suffixes?.length === 1 ? country.idd.suffixes[0] : ""}`
    : "";
  const fullPhone = country ? `${callingCode} ${phone}`.trim() : phone.trim();

  const [currency, setCurrency] = useState("INR");
  const [account, setAccount] = useState({
    type: "bank",
    bank: "",
    nickname: "",
    accountNumber: "",
    ifsc: "",
    branch: "",
    balance: "",
  });
  const [asset, setAsset] = useState(EMPTY_ASSET_DRAFT);
  const builtAsset = buildAsset(asset);

  // ── Progress bar ─────────────────────────────────────────────────────────
  const trackWidth = useRef(0);
  const fillPx = useSharedValue(0);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
    fillPx.value = (step / TOTAL) * trackWidth.current;
  };

  useEffect(() => {
    if (trackWidth.current === 0) return;
    fillPx.value = withTiming((step / TOTAL) * trackWidth.current, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const fillStyle = useAnimatedStyle(() => ({ width: fillPx.value }));

  // ── Navigation ────────────────────────────────────────────────────────────
  const persistGuestName = () => {
    if (isGuest && guestName.trim()) setName(guestName.trim());
  };

  // Step 1 requires a phone number (mandatory, used for sharing). Returns false
  // and shows an error when it's missing/invalid.
  const commitStep1 = () => {
    if (!phoneValid) {
      toast.error("Please enter a valid phone number.");
      return false;
    }
    persistGuestName();
    setPhone(fullPhone);
    return true;
  };

  const handleNext = async () => {
    if (step === 1 && !commitStep1()) return;
    if (step === 2 && (!account.bank.trim() || !account.balance.trim())) {
      toast.error("Please fill in bank name and balance.");
      return;
    }
    if (step === 3 && !builtAsset.valid) {
      toast.error("Please complete the asset details.");
      return;
    }
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 280));
    if (step < TOTAL) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      // Persist setup data to accountStore
      saveCurrency(currency);
      if (account.bank.trim() && account.balance.trim()) {
        addAccount({
          type: account.type,
          bank: account.bank.trim(),
          nickname: account.nickname.trim() || account.bank.trim(),
          accountName: account.nickname.trim() || undefined,
          accountNumber: account.accountNumber.trim() || undefined,
          ifsc: account.ifsc.trim() || undefined,
          branch: account.branch.trim() || undefined,
          balance: parseFloat(account.balance) || 0,
        });
      }
      if (builtAsset.valid) {
        addAsset({
          type: asset.type,
          name: builtAsset.name,
          value: builtAsset.value,
          details: builtAsset.details,
          startDate: builtAsset.startDate,
          periodMonths: builtAsset.periodMonths,
        });
      }
      pushAllLocal(); // flush all entered data to the backend
      await completeOnboarding(); // marks user onboarded (local + server)
      toast.success("All set! Your dashboard is ready.");
      router.replace("/(tabs)");
    }
    setIsLoading(false);
  };

  const handleBack = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  // Skip current step only → advance to next
  const handleSkipStep = () => {
    if (step === 1 && !commitStep1()) return; // phone is mandatory
    setDirection(1);
    if (step < TOTAL) setStep((s) => s + 1);
  };

  // Skip ALL remaining steps → go straight to dashboard
  const handleSkipAll = async () => {
    if (step === 1 && !commitStep1()) return; // phone is mandatory
    // Save whatever has been filled so far
    setCurrency(currency);
    if (account.bank.trim() && account.balance.trim()) {
      addAccount({
        type: account.type,
        bank: account.bank.trim(),
        nickname: account.nickname.trim() || account.bank.trim(),
        balance: parseFloat(account.balance) || 0,
      });
    }
    if (builtAsset.valid) {
      addAsset({
        type: asset.type,
        name: builtAsset.name,
        value: builtAsset.value,
        details: builtAsset.details,
      });
    }
    pushAllLocal();
    await completeOnboarding();
    router.replace("/(tabs)");
  };

  const skipStepLabel =
    step === 1
      ? "Set currency later"
      : step === 2
        ? "Add account later"
        : "Add assets later";

  // ── Step content ──────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <View className="gap-[10px] mb-6">
              <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
                Phone Number
              </Text>
              <PhoneInput
                value={phone}
                onChangePhoneNumber={setPhoneLocal}
                selectedCountry={country}
                onChangeSelectedCountry={setCountry}
                defaultCountry="IN"
                placeholder="98765 43210"
                phoneInputPlaceholderTextColor="#374151"
                modalType="bottomSheet"
                initialBottomsheetHeight="75%"
                maxBottomsheetHeight="90%"
                theme="dark"
                phoneInputStyles={{
                  container: {
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                    borderRadius: 12,
                  },
                  flagContainer: {
                    backgroundColor: "transparent",
                    borderTopLeftRadius: 12,
                    borderBottomLeftRadius: 12,
                  },
                  callingCode: { color: "#fff" },
                  input: { color: "#fff" },
                }}
              />
              <Text className="text-[11px] text-dim">
                Required — lets friends find you to share balances & more. Never
                shown publicly.
              </Text>
            </View>
            <CurrencyStep
              selected={currency}
              onSelect={setCurrency}
              guestName={isGuest ? guestName : undefined}
              onGuestNameChange={isGuest ? setGuestName : undefined}
            />
          </>
        );
      case 2:
        return <AccountStep account={account} onAccountChange={setAccount} />;
      case 3:
        return (
          <View className="gap-[22px]">
            <View className="gap-1">
              <Text className="text-[26px] font-extrabold text-white">
                Add Your First Asset
              </Text>
              <Text className="text-base text-muted">
                Start tracking your investments &amp; wealth
              </Text>
            </View>
            <AssetForm draft={asset} onChange={setAsset} />
          </View>
        );
      case 4:
        return (
          <SuccessStep
            currency={currency}
            account={{
              type: account.type,
              bank: account.bank,
              balance: account.balance,
            }}
            asset={{
              type: asset.type,
              name: builtAsset.name,
              value: String(builtAsset.value),
            }}
          />
        );
      default:
        return null;
    }
  };

  const nextLabel =
    step === 1 ? "Set Currency" : step === 4 ? "Go to Dashboard" : "Continue";

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        // Android already resizes the window for the keyboard (Expo
        // softwareKeyboardLayoutMode: "resize"); using "height" on top of that
        // double-adjusts and leaves residual space after an open/close cycle.
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View className="px-xl pt-3 pb-[14px] gap-3">
          <View className="flex-row items-center justify-between">
            {/* Back button — hidden on step 1 via invisible spacer */}
            {step > 1 ? (
              <TouchableOpacity
                onPress={handleBack}
                className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
                style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={22} color="#9ca3af" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 38, height: 38 }} />
            )}

            <View className="items-center">
              <Text className="text-lg font-bold text-white">Quick Setup</Text>
              <Text className="text-xs text-dim font-semibold uppercase tracking-widest mt-0.5">
                Step {step} of {TOTAL}
              </Text>
            </View>

            {step < TOTAL ? (
              <TouchableOpacity
                onPress={handleSkipAll}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text
                  className="text-sm text-accent-purple font-semibold"
                  style={{ width: 46, textAlign: "right" }}
                >
                  Skip all
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 46 }} />
            )}
          </View>

          {/* Progress bar */}
          <View
            className="h-[3px] rounded-[2px] overflow-hidden"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            onLayout={onTrackLayout}
          >
            <Animated.View
              style={[
                fillStyle,
                { height: 3, backgroundColor: "#a855f7", borderRadius: 2 },
              ]}
            />
          </View>
        </View>

        {/* ── Step content ────────────────────────────────────── */}
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            key={`step-${step}`}
            entering={
              direction > 0
                ? FadeInRight.duration(320).easing(Easing.out(Easing.cubic))
                : FadeInLeft.duration(320).easing(Easing.out(Easing.cubic))
            }
            className="px-xl pt-1 pb-4 flex-1"
          >
            {renderStep()}
          </Animated.View>
        </ScrollView>

        {/* ── Bottom bar: dots + CTA ───────────────────────────── */}
        <Animated.View
          entering={FadeIn.duration(400)}
          className="px-xl pt-2 gap-2 mt-auto"
          style={{
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.06)",
          }}
        >
          {/* Dots centered */}
          <View className="flex-row gap-1.5 items-center justify-center">
            {Array.from({ length: TOTAL }, (_, i) => (
              <StepDot key={i} index={i} currentStep={step} />
            ))}
          </View>

          <Button
            label={isLoading ? "Just a sec…" : nextLabel}
            onPress={handleNext}
            isLoading={isLoading}
          />

          {step < TOTAL && (
            <TouchableOpacity
              onPress={handleSkipStep}
              className="items-center py-0.5"
            >
              <Text className="text-sm text-dim font-semibold">
                {skipStepLabel}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
