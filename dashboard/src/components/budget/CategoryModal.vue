<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  Gamepad2, ShoppingCart, Shirt, Utensils, Car, RefreshCw,
  Home, Heart, Plane, Film, Coffee, BookOpen,
  Gift, PawPrint, Wrench, Sparkles,
  Folder, X, Check, Trash2,
} from 'lucide-vue-next';
import type { IconKey } from '@/@types/index';
import { PALETTE, ICON_KEYS, ordinal } from '@/lib/budget';
import CategoryChip from '@/components/budget/CategoryChip.vue';
import ProgressBar from '@/components/budget/ProgressBar.vue';
import { useBudgetStore } from '@/stores/budget';
import { useRouter } from 'vue-router';

const store = useBudgetStore();
const router = useRouter();

const ICON_MAP: Record<IconKey, unknown> = {
  gamepad: Gamepad2, cart: ShoppingCart, shirt: Shirt, utensils: Utensils,
  car: Car, refresh: RefreshCw, house: Home, heart: Heart,
  plane: Plane, film: Film, coffee: Coffee, book: BookOpen,
  gift: Gift, pet: PawPrint, tools: Wrench, sparkle: Sparkles,
};

const blank = () => ({
  name: '',
  icon: 'sparkle' as IconKey,
  color: PALETTE[0],
  resetDay: 1,
  limit: '' as string | number,
});

const draft = ref(blank());

watch(
  () => store.catModal,
  (modal) => {
    if (!modal.open) return;
    if (modal.mode === 'edit') {
      draft.value = {
        ...modal.initial,
        limit: modal.initial.limit == null ? '' : modal.initial.limit,
      };
    } else {
      draft.value = blank();
    }
  },
  { immediate: true },
);

const mode = computed(() =>
  store.catModal.open ? store.catModal.mode : 'create',
);

const previewCat = computed(() => ({
  id: 'preview',
  name: draft.value.name || 'Category name',
  icon: draft.value.icon,
  color: draft.value.color,
  resetDay: draft.value.resetDay,
  limit: draft.value.limit === '' ? null : Number(draft.value.limit),
}));

const canSubmit = computed(() => draft.value.name.trim().length > 0);

function submit() {
  if (!canSubmit.value) return;
  const id = store.saveCategoryModal({
    name: draft.value.name.trim(),
    icon: draft.value.icon,
    color: draft.value.color,
    resetDay: draft.value.resetDay,
    limit: draft.value.limit === '' ? null : Math.max(0, Number(draft.value.limit)),
  });
  if (mode.value === 'create' && id) {
    router.push({ name: 'budget-category', params: { categoryId: id } });
  }
}

function handleDelete() {
  store.deleteCategoryModal();
}

function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) store.closeCategoryModal();
}
</script>

