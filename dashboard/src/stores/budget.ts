import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import type { Category, CategoryModalState, IconKey, ItemModalState, Transaction } from '@/@types/index';
import { PALETTE } from '@/lib/budget';
import { useAuthStore } from '@/stores/auth';

const STORAGE_KEY = (userId: string) => `nova-budget-data-${userId}`;

function loadFromStorage(userId: string): { categories: Category[]; transactions: Transaction[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId));
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { categories: [], transactions: [] };
}

function saveToStorage(
  userId: string,
  categories: Category[],
  transactions: Transaction[],
): void {
  try {
    localStorage.setItem(STORAGE_KEY(userId), JSON.stringify({ categories, transactions }));
  } catch {
    // ignore
  }
}

export const useBudgetStore = defineStore('budget', () => {
  const authStore = useAuthStore();

  const categories = ref<Category[]>([]);
  const transactions = ref<Transaction[]>([]);

  const catModal = ref<CategoryModalState>({ open: false });
  const itemModal = ref<ItemModalState>({ open: false });

  // ── Init ─────────────────────────────────────────────────

  function init() {
    const userId = authStore.userId;
    if (!userId) return;
    const data = loadFromStorage(userId);
    categories.value = data.categories;
    transactions.value = data.transactions;
  }

  function persist() {
    const userId = authStore.userId;
    if (!userId) return;
    saveToStorage(userId, categories.value, transactions.value);
  }

  watch([categories, transactions], persist, { deep: true });

  // ── Category CRUD ─────────────────────────────────────────

  function createCategory(payload: Omit<Category, 'id'>): string {
    const id = crypto.randomUUID();
    categories.value.push({ id, ...payload });
    return id;
  }

  function updateCategory(id: string, patch: Partial<Omit<Category, 'id'>>): void {
    const idx = categories.value.findIndex((c) => c.id === id);
    if (idx !== -1) {
      categories.value[idx] = { ...categories.value[idx], ...patch };
    }
  }

  function deleteCategory(id: string): void {
    categories.value = categories.value.filter((c) => c.id !== id);
    transactions.value = transactions.value.filter((t) => t.categoryId !== id);
  }

  // ── Transaction CRUD ──────────────────────────────────────

  function createTransaction(payload: Omit<Transaction, 'id'>): string {
    const id = crypto.randomUUID();
    transactions.value.unshift({ id, ...payload });
    return id;
  }

  function updateTransaction(id: string, patch: Partial<Omit<Transaction, 'id'>>): void {
    const idx = transactions.value.findIndex((t) => t.id === id);
    if (idx !== -1) {
      transactions.value[idx] = { ...transactions.value[idx], ...patch };
    }
  }

  function deleteTransaction(id: string): void {
    transactions.value = transactions.value.filter((t) => t.id !== id);
  }

  // ── Category modal ─────────────────────────────────────────

  function openNewCategory(): void {
    catModal.value = { open: true, mode: 'create' };
  }

  function openEditCategory(cat: Category): void {
    catModal.value = { open: true, mode: 'edit', initial: cat };
  }

  function closeCategoryModal(): void {
    catModal.value = { open: false };
  }

  function saveCategoryModal(draft: Omit<Category, 'id'>): string | null {
    if (!catModal.value.open) return null;
    if (catModal.value.mode === 'edit') {
      updateCategory(catModal.value.initial.id, draft);
      closeCategoryModal();
      return catModal.value.initial.id;
    } else {
      const id = createCategory(draft);
      closeCategoryModal();
      return id;
    }
  }

  function deleteCategoryModal(): void {
    if (!catModal.value.open || catModal.value.mode !== 'edit') return;
    deleteCategory(catModal.value.initial.id);
    closeCategoryModal();
  }

  // ── Item modal ─────────────────────────────────────────────

  function openNewItem(defaultCategoryId: string | null = null): void {
    itemModal.value = { open: true, mode: 'create', defaultCategoryId };
  }

  function openEditItem(tx: Transaction): void {
    itemModal.value = { open: true, mode: 'edit', initial: tx };
  }

  function closeItemModal(): void {
    itemModal.value = { open: false };
  }

  function saveItemModal(draft: Omit<Transaction, 'id'>): void {
    if (!itemModal.value.open) return;
    if (itemModal.value.mode === 'edit') {
      updateTransaction(itemModal.value.initial.id, draft);
    } else {
      createTransaction(draft);
    }
    closeItemModal();
  }

  function deleteItemModal(): void {
    if (!itemModal.value.open || itemModal.value.mode !== 'edit') return;
    deleteTransaction(itemModal.value.initial.id);
    closeItemModal();
  }

  // ── Computed helpers ──────────────────────────────────────

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
