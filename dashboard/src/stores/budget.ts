import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Category, CategoryModalState, IconKey, ItemModalState, Transaction } from '@/@types/index';
import { PALETTE } from '@/lib/budget';
import { useAuthStore } from '@/stores/auth';
import { budgetApi, getApiReachable, subscribeApiReachable } from '@/classes/api';

// ── Storage keys ──────────────────────────────────────────────────────────────

const DATA_KEY = (uid: string) => `nova-budget-data-${uid}`;
const PENDING_KEY = (uid: string) => `nova-budget-pending-${uid}`;
const MIGRATED_KEY = (uid: string) => `nova-budget-migrated-${uid}`;

// ── Pending queue types ───────────────────────────────────────────────────────

type PendingOp =
  | { type: 'createCategory'; localId: string; payload: Omit<Category, 'id'> }
  | { type: 'updateCategory'; id: string; patch: Partial<Omit<Category, 'id'>> }
  | { type: 'deleteCategory'; id: string }
  | { type: 'createTransaction'; localId: string; payload: Omit<Transaction, 'id'> }
  | { type: 'updateTransaction'; id: string; patch: Partial<Omit<Transaction, 'id'>> }
  | { type: 'deleteTransaction'; id: string };

// ── localStorage helpers ──────────────────────────────────────────────────────

