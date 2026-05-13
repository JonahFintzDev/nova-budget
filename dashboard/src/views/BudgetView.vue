<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus, Search, Pencil, MoreVertical, Tag, Wallet } from 'lucide-vue-next';
import { useBudgetStore } from '@/stores/budget';
import {
  fmtMoney, fmtMoneyShort, longDate, shortDate,
  parseDate, periodFor, spentInPeriod, daysUntilReset, ordinal,
} from '@/lib/budget';
import CategoryChip from '@/components/budget/CategoryChip.vue';
import ProgressBar from '@/components/budget/ProgressBar.vue';
import type { Category, Transaction } from '@/@types/index';

const store = useBudgetStore();
const route = useRoute();
const router = useRouter();
const today = new Date();
const search = ref('');

// ── Selected category ─────────────────────────────────────────

const selectedId = computed(() => {
  const param = route.params.categoryId as string | undefined;
  return param && store.categories.find((c) => c.id === param)
    ? param
    : store.categories[0]?.id ?? null;
});

const selected = computed<Category | null>(
  () => store.categories.find((c) => c.id === selectedId.value) ?? null,
);

watch(selectedId, (id) => {
  if (id && route.params.categoryId !== id) {
    router.replace({ name: 'budget-category', params: { categoryId: id } });
  }
}, { immediate: false });

function selectCat(id: string) {
  router.push({ name: 'budget-category', params: { categoryId: id } });
}

// ── Search filter ─────────────────────────────────────────────

const filtered = computed(() => {
  if (!search.value.trim()) return store.categories;
  const q = search.value.trim().toLowerCase();
  return store.categories.filter((c) => c.name.toLowerCase().includes(q));
});

// ── Detail data ───────────────────────────────────────────────

