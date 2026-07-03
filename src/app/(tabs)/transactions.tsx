import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import MonthCalendar, { dayKey, type DayTotal } from "@/components/transactions/MonthCalendar";
import { Chip } from "@/components/ui/Chip";
import { useTransactionStore, type Transaction } from "@/store/transactionStore";
import { CATEGORIES, type TxType } from "@/constants/categories";
import { confirm } from "@/store/confirmStore";
import { toast } from "@/store/toastStore";
import { useAccountStore, isOrphanTransaction } from "@/store/accountStore";
import { useCardStore, isOrphanCardTransaction } from "@/store/cardStore";
import {
  notificationListenerAvailable,
  getNotificationAccessStatus,
  requestNotificationAccess,
} from "@/services/notificationListener";
import { fmt } from "@/utils/formatters";
import { useAmountVisibilitySync } from "@/store/prefsStore";

type Filter = "All" | "Expense" | "Income" | "Transfer";
const FILTERS: Filter[] = ["All", "Expense", "Income", "Transfer"];

/** Icon for a transaction's category, falling back to a generic receipt when the
 * category isn't one of the known ones (e.g. renamed/removed since it was saved). */
function categoryIcon(type: TxType, category: string): React.ComponentProps<typeof Ionicons>["name"] {
  return CATEGORIES[type]?.find((c) => c.name === category)?.icon ?? "receipt-outline";
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function TransactionsScreen() {
  useAmountVisibilitySync();
  const [filter,      setFilter]      = useState<Filter>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [search,      setSearch]      = useState("");
  const [filterOpen,  setFilterOpen]  = useState(false);
  const [mode,        setMode]        = useState<"list" | "calendar">("list");
  const [calMonth,    setCalMonth]    = useState<Date>(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [accessGranted, setAccessGranted] = useState(true);

  useEffect(() => {
    if (!notificationListenerAvailable) return;
    let active = true;
    getNotificationAccessStatus().then((status) => {
      if (active) setAccessGranted(status === "authorized");
    });
    return () => { active = false; };
  }, []);

  const { transactions } = useTransactionStore();
  const accounts = useAccountStore((s) => s.accounts);
  const cards = useCardStore((s) => s.cards);

  const hasReal = transactions.length > 0;

  const { linked, orphanAccounts, orphanCards } = useMemo(() => {
    const confirmed = transactions.filter((t) => t.status === "confirmed");
    const linked: typeof confirmed = [];
    const orphanAccounts: typeof confirmed = [];
    const orphanCards: typeof confirmed = [];
    for (const t of confirmed) {
      if (t.account.startsWith("Card ")) {
        (isOrphanCardTransaction(cards, t) ? orphanCards : linked).push(t);
      } else {
        (isOrphanTransaction(accounts, t) ? orphanAccounts : linked).push(t);
      }
    }
    return { linked, orphanAccounts, orphanCards };
  }, [transactions, accounts, cards]);

  const { missingAccounts, missingCards } = useMemo(() => {
    const distinctTargets = (rows: typeof orphanAccounts) =>
      Array.from(
        new Map(
          rows.map((t) => {
            const last4 = t.account.replace(/\D/g, "").slice(-4);
            return [`${t.bank}|${last4}`, { bank: t.bank || "Unknown bank", last4 }];
          }),
        ).values(),
      );
    return { missingAccounts: distinctTargets(orphanAccounts), missingCards: distinctTargets(orphanCards) };
  }, [orphanAccounts, orphanCards]);

  const displayList = useMemo(() => linked.map((t) => ({
    id:     t.id,
    icon:   categoryIcon(t.type, t.category),
    name:   t.merchant,
    cat:    t.category,
    note:   t.note,
    amount: t.type === "Expense" ? -t.amount : t.amount,
    iso:    t.date,
    time:   new Date(t.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    date:   new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
    type:   t.type,
  })), [linked]);

  const categoriesUsed = useMemo(() => {
    const inType = displayList.filter((t) => filter === "All" || t.type === filter);
    return Array.from(new Set(inType.map((t) => t.cat))).filter(Boolean).sort();
  }, [displayList, filter]);

  const filtered = useMemo(() => displayList.filter(
    (t) =>
      (filter === "All" || t.type === filter) &&
      (categoryFilter === "All" || t.cat === categoryFilter) &&
      (!search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.cat.toLowerCase().includes(search.toLowerCase()) ||
        String(Math.abs(t.amount)).includes(search)),
  ), [displayList, filter, categoryFilter, search]);

  const { groups, totalExpense, totalIncome, dayTotals } = useMemo(() => {
    const spend = filtered.filter((t) => t.type !== "Transfer");
    const totalExpense = spend.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalIncome  = spend.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach((t) => { (groups[t.date] ??= []).push(t); });
    const dayTotals = new Map<string, DayTotal>();
    spend.forEach((t) => {
      const k   = dayKey(new Date(t.iso));
      const cur = dayTotals.get(k) ?? { income: 0, expense: 0 };
      if (t.amount < 0) cur.expense += Math.abs(t.amount);
      else cur.income += t.amount;
      dayTotals.set(k, cur);
    });
    return { groups, totalExpense, totalIncome, dayTotals };
  }, [filtered]);

  const { dayList, dayExpense, dayIncome } = useMemo(() => {
    const selKey = dayKey(selectedDay);
    const dayList = filtered.filter((t) => dayKey(new Date(t.iso)) === selKey);
    const dayExpense = dayList.filter((t) => t.type !== "Transfer" && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const dayIncome  = dayList.filter((t) => t.type !== "Transfer" && t.amount > 0).reduce((s, t) => s + t.amount, 0);
    return { dayList, dayExpense, dayIncome };
  }, [filtered, selectedDay]);

  const showEnablePrompt =
    Platform.OS === "android" && notificationListenerAvailable && !accessGranted;

  const toggleFilter = () => {
    if (filterOpen) setSearch("");
    setFilterOpen((v) => !v);
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-cosmic-darker">
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 pt-[10px] pb-[14px]">
        <Text className="text-[22px] font-bold text-white">Transactions</Text>
        <View className="flex-row items-center gap-2">
          {/* List / Calendar icon toggle */}
          <TouchableOpacity
            onPress={() => setMode((m) => (m === "list" ? "calendar" : "list"))}
            className="w-[38px] h-[38px] rounded-[10px] bg-white/[0.05] border border-white/[0.08] items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons
              name={mode === "list" ? "calendar-outline" : "list-outline"}
              size={20}
              color="#9ca3af"
            />
          </TouchableOpacity>
          {/* Search + filter toggle */}
          <TouchableOpacity
            onPress={toggleFilter}
            className="w-[38px] h-[38px] rounded-[10px] border items-center justify-center"
            style={
              filterOpen
                ? { backgroundColor: "rgba(168,85,247,0.15)", borderColor: "rgba(168,85,247,0.4)" }
                : { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }
            }
            activeOpacity={0.7}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={filterOpen ? "#a855f7" : "#9ca3af"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar — fixed, shown when filter panel is open */}
      {filterOpen && (
        <View className="flex-row items-center gap-[10px] mx-5 mb-3 bg-white/[0.05] rounded-[12px] border border-white/[0.08] px-[14px] py-[11px]">
          <Ionicons name="search-outline" size={18} color="#6b7280" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search transactions…"
            placeholderTextColor="#4b5563"
            className="flex-1 text-[14px] text-gray-300"
            style={{ paddingVertical: 0 }}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#4b5563" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Scrollable content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        {/* Filter chips — shown when filter panel is open */}
        {filterOpen && (
          <View className="flex-row flex-wrap gap-2 px-5 pb-3">
            {FILTERS.map((f) => (
              <Chip
                key={f}
                label={f}
                selected={filter === f}
                onPress={() => { setFilter(f); setCategoryFilter("All"); }}
              />
            ))}
          </View>
        )}

        {/* Category filter — horizontally scrollable since there can be many */}
        {filterOpen && categoriesUsed.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 12 }}
          >
            <Chip label="All categories" selected={categoryFilter === "All"} onPress={() => setCategoryFilter("All")} />
            {categoriesUsed.map((c) => (
              <Chip key={c} label={c} selected={categoryFilter === c} onPress={() => setCategoryFilter(c)} />
            ))}
          </ScrollView>
        )}

        {/* Notification opt-in */}
        {showEnablePrompt && (
          <TouchableOpacity
            onPress={requestNotificationAccess}
            className="mx-5 mb-3 flex-row items-center gap-3 px-4 py-3 rounded-[12px] border border-accent-purple/30"
            style={{ backgroundColor: "rgba(168,85,247,0.08)" }}
          >
            <Ionicons name="notifications-outline" size={20} color="#a855f7" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-accent-purple">Auto-import from notifications</Text>
              <Text className="text-xs text-dim">Allow NetWorth to read bank alerts to log transactions automatically.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#a855f7" />
          </TouchableOpacity>
        )}

        {/* Summary bar (list mode) */}
        {mode === "list" && (
          <View className="flex-row mx-5 mb-3 bg-white/[0.05] rounded-[12px] border border-white/[0.08] overflow-hidden">
            <View
              className="flex-1 flex-row items-center py-3 px-[14px] gap-1"
              style={{ borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.08)" }}
            >
              <Ionicons name="trending-down" size={14} color="#f87171" />
              <Text numberOfLines={1} className="text-[12px] text-muted flex-1"> Expense</Text>
              <Text className="text-[14px] font-bold text-accent-red">{fmt(totalExpense)}</Text>
            </View>
            <View className="flex-1 flex-row items-center py-3 px-[14px] gap-1">
              <Ionicons name="trending-up" size={14} color="#4ade80" />
              <Text numberOfLines={1} className="text-[12px] text-muted flex-1"> Income</Text>
              <Text className="text-[14px] font-bold text-accent-green">{fmt(totalIncome)}</Text>
            </View>
          </View>
        )}

        {/* Orphan banners */}
        <MissingTargetBanner
          noun="account"
          items={missingAccounts}
          txns={orphanAccounts}
          route="/add-account"
          icon="git-branch-outline"
        />
        <MissingTargetBanner
          noun="card"
          items={missingCards}
          txns={orphanCards}
          route="/add-card"
          icon="card-outline"
        />

        {!hasReal && (
          <View
            className="mx-5 mb-3 px-4 py-3 rounded-[12px] border border-white/[0.06] flex-row gap-3 items-center"
            style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
          >
            <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
            <Text className="text-xs text-dim flex-1">
              No transactions yet. Enable notification import or add transactions manually to see your data here.
            </Text>
          </View>
        )}

        {mode === "list" ? (
          Object.entries(groups).map(([date, txns]) => (
            <View key={date}>
              <Text className="text-[11px] text-muted font-bold px-5 py-[10px] tracking-[0.4px]">{date}</Text>
              {txns.map((t) => <Row key={t.id} t={t} />)}
            </View>
          ))
        ) : (
          <>
            <MonthCalendar
              month={calMonth}
              selected={selectedDay}
              totals={dayTotals}
              onSelectDay={setSelectedDay}
              onMonthChange={setCalMonth}
            />
            <View className="flex-row items-center justify-between px-5 pt-1 pb-2">
              <Text className="text-[13px] font-bold text-white">
                {selectedDay.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "long" })}
              </Text>
              <View className="flex-row gap-3">
                {dayIncome  > 0 && <Text className="text-[12px] font-bold text-accent-green">+{fmt(dayIncome)}</Text>}
                {dayExpense > 0 && <Text className="text-[12px] font-bold text-accent-red">−{fmt(dayExpense)}</Text>}
              </View>
            </View>
            {dayList.length === 0 ? (
              <View className="items-center px-8 py-8 gap-2">
                <Ionicons name="calendar-clear-outline" size={26} color="#4b5563" />
                <Text className="text-sm text-muted text-center">No transactions on this day.</Text>
              </View>
            ) : (
              dayList.map((t) => <Row key={t.id} t={t} />)
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── "Add the missing account/card" prompt ──────────────────────────────────────
function MissingTargetBanner({
  noun, items, txns, route, icon,
}: {
  noun: "account" | "card";
  items: { bank: string; last4: string }[];
  txns: Transaction[];
  route: "/add-account" | "/add-card";
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  if (items.length === 0) return null;
  const count = txns.length;

  const rejectAll = () => {
    confirm({
      title: `Reject ${count} transaction${count !== 1 ? "s" : ""}?`,
      message: `These notification transactions from ${noun}s you haven't added will be permanently deleted.`,
      confirmText: "Reject all",
      destructive: true,
      onConfirm: () => {
        const remove = useTransactionStore.getState().removeTransaction;
        txns.forEach((t) => remove(t.id));
        toast.success(`${count} transaction${count !== 1 ? "s" : ""} rejected.`);
      },
    });
  };

  return (
    <View
      className="mx-5 mb-3 px-4 py-3 rounded-[12px] border border-accent-purple/30"
      style={{ backgroundColor: "rgba(168,85,247,0.08)" }}
    >
      <View className="flex-row items-center gap-2 mb-1">
        <Ionicons name={icon} size={18} color="#a855f7" />
        <Text className="text-sm font-semibold text-accent-purple flex-1">
          {count} transaction{count !== 1 ? "s" : ""} from{" "}
          {items.length === 1 ? `a ${noun}` : `${noun}s`} you haven&apos;t added
        </Text>
      </View>
      <Text className="text-xs text-dim mb-3">
        Add the {noun} to link these and track {noun === "card" ? "its usage" : "its balance"}.
      </Text>
      <View className="flex-row flex-wrap gap-2 items-center">
        {items.map((m) => (
          <Chip
            key={`${m.bank}|${m.last4}`}
            icon="add-circle-outline"
            label={m.last4 ? `${m.bank} ••${m.last4}` : m.bank}
            onPress={() => router.push({ pathname: route, params: { bank: m.bank, last4: m.last4 } })}
          />
        ))}
      </View>
      <TouchableOpacity onPress={rejectAll} className="self-start mt-3 flex-row items-center gap-1.5" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="trash-outline" size={14} color="#f87171" />
        <Text className="text-xs font-semibold text-accent-red">Reject all</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Transaction row ───────────────────────────────────────────────────────────
type RowItem = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  name: string;
  cat: string;
  note: string;
  amount: number;
  time: string;
  type: string;
};
function Row({ t }: { t: RowItem }) {
  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: t.id } })}
      className="flex-row items-center gap-3 py-[13px] px-5"
      style={{ borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" }}
      activeOpacity={0.7}
    >
      <View className="w-[46px] h-[46px] rounded-[13px] bg-white/[0.05] items-center justify-center border border-white/[0.08]">
        <Ionicons name={t.icon} size={22} color="#9ca3af" />
      </View>
      <View className="flex-1">
        <Text className="text-[14px] font-semibold text-white mb-0.5" numberOfLines={1}>{t.name}</Text>
        <Text className="text-[11px] text-muted" numberOfLines={1}>
          {t.cat}{t.note ? ` · ${t.note}` : ""}
        </Text>
      </View>
      <View className="items-end">
        {t.type === "Transfer" ? (
          <Text className="text-[14px] font-bold mb-0.5" style={{ color: "#3b82f6" }}>
            {fmt(t.amount)}
          </Text>
        ) : (
          <Text className="text-[14px] font-bold mb-0.5" style={{ color: t.amount > 0 ? "#4ade80" : "#f87171" }}>
            {t.amount > 0 ? "+" : "−"}{fmt(t.amount)}
          </Text>
        )}
        <Text className="text-[11px] text-dim">{t.time}</Text>
      </View>
    </TouchableOpacity>
  );
}
