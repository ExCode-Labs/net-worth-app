/**
 * LedgerLink — ties a lent/borrowed amount to the money movement behind it:
 * pick the account it left/landed in (or "Cash"), and optionally link the
 * transaction that records it. Reference only — never mutates balances.
 *
 * Used by the lent (AssetForm) and borrow (Add Liability) forms for the initial
 * leg, and by the asset/liability detail "settle" flow for the return leg.
 */
import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { DateField } from "@/components/ui/DateField";
import { useAccountStore, accountLabel, findMatchingAccount, CASH_ACCOUNT, type Account } from "@/store/accountStore";
import { useTransactionStore, type Transaction } from "@/store/transactionStore";
import { usePickTxnStore } from "@/store/pickTxnStore";
import { fmt, fmtDate } from "@/utils/formatters";
import { useAmountVisibilitySync } from "@/store/prefsStore";

/** Human label for a stored account ref ("cash" / account id / unset). */
export function accountRefLabel(accounts: Account[], accountId?: string): string {
  if (!accountId) return "—";
  if (accountId === CASH_ACCOUNT) return "Cash";
  const a = accounts.find((x) => x.id === accountId);
  return a ? accountLabel(a) : "Account removed";
}

/** One-line label for a linked transaction. */
export function txnRefLabel(tx?: Transaction): string {
  if (!tx) return "—";
  const sign = tx.type === "Expense" ? "−" : tx.type === "Income" ? "+" : "";
  return `${sign}${fmt(tx.amount)} · ${tx.merchant || tx.category || tx.type}`;
}

/** Date + time of a linked transaction, for its own row (kept separate from the
 * amount/merchant line so the card doesn't cram two facts into one row). */
export function txnDateLabel(tx?: Transaction): string | undefined {
  if (!tx) return undefined;
  const when = new Date(tx.date);
  const time = when.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${fmtDate(when)}, ${time}`;
}

export function LedgerLink({
  label,
  accountId,
  txnId,
  amount,
  onChange,
}: {
  label: string;
  accountId?: string;
  txnId?: string;
  /** Amount the linked txn should match — drives the picker's mismatch prompt. */
  amount?: number;
  /** `txn` is passed only when a transaction was just picked, so callers can
   * auto-fill fields (amount, date) from it without re-deriving the lookup. */
  onChange: (next: { accountId?: string; txnId?: string; txn?: Transaction }) => void;
}) {
  useAmountVisibilitySync();
  const accounts = useAccountStore((s) => s.accounts);
  const transactions = useTransactionStore((s) => s.transactions);
  const linkedTx = transactions.find((t) => t.id === txnId);

  const select = (id: string) => onChange({ accountId: accountId === id ? undefined : id, txnId });

  // Open the full-screen picker; it delivers the choice back through the store so
  // this component (still mounted under the pushed screen) applies it. The picked
  // transaction's own account takes over the account chip — it's the bank the
  // money actually moved through. Only manual txns carry `accountId` directly;
  // notification-parsed ones (the common case) only have bank name + last-4, so
  // fall back to the same bank/last-4 matcher used to detect orphan txns.
  const resolveAccountId = (t: Transaction) => {
    if (t.accountId) return t.accountId;
    const last4 = t.account.replace(/\D/g, "").slice(-4);
    return findMatchingAccount(accounts, t.bank, last4)?.id;
  };

  const openPicker = () => {
    usePickTxnStore.getState().request(amount ?? null, (id) => {
      const txn = transactions.find((t) => t.id === id);
      onChange({ accountId: (txn && resolveAccountId(txn)) ?? accountId, txnId: id, txn });
    });
    router.push("/pick-transaction");
  };

  return (
    <View className="gap-[10px]">
      <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
        {label} <Text className="text-dim">(optional)</Text>
      </Text>

      {/* Linked transaction — first, since picking one drives the account chip below. */}
      {linkedTx ? (
        <View
          className="flex-row items-center gap-2 rounded-[12px] px-3 py-2.5 border border-accent-purple/30"
          style={{ backgroundColor: "rgba(168,85,247,0.1)" }}
        >
          <Ionicons name="link" size={15} color="#a855f7" />
          <Text className="flex-1 text-xs text-white" numberOfLines={1}>{txnRefLabel(linkedTx)}</Text>
          <TouchableOpacity onPress={() => onChange({ accountId, txnId: undefined })} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={openPicker}
          className="flex-row items-center gap-2 rounded-[12px] px-3 py-2.5 border border-white/10"
          style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
        >
          <Ionicons name="link-outline" size={15} color="#9ca3af" />
          <Text className="text-xs text-muted">Link a transaction</Text>
        </TouchableOpacity>
      )}

      {/* Account chips: Cash + the user's accounts — auto-selected from the txn above. */}
      <View className="flex-row gap-2 flex-wrap">
        <Chip label="Cash" icon="cash-outline" selected={accountId === CASH_ACCOUNT} onPress={() => select(CASH_ACCOUNT)} />
        {accounts.map((a) => (
          <Chip key={a.id} label={accountLabel(a)} icon="card-outline" selected={accountId === a.id} onPress={() => select(a.id)} />
        ))}
      </View>
    </View>
  );
}

// ── Settle sheet ────────────────────────────────────────────────────────────────
/**
 * Bottom sheet shown when marking a lent/borrowed amount as returned/repaid:
 * captures the "to" leg (which account it came back into / was repaid from, plus
 * an optional transaction link) before closing it.
 */
export function SettleSheet({
  visible, title, hint, label, confirmLabel, amount, onClose, onConfirm,
}: {
  visible: boolean;
  title: string;
  hint: string;
  label: string;
  confirmLabel: string;
  /** Amount being settled — passed to the picker for amount matching. */
  amount?: number;
  onClose: () => void;
  onConfirm: (refs: { accountId?: string; txnId?: string; date?: string }) => void;
}) {
  const [accountId, setAccountId] = useState<string | undefined>();
  const [txnId, setTxnId] = useState<string | undefined>();
  const [date, setDate] = useState<string | undefined>();

  const reset = () => { setAccountId(undefined); setTxnId(undefined); setDate(undefined); };

  return (
    <Sheet visible={visible} onClose={onClose} keyboardAware>
      <View className="px-xl pt-2 pb-7">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-base font-bold text-white">{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color="#9ca3af" />
          </TouchableOpacity>
        </View>
        <Text className="text-xs text-muted mb-4">{hint}</Text>

        <View className="gap-4">
          <LedgerLink
            label={label}
            accountId={accountId}
            txnId={txnId}
            amount={amount}
            onChange={({ accountId: a, txnId: t, txn }) => {
              setAccountId(a);
              setTxnId(t);
              if (txn && !date) setDate(txn.date);
            }}
          />
          <DateField label="Date" value={date} onChange={setDate} />
        </View>

        <TouchableOpacity
          onPress={() => { onConfirm({ accountId, txnId, date }); reset(); }}
          className="flex-row items-center justify-center gap-2 rounded-[14px] py-3.5 mt-5 bg-accent-green"
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle" size={18} color="#0a0e27" />
          <Text className="text-[15px] font-bold" style={{ color: "#0a0e27" }}>{confirmLabel}</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
}