<template>
  <Teleport to="body">
    <Transition name="nb-backdrop">
      <div
        v-if="store.catModal.open"
        class="nb-modal-backdrop"
        @mousedown="onBackdropClick"
      >
        <Transition name="nb-modal" appear>
          <div class="nb-modal" @mousedown.stop>
            <!-- Header -->
            <div class="nb-modal-header">
              <div class="nb-modal-breadcrumb">
                <Folder :size="15" />
                <span>Budget / {{ mode === 'edit' ? 'Edit category' : 'New category' }}</span>
              </div>
              <button class="btn-icon" aria-label="Close" @click="store.closeCategoryModal()">
                <X :size="18" />
              </button>
            </div>

            <!-- Body -->
            <div class="nb-modal-body two-col">
              <!-- Left: form -->
              <div>
                <!-- Name + live chip -->
                <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px">
                  <CategoryChip :icon="previewCat.icon" :color="previewCat.color" size="lg" />
                  <input
                    v-model="draft.name"
                    autofocus
                    type="text"
                    class="nb-input"
                    style="font-size:22px;font-weight:700;letter-spacing:-0.01em;padding:10px 14px"
                    placeholder="Category name"
                    @keydown.enter="submit"
                  />
                </div>

                <!-- Icon -->
                <div class="nb-field">
                  <span class="nb-field-label">Icon</span>
                  <div class="icon-picker">
                    <button
                      v-for="key in ICON_KEYS"
                      :key="key"
                      type="button"
                      :class="{ active: draft.icon === key }"
                      :aria-label="key"
                      @click="draft.icon = key"
                    >
                      <component :is="ICON_MAP[key]" :size="18" :stroke-width="2.2" />
                    </button>
                  </div>
                </div>

                <!-- Color -->
                <div class="nb-field">
                  <span class="nb-field-label">Color</span>
                  <div class="color-picker">
                    <button
                      v-for="c in PALETTE"
                      :key="c"
                      type="button"
                      :class="{ active: draft.color === c }"
                      :style="{ background: c }"
                      :aria-label="c"
                      @click="draft.color = c"
                    >
                      <Check v-if="draft.color === c" :size="14" :stroke-width="3" style="color:#08080a" />
                    </button>
                  </div>
                </div>

                <!-- Reset day + limit -->
                <div class="nb-field-row">
                  <div class="nb-field">
                    <span class="nb-field-label">Reset day of month</span>
                    <div class="day-grid">
                      <button
                        v-for="d in 31"
                        :key="d"
                        type="button"
                        :class="{ active: draft.resetDay === d }"
                        @click="draft.resetDay = d"
                      >{{ d }}</button>
                    </div>
                    <span class="nb-field-hint">
                      Budget resets on the {{ ordinal(draft.resetDay) }} of each month.
                    </span>
                  </div>

                  <div class="nb-field">
                    <span class="nb-field-label">
                      Monthly limit
                      <span style="color:var(--fg-4);text-transform:none;letter-spacing:0;font-weight:500">· optional</span>
                    </span>
                    <div class="nb-input-prefix">
                      <span class="prefix">€</span>
                      <input
                        v-model="draft.limit"
                        type="number"
                        inputmode="decimal"
                        class="nb-input"
                        placeholder="No limit"
                        min="0"
                      />
                    </div>
                    <span class="nb-field-hint">Leave blank to track spending without a cap.</span>
                  </div>
                </div>
              </div>

              <!-- Right: preview pane -->
              <div class="preview-pane">
                <span class="label-caps" style="color:var(--fg-4)">Preview</span>
                <div class="preview-card">
                  <div style="display:flex;align-items:center;gap:12px">
                    <CategoryChip :icon="previewCat.icon" :color="previewCat.color" />
                    <div style="flex:1;min-width:0">
                      <div style="font-size:14px;font-weight:600;color:var(--fg-1)">{{ previewCat.name }}</div>
                      <div style="font-size:11.5px;color:var(--fg-3);margin-top:3px">
                        Resets {{ ordinal(draft.resetDay) }}
                        {{ previewCat.limit != null ? ' · €' + previewCat.limit + ' limit' : '' }}
                      </div>
                    </div>
                  </div>
                  <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--fg-3)">
                    <span>Spent this period</span>
                    <span style="color:var(--fg-1);font-weight:600">€42.50</span>
                  </div>
                  <div style="margin-top:6px">
                    <ProgressBar :value="42.5" :max="previewCat.limit ?? 100" :color="draft.color" />
                  </div>
                </div>
                <div style="font-size:12px;color:var(--fg-4);line-height:1.5">
                  This is how your category will appear in the sidebar and on the dashboard.
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="nb-modal-footer">
              <button v-if="mode === 'edit'" class="btn btn-danger-ghost left" @click="handleDelete">
                <Trash2 :size="15" /> Delete category
              </button>
              <button class="btn btn-ghost" @click="store.closeCategoryModal()">Cancel</button>
              <button class="btn btn-primary" :disabled="!canSubmit" @click="submit">
                {{ mode === 'edit' ? 'Save changes' : 'Create category' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
