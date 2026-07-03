/**
 * Add Liability form. Type-specific:
 *   • loan   → name (e.g. "Home Loan"), lender, outstanding, monthly EMI (opt)
 *   • emi    → name (e.g. "iPhone 15 EMI"), financier, monthly EMI, remaining amount
 *   • borrow → name (e.g. "Trip money"), lender (person), amount owed
 *
 * Credit-card dues are NOT added here — they're derived from the Cards screen
 * and shown read-only on the Liabilities list.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/ui/Button";
import { PersonField } from "@/components/ui/PersonField";
import { LedgerLink } from "@/components/ui/LedgerLink";
import { DateField } from "@/components/ui/DateField";
import { useLiabilityStore } from "@/store/liabilityStore";
import { toast } from "@/store/toastStore";
import { LIABILITY_TYPES, ADDABLE_LIABILITY_TYPES } from "./liabilities";

export default function AddLiabilityScreen() {
  const { id }          = useLocalSearchParams<{ id?: string }>();
  const addLiability    = useLiabilityStore((s) => s.addLiability);
  const updateLiability = useLiabilityStore((s) => s.updateLiability);
  const existing        = useLiabilityStore((s) => s.liabilities.find((l) => l.id === id));
  const isEdit          = !!existing;

  const [type, setType]       = useState<string>(existing?.type ?? "loan");
  const [name, setName]       = useState(existing?.name ?? "");
  const [lender, setLender]   = useState(existing?.lender ?? "");
  const [lenderPhone, setLenderPhone] = useState(existing?.phone ?? "");
  const [balance, setBalance] = useState(existing ? String(existing.balance) : "");
  const [emi, setEmi]         = useState(existing && existing.emi > 0 ? String(existing.emi) : "");
  const [fromAccountId, setFromAccountId] = useState(existing?.details?.fromAccountId);
  const [fromTxnId, setFromTxnId]         = useState(existing?.details?.fromTxnId);
  const [emiAccountId, setEmiAccountId]   = useState(existing?.details?.emiAccountId);
  const [emiTxnId, setEmiTxnId]           = useState(existing?.details?.emiTxnId);
  const [startDate, setStartDate]         = useState(existing?.startDate);
  const [period, setPeriod]               = useState(existing?.periodMonths ? String(existing.periodMonths) : "");
  const [saving, setSaving]   = useState(false);

  const isLoan   = type === "loan";
  const isEmi    = type === "emi";
  const isBorrow = type === "borrow";

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Please enter a name."); return; }
    if (isLoan || isBorrow) {
      if (!balance.trim()) { toast.error("Please enter the amount owed."); return; }
    } else {
      if (!emi.trim())     { toast.error("Please enter the monthly EMI."); return; }
      if (!balance.trim()) { toast.error("Please enter the remaining amount."); return; }
    }
    setSaving(true);
    // Ledger links live in `details`; merge over any existing so the
    // settle-captured "repaid from" leg survives an edit.
    const details = {
      ...(existing?.details ?? {}),
      fromAccountId, fromTxnId,
      emiAccountId, emiTxnId,
    };
    const payload = {
      type,
      name:    name.trim(),
      lender:  lender.trim(),
      phone:   isBorrow ? lenderPhone.trim() : "",
      balance: parseFloat(balance) || 0,
      emi:     parseFloat(emi) || 0,
      details,
      startDate,
      periodMonths: parseInt(period, 10) || undefined,
    };
    if (isEdit) {
      updateLiability(existing.id, payload);
      toast.success("Liability updated.");
    } else {
      await addLiability(payload);
      toast.success("Liability added.");
    }
    setSaving(false);
    router.back();
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-cosmic-darker">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-xl pt-3 pb-[14px]">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-[38px] h-[38px] rounded-[11px] border border-white/[0.08] items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color="#9ca3af" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white">{isEdit ? "Edit Liability" : "Add Liability"}</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-5">
            {/* Type picker — only manually-addable types */}
            <View className="gap-[10px]">
              <Text className="text-xs font-bold text-secondary uppercase tracking-widest">Type</Text>
              <View className="flex-row gap-2 flex-wrap">
                {ADDABLE_LIABILITY_TYPES.map((key) => {
                  const meta = LIABILITY_TYPES[key];
                  const active = type === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setType(key)}
                      className="flex-row items-center gap-1.5 px-3 py-2 rounded-full border"
                      style={{
                        borderColor: active ? "#f87171" : "rgba(255,255,255,0.1)",
                        backgroundColor: active ? "rgba(248,113,113,0.12)" : "rgba(255,255,255,0.04)",
                      }}
                    >
                      <Ionicons name={meta.icon} size={15} color={active ? "#f87171" : "#9ca3af"} />
                      <Text className="text-xs font-semibold" style={{ color: active ? "#f87171" : "#9ca3af" }}>
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Name */}
            <Field
              label={isBorrow ? "Borrowed For" : isLoan ? "Loan Name" : "EMI For"}
              value={name}
              onChange={setName}
              placeholder={isBorrow ? "e.g., Trip money" : isLoan ? "e.g., Home Loan" : "e.g., iPhone 15 EMI"}
            />

            {/* Lender — a person (borrow) gets name + mobile via contacts; an
                institution (loan/EMI) is just a name. */}
            {isBorrow ? (
              <PersonField
                label="Lender"
                optional
                name={lender}
                phone={lenderPhone}
                onChangeName={setLender}
                onChangePhone={setLenderPhone}
                namePlaceholder="e.g., Raj Sharma"
              />
            ) : (
              <Field
                label={isLoan ? "Lender" : "Financier"}
                optional
                value={lender}
                onChange={setLender}
                placeholder={isLoan ? "e.g., HDFC Bank" : "e.g., Bajaj Finserv"}
              />
            )}

            {isBorrow ? (
              <Field label="Amount Owed" value={balance} onChange={(v) => setBalance(v.replace(/[^0-9.]/g, ""))} placeholder="0.00" money />
            ) : isLoan ? (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Field label="Outstanding" value={balance} onChange={(v) => setBalance(v.replace(/[^0-9.]/g, ""))} placeholder="0.00" money />
                </View>
                <View className="flex-1">
                  <Field label="Monthly EMI" optional value={emi} onChange={(v) => setEmi(v.replace(/[^0-9.]/g, ""))} placeholder="0.00" money />
                </View>
              </View>
            ) : (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Field label="Monthly EMI" value={emi} onChange={(v) => setEmi(v.replace(/[^0-9.]/g, ""))} placeholder="0.00" money />
                </View>
                <View className="flex-1">
                  <Field label="Remaining" value={balance} onChange={(v) => setBalance(v.replace(/[^0-9.]/g, ""))} placeholder="0.00" money />
                </View>
              </View>
            )}

            {/* Where the money landed: borrow received / loan credited. */}
            {(isBorrow || isLoan) && (
              <LedgerLink
                label={isBorrow ? "Received in" : "Credited to"}
                accountId={fromAccountId}
                txnId={fromTxnId}
                amount={parseFloat(balance) || 0}
                onChange={({ accountId, txnId }) => { setFromAccountId(accountId); setFromTxnId(txnId); }}
              />
            )}

            {/* Which account the EMI is paid from (loan / EMI). */}
            {(isLoan || isEmi) && (
              <LedgerLink
                label="EMI paid from"
                accountId={emiAccountId}
                txnId={emiTxnId}
                amount={parseFloat(emi) || 0}
                onChange={({ accountId, txnId }) => { setEmiAccountId(accountId); setEmiTxnId(txnId); }}
              />
            )}

            {/* Start date + tenure */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <DateField label="Start date" value={startDate} onChange={setStartDate} />
              </View>
              <View className="flex-1">
                <Field label="Period (months)" optional value={period} onChange={(v) => setPeriod(v.replace(/[^0-9]/g, ""))} placeholder="e.g., 36" />
              </View>
            </View>
          </View>
        </ScrollView>

        <View
          className="px-xl pt-3 pb-2"
          style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" }}
        >
          <Button
            label={saving ? "Saving…" : isEdit ? "Update Liability" : "Save Liability"}
            onPress={handleSave}
            isLoading={saving}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label, value, onChange, placeholder, optional, money,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  optional?: boolean;
  money?: boolean;
}) {
  return (
    <View className="gap-[10px]">
      <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
        {label} {optional && <Text className="text-dim">(optional)</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#374151"
        keyboardType={money ? "decimal-pad" : "default"}
        className="rounded-[12px] px-4 py-[14px] text-base text-white border border-white/10"
        style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
      />
    </View>
  );
}