function loadData(uid: string): { categories: Category[]; transactions: Transaction[] } {
  try {
    const raw = localStorage.getItem(DATA_KEY(uid));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { categories: [], transactions: [] };
}

function saveData(uid: string, cats: Category[], txs: Transaction[]): void {
  try {
    localStorage.setItem(DATA_KEY(uid), JSON.stringify({ categories: cats, transactions: txs }));
  } catch {}
}

function loadPending(uid: string): PendingOp[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY(uid));
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function savePending(uid: string, ops: PendingOp[]): void {
  try {
    if (ops.length === 0) localStorage.removeItem(PENDING_KEY(uid));
    else localStorage.setItem(PENDING_KEY(uid), JSON.stringify(ops));
  } catch {}
}

function isMigrated(uid: string): boolean {
  return localStorage.getItem(MIGRATED_KEY(uid)) === 'true';
}

function markMigrated(uid: string): void {
  localStorage.setItem(MIGRATED_KEY(uid), 'true');
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useBudgetStore = defineStore('budget', () => {
  const authStore = useAuthStore();

  const categories = ref<Category[]>([]);
  const transactions = ref<Transaction[]>([]);
  const catModal = ref<CategoryModalState>({ open: false });
  const itemModal = ref<ItemModalState>({ open: false });

  // Non-reactive internals — not displayed in UI
  let pendingOps: PendingOp[] = [];
  let syncing = false;

  // ── Internal helpers ──────────────────────────────────────────────────────

  function uid(): string | null {
    return authStore.userId ?? null;
  }

  function persist(): void {
    const id = uid();
    if (id) saveData(id, categories.value, transactions.value);
  }

  function enqueuePending(op: PendingOp): void {
    const id = uid();
    if (!id) return;
    pendingOps.push(op);
    savePending(id, pendingOps);
  }

  // ── Flush pending queue ───────────────────────────────────────────────────

  async function flushPending(): Promise<void> {
    const id = uid();
    if (!id || syncing || pendingOps.length === 0) return;
    syncing = true;

    try {
      // localId → real server id, built up as we process creates in order
      const idMap = new Map<string, string>();
      const failed: PendingOp[] = [];

      for (const op of pendingOps) {
        try {
          switch (op.type) {
            case 'createCategory': {
              const cat = await budgetApi.createCategory(op.payload);
              idMap.set(op.localId, cat.id);
              const idx = categories.value.findIndex((c) => c.id === op.localId);
              if (idx !== -1) categories.value[idx] = cat;
              break;
            }
            case 'updateCategory': {
              await budgetApi.updateCategory(idMap.get(op.id) ?? op.id, op.patch);
              break;
            }
            case 'deleteCategory': {
              await budgetApi.deleteCategory(idMap.get(op.id) ?? op.id);
              break;
            }
            case 'createTransaction': {
              const categoryId = idMap.get(op.payload.categoryId) ?? op.payload.categoryId;
              const tx = await budgetApi.createTransaction({ ...op.payload, categoryId });
              idMap.set(op.localId, tx.id);
              const idx = transactions.value.findIndex((t) => t.id === op.localId);
              if (idx !== -1) transactions.value[idx] = tx;
              break;
            }
            case 'updateTransaction': {
              const patch = op.patch.categoryId
                ? { ...op.patch, categoryId: idMap.get(op.patch.categoryId) ?? op.patch.categoryId }
                : op.patch;
              await budgetApi.updateTransaction(idMap.get(op.id) ?? op.id, patch);
              break;
            }
            case 'deleteTransaction': {
              await budgetApi.deleteTransaction(idMap.get(op.id) ?? op.id);
              break;
            }
          }
        } catch {
          failed.push(op);
        }
      }

      pendingOps = failed;
      savePending(id, pendingOps);
      persist();
    } finally {
      syncing = false;
    }
  }

  // ── Refresh from server ───────────────────────────────────────────────────

  async function refreshFromServer(): Promise<void> {
    try {
      const [cats, txs] = await Promise.all([
        budgetApi.getCategories(),
        budgetApi.getTransactions(),
      ]);

      // Preserve any items still pending creation that aren't in the API yet
      const pendingCatIds = new Set(
        pendingOps
          .filter((op): op is Extract<PendingOp, { type: 'createCategory' }> => op.type === 'createCategory')
          .map((op) => op.localId),
      );
      const pendingTxIds = new Set(
        pendingOps
          .filter((op): op is Extract<PendingOp, { type: 'createTransaction' }> => op.type === 'createTransaction')
          .map((op) => op.localId),
      );

      categories.value = [...cats, ...categories.value.filter((c) => pendingCatIds.has(c.id))];
      transactions.value = [...txs, ...transactions.value.filter((t) => pendingTxIds.has(t.id))];
      persist();
    } catch (err) {
      console.error('Failed to refresh from server:', err);
    }
  }

  // ── One-time migration of localStorage data to the server ─────────────────

  async function migrateToServer(): Promise<void> {
    const id = uid();
    if (!id) return;

    const idMap = new Map<string, string>();

    for (const cat of [...categories.value]) {
      try {
        const { id: localId, ...payload } = cat;
        const created = await budgetApi.createCategory(payload);
        idMap.set(localId, created.id);
        const idx = categories.value.findIndex((c) => c.id === localId);
        if (idx !== -1) categories.value[idx] = created;
      } catch (err) {
        console.error('Migration: failed to push category', cat, err);
      }
    }

    for (const tx of [...transactions.value]) {
      try {
        const { id: localId, ...payload } = tx;
        const categoryId = idMap.get(payload.categoryId) ?? payload.categoryId;
        const created = await budgetApi.createTransaction({ ...payload, categoryId });
        const idx = transactions.value.findIndex((t) => t.id === localId);
        if (idx !== -1) transactions.value[idx] = created;
      } catch (err) {
        console.error('Migration: failed to push transaction', tx, err);
      }
    }

    persist();
    markMigrated(id);
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  async function init(): Promise<void> {
    const id = uid();
    if (!id) return;

    // Always load localStorage immediately so the UI has data right away
    const data = loadData(id);
    categories.value = data.categories;
    transactions.value = data.transactions;
    pendingOps = loadPending(id);

    if (!getApiReachable()) return;

    if (!isMigrated(id)) {
      if (categories.value.length > 0 || transactions.value.length > 0) {
        // Push existing localStorage data to the server (one-time migration)
        await migrateToServer();
      } else {
        // Fresh user — nothing to migrate
        markMigrated(id);
        await refreshFromServer();
      }
    } else {
      // Normal startup: flush any offline changes, then sync from server
      if (pendingOps.length > 0) await flushPending();
      await refreshFromServer();
    }
  }

  // Sync when connectivity is restored mid-session
  subscribeApiReachable(async (online) => {
    if (!online) return;
    const id = uid();
    if (!id || !isMigrated(id)) return;
    if (pendingOps.length > 0) await flushPending();
    await refreshFromServer();
  });

  // ── Category CRUD ─────────────────────────────────────────────────────────

  async function createCategory(payload: Omit<Category, 'id'>): Promise<string> {
    if (getApiReachable()) {
      const cat = await budgetApi.createCategory(payload);
      categories.value.push(cat);
      persist();
      return cat.id;
    }
    const localId = crypto.randomUUID();
    categories.value.push({ id: localId, ...payload });
    persist();
    enqueuePending({ type: 'createCategory', localId, payload });
    return localId;
  }

  async function updateCategory(id: string, patch: Partial<Omit<Category, 'id'>>): Promise<void> {
    const idx = categories.value.findIndex((c) => c.id === id);
    if (idx !== -1) categories.value[idx] = { ...categories.value[idx], ...patch };
    persist();
    if (getApiReachable()) {
      await budgetApi.updateCategory(id, patch).catch(console.error);
    } else {
      enqueuePending({ type: 'updateCategory', id, patch });
    }
  }

  async function deleteCategory(id: string): Promise<void> {
    categories.value = categories.value.filter((c) => c.id !== id);
    transactions.value = transactions.value.filter((t) => t.categoryId !== id);
    persist();
    if (getApiReachable()) {
      await budgetApi.deleteCategory(id).catch(console.error);
    } else {
      enqueuePending({ type: 'deleteCategory', id });
    }
  }

  // ── Transaction CRUD ──────────────────────────────────────────────────────

  async function createTransaction(payload: Omit<Transaction, 'id'>): Promise<string> {
    if (getApiReachable()) {
      const tx = await budgetApi.createTransaction(payload);
      transactions.value.unshift(tx);
      persist();
      return tx.id;
    }
    const localId = crypto.randomUUID();
    transactions.value.unshift({ id: localId, ...payload });
    persist();
    enqueuePending({ type: 'createTransaction', localId, payload });
    return localId;
  }

  async function updateTransaction(id: string, patch: Partial<Omit<Transaction, 'id'>>): Promise<void> {
    const idx = transactions.value.findIndex((t) => t.id === id);
    if (idx !== -1) transactions.value[idx] = { ...transactions.value[idx], ...patch };
    persist();
    if (getApiReachable()) {
      await budgetApi.updateTransaction(id, patch).catch(console.error);
    } else {
      enqueuePending({ type: 'updateTransaction', id, patch });
    }
  }

  async function deleteTransaction(id: string): Promise<void> {
    transactions.value = transactions.value.filter((t) => t.id !== id);
    persist();
    if (getApiReachable()) {
      await budgetApi.deleteTransaction(id).catch(console.error);
    } else {
      enqueuePending({ type: 'deleteTransaction', id });
    }
  }

  // ── Category modal ────────────────────────────────────────────────────────

  function openNewCategory(): void {
    catModal.value = { open: true, mode: 'create' };
  }

  function openEditCategory(cat: Category): void {
    catModal.value = { open: true, mode: 'edit', initial: cat };
  }

  function closeCategoryModal(): void {
    catModal.value = { open: false };
  }

  async function saveCategoryModal(draft: Omit<Category, 'id'>): Promise<string | null> {
    if (!catModal.value.open) return null;
    if (catModal.value.mode === 'edit') {
      const id = catModal.value.initial.id;
      await updateCategory(id, draft);
      closeCategoryModal();
      return id;
    }
    const id = await createCategory(draft);
    closeCategoryModal();
    return id;
  }

  async function deleteCategoryModal(): Promise<void> {
    if (!catModal.value.open || catModal.value.mode !== 'edit') return;
    const id = catModal.value.initial.id;
    await deleteCategory(id);
    closeCategoryModal();
  }

  // ── Item modal ────────────────────────────────────────────────────────────

  function openNewItem(defaultCategoryId: string | null = null): void {
    itemModal.value = { open: true, mode: 'create', defaultCategoryId };
  }

  function openEditItem(tx: Transaction): void {
    itemModal.value = { open: true, mode: 'edit', initial: tx };
  }

  function closeItemModal(): void {
    itemModal.value = { open: false };
  }

  async function saveItemModal(draft: Omit<Transaction, 'id'>): Promise<void> {
    if (!itemModal.value.open) return;
    if (itemModal.value.mode === 'edit') {
      await updateTransaction(itemModal.value.initial.id, draft);
    } else {
      await createTransaction(draft);
    }
    closeItemModal();
  }

  async function deleteItemModal(): Promise<void> {
    if (!itemModal.value.open || itemModal.value.mode !== 'edit') return;
    const id = itemModal.value.initial.id;
    await deleteTransaction(id);
    closeItemModal();
  }

  // ── Computed helpers ──────────────────────────────────────────────────────

  const knownTagsForCategory = computed<string[]>(() => {
    if (!itemModal.value.open) return [];
    const catId =
      itemModal.value.mode === 'create'
        ? itemModal.value.defaultCategoryId
        : itemModal.value.initial.categoryId;
    if (!catId) return [];
    return [
      ...new Set(
        transactions.value
          .filter((t) => t.categoryId === catId)
          .map((t) => t.tag)
          .filter(Boolean),
      ),
    ];
  });

  const defaultIconKey: IconKey = 'sparkle';
  const defaultColor = PALETTE[0];

  return {
    categories,
    transactions,
    catModal,
    itemModal,
    knownTagsForCategory,
    defaultIconKey,
    defaultColor,
    init,
    createCategory,
    updateCategory,
    deleteCategory,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    openNewCategory,
    openEditCategory,
    closeCategoryModal,
    saveCategoryModal,
    deleteCategoryModal,
    openNewItem,
    openEditItem,
    closeItemModal,
    saveItemModal,
    deleteItemModal,
  };
});
