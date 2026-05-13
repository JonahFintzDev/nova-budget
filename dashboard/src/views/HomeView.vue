<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { ChevronRight, Plus } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import { useBudgetStore } from '@/stores/budget';
import {
  fmtMoney, fmtMoneyShort, longDate, shortDate,
  monthName, parseDate, spentInPeriod,
} from '@/lib/budget';
import CategoryChip from '@/components/budget/CategoryChip.vue';
import ProgressBar from '@/components/budget/ProgressBar.vue';
import SpendChart from '@/components/budget/SpendChart.vue';
import type { ChartPoint } from '@/components/budget/SpendChart.vue';

const authStore = useAuthStore();
const store = useBudgetStore();
const router = useRouter();

const today = new Date();

const greeting = computed(() => {
  const h = today.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
});

const dateStr = computed(() => longDate(today));

const stats = computed(() => {
  const m = today.getMonth();
  const y = today.getFullYear();
  const monthTx = store.transactions.filter((t) => {
    const d = parseDate(t.date);
    return d.getMonth() === m && d.getFullYear() === y;
  });
  const totalSpent = monthTx.reduce((s, t) => s + t.price, 0);
  const totalBudget = store.categories.reduce((s, c) => s + (c.limit ?? 0), 0);
  const byCat: Record<string, number> = {};
  monthTx.forEach((t) => {
    byCat[t.categoryId] = (byCat[t.categoryId] ?? 0) + t.price;
  });
  const topId = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a])[0];
  const topCat = store.categories.find((c) => c.id === topId);
  return {
    totalSpent,
    totalBudget,
    txCount: monthTx.length,
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
  [...store.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6),
);

const chartData = computed<ChartPoint[]>(() => {
  const m = today.getMonth();
  const y = today.getFullYear();
  const monthTx = store.transactions.filter((t) => {
    const d = parseDate(t.date);
    return d.getMonth() === m && d.getFullYear() === y;
  });
  const byDay: Record<string, number> = {};
  monthTx.forEach((t) => {
    byDay[t.date] = (byDay[t.date] ?? 0) + t.price;
  });
  const lastDay = today.getDate();
  const series: ChartPoint[] = [];
  let cum = 0;
  for (let d = 1; d <= lastDay; d++) {
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cum += byDay[iso] ?? 0;
    series.push({ label: String(d), value: cum });
  }
  return series;
});

function goToBudget() {
  router.push({ name: 'budget' });
}

function openItem(tx: { categoryId: string; id: string; name: string; tag: string; price: number; date: string }) {
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
        <span class="stat-label">Spent in {{ monthName(today) }}</span>
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
        <span class="stat-delta">this month</span>
      </div>

      <!-- Top category -->
      <div v-if="stats.topCat" class="stat-card" style="flex-direction:row;align-items:center;gap:14px">
        <CategoryChip :icon="stats.topCat.icon" :color="stats.topCat.color" size="lg" />
        <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
          <span class="stat-label">Top category</span>
          <span style="font-size:17px;font-weight:700;letter-spacing:-0.01em;color:var(--fg-1)">{{ stats.topCat.name }}</span>
          <span style="font-size:12px;color:var(--fg-3);font-variant-numeric:tabular-nums">
            {{ fmtMoney(stats.topCat.spent) }} this month
          </span>
        </div>
      </div>
      <div v-else class="stat-card">
        <span class="stat-label">Top category</span>
        <span class="stat-value" style="font-size:18px">—</span>
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
            <div class="chart-sub">Cumulative spend in {{ monthName(today) }}</div>
          </div>
          <div class="chart-tabs">
            <button class="active">Month</button>
            <button>Quarter</button>
            <button>Year</button>
          </div>
        </div>
        <SpendChart v-if="chartData.length > 0" :data="chartData" />
        <div v-else style="height:140px;display:flex;align-items:center;justify-content:center;color:var(--fg-4);font-size:13px">
          No spending data yet this month
        </div>
      </div>

      <!-- Categories card -->
      <div class="card" style="padding:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div class="h-title">Categories</div>
          <button
            class="btn btn-ghost"
            style="padding:4px 8px;font-size:12px;gap:4px"
            @click="goToBudget"
          >
            View all <ChevronRight :size="13" />
          </button>
        </div>

        <div v-if="catProgress.length === 0" style="padding:20px 0;text-align:center;color:var(--fg-4);font-size:13px">
          No categories yet
        </div>
        <div v-else>
          <div v-for="{ cat, spent } in catProgress" :key="cat.id" class="cat-progress-row">
            <CategoryChip :icon="cat.icon" :color="cat.color" size="sm" />
            <div class="cat-text">
              <div class="cat-name">{{ cat.name }}</div>
              <div style="margin-top:6px">
                <ProgressBar :value="spent" :max="cat.limit" :color="cat.color" />
              </div>
            </div>
            <div class="cat-amount">
              <div>{{ fmtMoneyShort(spent) }}</div>
              <div style="font-size:11px;color:var(--fg-4);font-weight:400">
                {{ cat.limit != null ? 'of ' + fmtMoneyShort(cat.limit) : 'no limit' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent transactions -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>
          <div class="h-title">Recent transactions</div>
          <div style="font-size:12px;color:var(--fg-3);margin-top:4px">Your last few spending items</div>
        </div>
        <button
          class="btn btn-ghost"
          style="padding:4px 8px;font-size:12px;gap:4px"
          @click="goToBudget"
        >
          See all <ChevronRight :size="13" />
        </button>
      </div>

      <div v-if="recentTx.length === 0" style="padding:20px 0;text-align:center;color:var(--fg-4);font-size:13px">
        No transactions yet
      </div>
      <div v-else>
        <button
          v-for="tx in recentTx"
          :key="tx.id"
          class="tx-row"
          @click="openItem(tx)"
        >
          <template v-if="store.categories.find(c => c.id === tx.categoryId) as any">
            <CategoryChip
              :icon="store.categories.find(c => c.id === tx.categoryId)!.icon"
              :color="store.categories.find(c => c.id === tx.categoryId)!.color"
            />
          </template>
          <div>
            <div class="tx-name">{{ tx.name }}</div>
            <div class="tx-sub">
              <span>{{ store.categories.find(c => c.id === tx.categoryId)?.name }}</span>
              <template v-if="tx.tag">
                <span style="color:var(--fg-5)">·</span>
                <span class="pill">{{ tx.tag }}</span>
              </template>
              <span style="color:var(--fg-5)">·</span>
              <span>{{ shortDate(parseDate(tx.date)) }}</span>
            </div>
          </div>
          <div class="tx-amount money-neg">−{{ fmtMoney(tx.price) }}</div>
        </button>
      </div>
    </div>
  </div>
</template>
