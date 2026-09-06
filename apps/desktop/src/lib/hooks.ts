import { useCallback, useEffect, useState } from "react";
import type { Account, Category, Payee, PendingItem, RecurringTransaction, Transaction } from "@nexus/core";
import { listAccounts, listCategories, listPayees, listPendingItems, listRecurringExclusions, listRecurringTransactions, listTransactions } from "./db";

export interface NexusData {
  transactions: Transaction[];
  categories: Category[];
  payees: Payee[];
  accounts: Account[];
  recurringTransactions: RecurringTransaction[];
  pendingItems: PendingItem[];
  /** Ocorrências de recorrência puladas explicitamente ("deletar só este mês") — `${recurringId}:${data}`. */
  recurringExclusions: Set<string>;
  categoriesById: Map<string, Category>;
  payeesById: Map<string, Payee>;
  accountsById: Map<string, Account>;
  loading: boolean;
  refresh: () => void;
}

/** Carrega transações + categorias + pagadores + contas + recorrências + pendências avulsas e mantém tudo em sincronia após um refresh(). */
export function useNexusData(): NexusData {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [recurringExclusions, setRecurringExclusions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listTransactions(),
      listCategories(),
      listPayees(),
      listAccounts(),
      listRecurringTransactions(),
      listPendingItems(),
      listRecurringExclusions(),
    ]).then(([tx, cats, pys, accs, recs, pending, exclusions]) => {
      if (cancelled) return;
      setTransactions(tx);
      setCategories(cats);
      setPayees(pys);
      setAccounts(accs);
      setRecurringTransactions(recs);
      setPendingItems(pending);
      setRecurringExclusions(exclusions);
      setLoading(false);
    }).catch((err) => {
      // Sem isso, uma falha aqui (ex.: servidor fora do ar) vira uma
      // promise rejeitada sem handler — `loading` fica travado em `true`
      // pra sempre, sem chance de tentar de novo (nem quando o servidor
      // volta, já que nada mais muda `tick`).
      if (cancelled) return;
      console.error("Falha ao carregar dados do Nexus:", err);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    transactions,
    categories,
    payees,
    accounts,
    recurringTransactions,
    pendingItems,
    recurringExclusions,
    categoriesById: new Map(categories.map((c) => [c.id, c])),
    payeesById: new Map(payees.map((p) => [p.id, p])),
    accountsById: new Map(accounts.map((a) => [a.id, a])),
    loading,
    refresh,
  };
}
