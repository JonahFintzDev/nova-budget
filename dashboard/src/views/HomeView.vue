<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ChevronRight, Plus } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import { useBudgetStore } from '@/stores/budget';
import {
  fmtMoney,
  fmtMoneyShort,
  longDate,
  shortDate,
  monthName,
  parseDate,
  spentInPeriod,
} from '@/lib/budget';
import CategoryChip from '@/components/budget/CategoryChip.vue';
import ProgressBar from '@/components/budget/ProgressBar.vue';
import BudgetAreaChart from '@/components/budget/BudgetAreaChart.vue';

const authStore = useAuthStore();
const store = useBudgetStore();
const router = useRouter();

const today = new Date();

type ChartPeriod = 'month' | 'quarter' | 'year';
const chartPeriod = ref<ChartPeriod>('month');

const greeting = computed(() => {
  const h = today.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
});

const dateStr = computed(() => longDate(today));

const periodTxList = computed(() => {
  const m = today.getMonth();
  const y = today.getFullYear();
  return store.transactions.filter((t) => {
    const d = parseDate(t.date);
    if (chartPeriod.value === 'month') {
      return d.getMonth() === m && d.getFullYear() === y;
    }
    if (chartPeriod.value === 'quarter') {
      const qNow = Math.floor(m / 3);
      return Math.floor(d.getMonth() / 3) === qNow && d.getFullYear() === y;
    }
    return d.getFullYear() === y;
  });
});

const periodLabel = computed(() => {
  const m = today.getMonth();
  const y = today.getFullYear();
  if (chartPeriod.value === 'month') return monthName(today);
  if (chartPeriod.value === 'quarter') return `Q${Math.floor(m / 3) + 1} ${y}`;
  return String(y);
});

const periodTxLabel = computed(() => {
  if (chartPeriod.value === 'month') return 'this month';
  if (chartPeriod.value === 'quarter') return 'this quarter';
  return 'this year';
});

const stats = computed(() => {
  const txList = periodTxList.value;
  const totalSpent = txList.reduce((s, t) => s + t.price, 0);
  const monthlyBudget = store.categories.reduce((s, c) => s + (c.limit ?? 0), 0);
  const multiplier = chartPeriod.value === 'month' ? 1 : chartPeriod.value === 'quarter' ? 3 : 12;
  const totalBudget = monthlyBudget * multiplier;
  const byCat: Record<string, number> = {};
  txList.forEach((t) => {
    byCat[t.categoryId] = (byCat[t.categoryId] ?? 0) + t.price;
  });
  const topId = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a])[0];
  const topCat = store.categories.find((c) => c.id === topId);
  return {
    totalSpent,
    totalBudget,
    txCount: txList.length,
    topCat: topCat ? { ...topCat, spent: byCat[topId] } : null,
    usedPct: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    remaining: Math.max(0, totalBudget - totalSpent),
  };
});

const catProgress = computed(() =>
  store.categories.map((c) => ({
    cat: c,
    spent: spentInPeriod(c, store.transactions, today),
  })),
);

