/**
 * LedgerLink — ties a lent/borrowed amount to the money movement behind it:
 * pick the account it left/landed in (or "Cash"), and optionally link the
 * transaction that records it. Reference only — never mutates balances.
 *
 * Used by the lent (AssetForm) and borrow (Add Liability) forms for the initial
 * leg, and by the asset/liability detail "settle" flow for the return leg.
 */
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Chip } from "@/components/ui/Chip";
import { Sheet, SheetFlatList } from "@/components/ui/Sheet";
import { useAccountStore, accountLabel, CASH_ACCOUNT, type Account } from "@/store/accountStore";
import { useTransactionStore, type Transaction } from "@/store/transactionStore";
import { fmt } from "@/utils/formatters";

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

export function LedgerLink({
  label,
  accountId,
  txnId,
  onChange,
}: {
  label: string;
  accountId?: string;
  txnId?: string;
  onChange: (next: { accountId?: string; txnId?: string }) => void;
}) {
  const accounts = useAccountStore((s) => s.accounts);
  const linkedTx = useTransactionStore((s) => s.transactions.find((t) => t.id === txnId));
  const [picking, setPicking] = useState(false);

  const select = (id: string) => onChange({ accountId: accountId === id ? undefined : id, txnId });

  return (
    <View className="gap-[10px]">
      <Text className="text-xs font-bold text-secondary uppercase tracking-widest">
        {label} <Text className="text-dim">(optional)</Text>
      </Text>

      {/* Account chips: Cash + the user's accounts */}
      <View className="flex-row gap-2 flex-wrap">
        <Chip label="Cash" icon="cash-outline" selected={accountId === CASH_ACCOUNT} onPress={() => select(CASH_ACCOUNT)} />
        {accounts.map((a) => (
          <Chip key={a.id} label={accountLabel(a)} icon="card-outline" selected={accountId === a.id} onPress={() => select(a.id)} />
        ))}
      </View>

      {/* Linked transaction */}
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
          onPress={() => setPicking(true)}
          className="flex-row items-center gap-2 rounded-[12px] px-3 py-2.5 border border-white/10"
          style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
        >
          <Ionicons name="link-outline" size={15} color="#9ca3af" />
          <Text className="text-xs text-muted">Link a transaction</Text>
        </TouchableOpacity>
      )}

      <TxnPicker
        visible={picking}
        onClose={() => setPicking(false)}
        onPick={(id) => { onChange({ accountId, txnId: id }); setPicking(false); }}
      />
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
  visible, title, hint, label, confirmLabel, onClose, onConfirm,
}: {
  visible: boolean;
  title: string;
  hint: string;
  label: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (refs: { accountId?: string; txnId?: string }) => void;
}) {
  const [accountId, setAccountId] = useState<string | undefined>();
  const [txnId, setTxnId] = useState<string | undefined>();

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

        <LedgerLink
          label={label}
          accountId={accountId}
          txnId={txnId}
          onChange={({ accountId: a, txnId: t }) => { setAccountId(a); setTxnId(t); }}
        />

        <TouchableOpacity
          onPress={() => { onConfirm({ accountId, txnId }); setAccountId(undefined); setTxnId(undefined); }}
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

// ── Transaction picker modal ────────────────────────────────────────────────────
function TxnPicker({
  visible, onClose, onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const transactions = useTransactionStore((s) => s.transactions);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? transactions.filter((t) =>
          (t.merchant + " " + t.category + " " + t.amount).toLowerCase().includes(needle),
        )
      : transactions;
    return list.slice(0, 80); // ponytail: cap the list; add pagination if histories get huge
  }, [transactions, q]);

  return (
    <Sheet visible={visible} onClose={onClose} snapPoints={["80%"]} keyboardAware>
      {/* Header + search — fixed */}
      <View className="flex-row items-center justify-between px-xl pt-2 pb-2">
        <Text className="text-base font-bold text-white">Link a transaction</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={22} color="#9ca3af" />
        </TouchableOpacity>
      </View>
      <View className="px-xl pb-2">
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search by merchant or amount"
          placeholderTextColor="#374151"
          className="rounded-[12px] px-4 py-3 text-sm text-white border border-white/10"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        />
      </View>

      <SheetFlatList
        data={results}
        keyExtractor={(t) => t.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 24 }}
        ListEmptyComponent={
          <Text className="text-sm text-muted text-center py-8">No transactions found.</Text>
        }
        renderItem={({ item }) => {
          const sign = item.type === "Expense" ? "−" : item.type === "Income" ? "+" : "";
          const color = item.type === "Expense" ? "#f87171" : item.type === "Income" ? "#4ade80" : "#9ca3af";
          return (
            <TouchableOpacity
              onPress={() => onPick(item.id)}
              className="flex-row items-center gap-3 py-3"
              style={{ borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" }}
            >
              <View className="flex-1">
                <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                  {item.merchant || item.category || item.type}
                </Text>
                <Text className="text-xs text-dim">
                  {new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  {item.bank ? ` · ${item.bank}` : ""}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "700", color }}>{sign}{fmt(item.amount)}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </Sheet>
  );
}