const detail = computed(() => {
  if (!selected.value) return null;
  const cat = selected.value;
  const { start, end } = periodFor(cat.resetDay, today);
  const endInc = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
  const periodTx = store.transactions
    .filter((t) => t.categoryId === cat.id)
    .filter((t) => {
      const d = parseDate(t.date);
      return d >= start && d <= endInc;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  const spent = periodTx.reduce((s, t) => s + t.price, 0);
  const tags = [...new Set(
    store.transactions
      .filter((t) => t.categoryId === cat.id)
      .map((t) => t.tag)
      .filter(Boolean),
  )];
  return { start, end, periodTx, spent, tags };
});

// ── Grouped transactions ─────────────────────────────────────

const grouped = computed<[string, Transaction[]][]>(() => {
  if (!detail.value) return [];
  const groups: Record<string, Transaction[]> = {};
  detail.value.periodTx.forEach((t) => {
    groups[t.date] = groups[t.date] ?? [];
    groups[t.date].push(t);
  });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
});

// ── Period helpers ────────────────────────────────────────────

const periodStr = computed(() => {
  if (!detail.value) return '';
  return shortDate(detail.value.start) + ' – ' + shortDate(detail.value.end);
});

const daysLeft = computed(() =>
  selected.value ? daysUntilReset(selected.value, today) : 0,
);

const isOverBudget = computed(() =>
  selected.value?.limit != null && detail.value != null
    ? detail.value.spent > selected.value.limit
    : false,
);

const remainingValue = computed(() => {
  if (!selected.value?.limit || !detail.value) return null;
  return Math.max(0, selected.value.limit - detail.value.spent);
});

const catSpent = (cat: Category) =>
  spentInPeriod(cat, store.transactions, today);

const catMeta = (cat: Category): string => {
  const spent = catSpent(cat);
  if (cat.limit != null) {
    return Math.round((spent / cat.limit) * 100) + '% of ' + fmtMoneyShort(cat.limit);
  }
  return 'Resets ' + ordinal(cat.resetDay);
};
</script>

<template>
  <div class="budget-layout">
    <!-- LEFT: Category rail -->
    <aside class="cat-rail">
      <div class="cat-rail-header">
        <div class="h-title">Categories</div>
        <button class="btn-icon" aria-label="New category" @click="store.openNewCategory()">
          <Plus :size="18" />
        </button>
      </div>

      <!-- Search -->
      <div style="position:relative;margin-bottom:14px">
        <Search
          :size="14"
          style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--fg-4);pointer-events:none"
        />
        <input
          v-model="search"
          type="text"
          class="nb-input"
          style="padding-left:32px"
          placeholder="Search categories..."
        />
      </div>

      <!-- Category cards -->
      <div>
        <button
          v-for="cat in filtered"
          :key="cat.id"
          class="cat-card"
          :class="{ active: cat.id === selectedId }"
          @click="selectCat(cat.id)"
        >
          <CategoryChip :icon="cat.icon" :color="cat.color" />
          <div class="cat-card-text">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
              <div class="cat-card-name">{{ cat.name }}</div>
              <div class="cat-card-amount">{{ fmtMoneyShort(catSpent(cat)) }}</div>
            </div>
            <ProgressBar :value="catSpent(cat)" :max="cat.limit" :color="cat.color" :height="4" style="margin-top:8px" />
            <div class="cat-card-meta">{{ catMeta(cat) }}</div>
          </div>
        </button>

        <button class="cat-add-btn" @click="store.openNewCategory()">
          <Plus :size="15" /> New category
        </button>
      </div>
    </aside>

    <!-- RIGHT: Detail pane -->
    <section class="cat-detail">
      <!-- Empty: no categories -->
      <div v-if="store.categories.length === 0" class="empty-state">
        <div class="empty-icon"><Wallet :size="26" /></div>
        <div class="empty-title">No categories yet</div>
        <div class="empty-sub">Create your first category to start tracking your budget.</div>
        <div style="margin-top:18px">
          <button class="btn btn-primary" @click="store.openNewCategory()">
            <Plus :size="15" :stroke-width="2.5" /> New category
          </button>
        </div>
      </div>

      <template v-else-if="selected && detail">
        <!-- Hero row -->
        <div class="detail-hero">
          <CategoryChip :icon="selected.icon" :color="selected.color" size="lg" />
          <div class="title-area">
            <h1>{{ selected.name }}</h1>
            <div class="subtitle">
              Resets {{ ordinal(selected.resetDay) }} · {{ daysLeft }} days remaining ·
              {{ selected.limit != null ? fmtMoney(selected.limit) + ' monthly limit' : 'no limit set' }}
            </div>
          </div>
          <div class="actions">
            <button class="btn btn-secondary" @click="store.openEditCategory(selected)">
              <Pencil :size="14" /> Edit category
            </button>
            <button class="btn btn-primary" @click="store.openNewItem(selected.id)">
              <Plus :size="15" :stroke-width="2.5" /> Add spending
            </button>
          </div>
        </div>

        <!-- Stats 3-col -->
        <div class="detail-stats">
          <!-- Spent this period -->
          <div class="stat-card">
            <span class="stat-label">Spent this period</span>
            <span class="stat-value">{{ fmtMoney(detail.spent) }}</span>
            <span class="stat-delta" :style="isOverBudget ? 'color:var(--danger)' : ''">
              <template v-if="selected.limit != null">
                {{ Math.round((detail.spent / selected.limit) * 100) }}% of {{ fmtMoney(selected.limit) }}
              </template>
              <template v-else>{{ detail.periodTx.length }} transactions</template>
            </span>
          </div>

          <!-- Remaining -->
          <div class="stat-card">
            <span class="stat-label">Remaining</span>
            <span class="stat-value" :style="isOverBudget ? 'color:var(--danger)' : ''">
              {{ selected.limit != null ? fmtMoney(remainingValue ?? 0) : '—' }}
            </span>
            <span class="stat-delta">
              <template v-if="selected.limit != null">
                <span v-if="isOverBudget" style="color:var(--danger)">
                  Over by {{ fmtMoney(detail.spent - selected.limit) }}
                </span>
                <span v-else>until reset</span>
              </template>
              <template v-else>no limit configured</template>
            </span>
          </div>

          <!-- Period -->
          <div class="stat-card">
            <span class="stat-label">Period</span>
            <span class="stat-value" style="font-size:18px">{{ periodStr }}</span>
            <span class="stat-delta">{{ daysLeft }} days until reset</span>
          </div>
        </div>

        <!-- Full-width progress bar -->
        <div v-if="selected.limit != null" style="margin-bottom:28px">
          <ProgressBar :value="detail.spent" :max="selected.limit" :color="selected.color" />
        </div>

        <!-- Tags row -->
        <div
          v-if="detail.tags.length > 0"
          style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:22px;align-items:center"
        >
          <span class="label-caps" style="margin-right:4px">Tags</span>
          <span v-for="t in detail.tags" :key="t" class="pill">
            <Tag :size="11" /> {{ t }}
          </span>
        </div>

        <!-- Spending items section -->
        <div class="tx-section-header">
          <div class="tx-section-title">Spending items</div>
          <div style="color:var(--fg-3);font-size:12px">
            {{ detail.periodTx.length }} item{{ detail.periodTx.length === 1 ? '' : 's' }} this period
          </div>
        </div>

        <!-- Empty state for category -->
        <div v-if="detail.periodTx.length === 0" class="empty-state">
          <div class="empty-icon"><Plus :size="26" /></div>
          <div class="empty-title">No spending yet this period</div>
          <div class="empty-sub">Add your first item for this category to see it here.</div>
          <div style="margin-top:18px">
            <button class="btn btn-primary" @click="store.openNewItem(selected.id)">
              <Plus :size="15" :stroke-width="2.5" /> Add spending
            </button>
          </div>
        </div>

        <!-- Transaction list grouped by date -->
        <div v-else class="tx-list">
          <template v-for="([date, items]) in grouped" :key="date">
            <div class="tx-date-group">{{ longDate(parseDate(date)) }}</div>
            <button
              v-for="tx in items"
              :key="tx.id"
              class="tx-row"
              @click="store.openEditItem(tx)"
            >
              <CategoryChip :icon="selected.icon" :color="selected.color" size="sm" />
              <div>
                <div class="tx-name">{{ tx.name }}</div>
                <div v-if="tx.tag" class="tx-sub">
                  <span class="pill"><Tag :size="10" /> {{ tx.tag }}</span>
                </div>
              </div>
              <div class="tx-amount money-neg">−{{ fmtMoney(tx.price) }}</div>
              <button class="menu-btn" @click.stop="store.openEditItem(tx)" aria-label="Edit">
                <MoreVertical :size="15" />
              </button>
            </button>
          </template>
        </div>
      </template>
    </section>
  </div>
</template>