const recentTx = computed(() =>
  [...store.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
);

const chartData = computed<{ series: number[]; categories: string[] }>(() => {
  const m = today.getMonth();
  const y = today.getFullYear();

  if (chartPeriod.value === 'month') {
    const monthTx = store.transactions.filter((t) => {
      const d = parseDate(t.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    const byDay: Record<string, number> = {};
    monthTx.forEach((t) => { byDay[t.date] = (byDay[t.date] ?? 0) + t.price; });
    const lastDay = today.getDate();
    const series: number[] = [];
    const categories: string[] = [];
    let cum = 0;
    for (let day = 1; day <= lastDay; day++) {
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cum += byDay[iso] ?? 0;
      series.push(cum);
      categories.push(String(day));
    }
    return { series, categories };
  }

  if (chartPeriod.value === 'quarter') {
    const q = Math.floor(m / 3);
    const series: number[] = [];
    const categories: string[] = [];
    for (let mo = q * 3; mo <= q * 3 + 2 && mo <= m; mo++) {
      const total = store.transactions
        .filter((t) => {
          const d = parseDate(t.date);
          return d.getMonth() === mo && d.getFullYear() === y;
        })
        .reduce((s, t) => s + t.price, 0);
      series.push(total);
      categories.push(new Date(y, mo, 1).toLocaleString('en-US', { month: 'short' }));
    }
    return { series, categories };
  }

  // Year
  const series: number[] = [];
  const categories: string[] = [];
  for (let mo = 0; mo <= m; mo++) {
    const total = store.transactions
      .filter((t) => {
        const d = parseDate(t.date);
        return d.getMonth() === mo && d.getFullYear() === y;
      })
      .reduce((s, t) => s + t.price, 0);
    series.push(total);
    categories.push(new Date(y, mo, 1).toLocaleString('en-US', { month: 'short' }));
  }
  return { series, categories };
});

const chartSubtitle = computed(() => {
  if (chartPeriod.value === 'month') return `Cumulative spend in ${monthName(today)}`;
  if (chartPeriod.value === 'quarter') {
    const q = Math.floor(today.getMonth() / 3) + 1;
    return `Monthly totals for Q${q} ${today.getFullYear()}`;
  }
  return `Monthly totals for ${today.getFullYear()}`;
});

function goToBudget() {
  router.push({ name: 'budget' });
}

function openItem(tx: {
  categoryId: string;
  id: string;
  name: string;
  tag: string;
  price: number;
  date: string;
}) {
  store.openEditItem(tx);
}
</script>

<template>
  <div class="home-wrap">
    <!-- Header -->
    <div class="home-header">
      <div>
        <h1 class="h-display">{{ greeting }}, {{ authStore.username }}.</h1>
        <div class="date">{{ dateStr }}</div>
      </div>
      <button class="btn btn-primary" @click="store.openNewItem()">
        <Plus :size="16" :stroke-width="2.5" /> Add spending
      </button>
    </div>

    <!-- Stats grid -->
    <div class="stats-grid">
      <!-- Spent -->
      <div class="stat-card">
        <span class="stat-label">Spent in {{ periodLabel }}</span>
        <span class="stat-value">{{ fmtMoney(stats.totalSpent) }}</span>
        <span class="stat-delta">of {{ fmtMoney(stats.totalBudget) }} budgeted</span>
      </div>

      <!-- Remaining -->
      <div class="stat-card">
        <span class="stat-label">Remaining</span>
        <span class="stat-value">{{ fmtMoney(stats.remaining) }}</span>
        <span class="stat-delta">{{ stats.usedPct }}% of budget used</span>
      </div>

      <!-- Transactions -->
      <div class="stat-card">
        <span class="stat-label">Transactions</span>
        <span class="stat-value">{{ stats.txCount }}</span>
        <span class="stat-delta">{{ periodTxLabel }}</span>
      </div>

      <!-- Top category -->
      <div
        v-if="stats.topCat"
        class="stat-card"
        style="flex-direction: row; align-items: center; gap: 14px"
      >
        <CategoryChip :icon="stats.topCat.icon" :color="stats.topCat.color" size="lg" />
        <div style="display: flex; flex-direction: column; gap: 4px; min-width: 0">
          <span class="stat-label">Top category</span>
          <span
            style="font-size: 17px; font-weight: 700; letter-spacing: -0.01em; color: var(--fg-1)"
            >{{ stats.topCat.name }}</span
          >
          <span style="font-size: 12px; color: var(--fg-3); font-variant-numeric: tabular-nums">
            {{ fmtMoney(stats.topCat.spent) }} {{ periodTxLabel }}
          </span>
        </div>
      </div>
      <div v-else class="stat-card">
        <span class="stat-label">Top category</span>
        <span class="stat-value" style="font-size: 18px">—</span>
        <span class="stat-delta">no transactions yet</span>
      </div>
    </div>

    <!-- Chart + categories grid -->
    <div class="home-grid">
      <!-- Spending over time chart -->
      <div class="card chart-card">
        <div class="chart-head">
          <div>
            <div class="h-title">Spending over time</div>
            <div class="chart-sub">{{ chartSubtitle }}</div>
          </div>
          <div class="chart-tabs">
            <button
              :class="{ active: chartPeriod === 'month' }"
              @click="chartPeriod = 'month'"
            >Month</button>
            <button
              :class="{ active: chartPeriod === 'quarter' }"
              @click="chartPeriod = 'quarter'"
            >Quarter</button>
            <button
              :class="{ active: chartPeriod === 'year' }"
              @click="chartPeriod = 'year'"
            >Year</button>
          </div>
        </div>
        <BudgetAreaChart
          v-if="chartData.series.length > 0"
          :series="chartData.series"
          :categories="chartData.categories"
          :height="200"
        />
        <div
          v-else
          style="
            height: 140px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--fg-4);
            font-size: 13px;
          "
        >
          No spending data for this period
        </div>
      </div>

      <!-- Categories card -->
      <div class="card" style="padding: 20px">
        <div
          style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          "
        >
          <div class="h-title">Categories</div>
          <button
            class="btn btn-ghost"
            style="padding: 4px 8px; font-size: 12px; gap: 4px"
            @click="goToBudget"
          >
            View all <ChevronRight :size="13" />
          </button>
        </div>

        <div
          v-if="catProgress.length === 0"
          style="padding: 20px 0; text-align: center; color: var(--fg-4); font-size: 13px"
        >
          No categories yet
        </div>
        <div v-else>
          <div v-for="{ cat, spent } in catProgress" :key="cat.id" class="cat-progress-row">
            <CategoryChip :icon="cat.icon" :color="cat.color" size="sm" />
            <div class="cat-text">
              <div class="cat-name">{{ cat.name }}</div>
              <div style="margin-top: 6px">
                <ProgressBar :value="spent" :max="cat.limit" :color="cat.color" />
              </div>
            </div>
            <div class="cat-amount">
              <div>{{ fmtMoneyShort(spent) }}</div>
              <div style="font-size: 11px; color: var(--fg-4); font-weight: 400">
                {{ cat.limit != null ? 'of ' + fmtMoneyShort(cat.limit) : 'no limit' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent transactions -->
    <div class="card">
      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        "
      >
        <div>
          <div class="h-title">Recent transactions</div>
          <div style="font-size: 12px; color: var(--fg-3); margin-top: 4px">
            Your last few spending items
          </div>
        </div>
        <button
          class="btn btn-ghost"
          style="padding: 4px 8px; font-size: 12px; gap: 4px"
          @click="goToBudget"
        >
          See all <ChevronRight :size="13" />
        </button>
      </div>

      <div
        v-if="recentTx.length === 0"
        style="padding: 20px 0; text-align: center; color: var(--fg-4); font-size: 13px"
      >
        No transactions yet
      </div>
      <div v-else>
        <button v-for="tx in recentTx" :key="tx.id" class="tx-row" @click="openItem(tx)">
          <template v-if="store.categories.find((c) => c.id === tx.categoryId) as any">
            <CategoryChip
              :icon="store.categories.find((c) => c.id === tx.categoryId)!.icon"
              :color="store.categories.find((c) => c.id === tx.categoryId)!.color"
            />
          </template>
          <div>
            <div class="tx-name">{{ tx.name }}</div>
            <div class="tx-sub">
              <span>{{ store.categories.find((c) => c.id === tx.categoryId)?.name }}</span>
              <template v-if="tx.tag">
                <span style="color: var(--fg-5)">·</span>
                <span class="pill">{{ tx.tag }}</span>
              </template>
              <span style="color: var(--fg-5)">·</span>
              <span>{{ shortDate(parseDate(tx.date)) }}</span>
            </div>
          </div>
          <div class="tx-amount money-neg">−{{ fmtMoney(tx.price) }}</div>
        </button>
      </div>
    </div>
  </div>
</template>
