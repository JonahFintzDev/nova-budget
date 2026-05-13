<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Folder, X, Trash2, ChevronDown } from 'lucide-vue-next';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import type { Transaction } from '@/@types/index';
import { todayIso } from '@/lib/budget';
import CategoryChip from '@/components/budget/CategoryChip.vue';
import { useBudgetStore } from '@/stores/budget';

const store = useBudgetStore();

const blank = (): Omit<Transaction, 'id'> => ({
  categoryId: store.categories[0]?.id ?? '',
  name: '',
  tag: '',
  price: 0,
  date: todayIso(),
});

const draft = ref<Omit<Transaction, 'id'> & { priceStr: string }>({
  ...blank(),
  priceStr: '',
});

const dropdownOpen = ref(false);

watch(
  () => store.itemModal,
  (modal) => {
    if (!modal.open) {
      dropdownOpen.value = false;
      return;
    }
    if (modal.mode === 'edit') {
      draft.value = { ...modal.initial, priceStr: String(modal.initial.price) };
    } else {
      const defaultCatId =
        modal.defaultCategoryId ?? store.categories[0]?.id ?? '';
      draft.value = { ...blank(), categoryId: defaultCatId, priceStr: '' };
    }
  },
  { immediate: true },
);

const mode = computed(() =>
  store.itemModal.open ? store.itemModal.mode : 'create',
);

const selectedCat = computed(() =>
  store.categories.find((c) => c.id === draft.value.categoryId),
);

const breadcrumb = computed(() => {
  const catName = selectedCat.value?.name ?? 'Spending';
  return `Budget / ${catName} / ${mode.value === 'edit' ? 'Edit item' : 'New item'}`;
});

const canSubmit = computed(
  () =>
    draft.value.name.trim().length > 0 &&
    draft.value.categoryId.length > 0 &&
    draft.value.priceStr !== '' &&
    Number(draft.value.priceStr) >= 0,
);

const tagSuggestions = computed(() =>
  store.knownTagsForCategory
    .filter((t) => t.toLowerCase() !== draft.value.tag.toLowerCase())
    .slice(0, 6),
);

function selectCategory(id: string) {
  draft.value.categoryId = id;
  dropdownOpen.value = false;
}

function submit() {
  if (!canSubmit.value) return;
  store.saveItemModal({
    categoryId: draft.value.categoryId,
    name: draft.value.name.trim(),
    tag: draft.value.tag.trim(),
    price: Math.max(0, Number(draft.value.priceStr)),
    date: draft.value.date,
  });
}

function handleDelete() {
  store.deleteItemModal();
}

function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) store.closeItemModal();
}

function onDocClick() {
  dropdownOpen.value = false;
}
</script>

<template>
  <Teleport to="body">
    <Transition name="nb-backdrop">
      <div
        v-if="store.itemModal.open"
        class="nb-modal-backdrop"
        @mousedown="onBackdropClick"
        @click="onDocClick"
      >
        <Transition name="nb-modal" appear>
          <div class="nb-modal" @mousedown.stop @click.stop>
            <!-- Header -->
            <div class="nb-modal-header">
              <div class="nb-modal-breadcrumb">
                <Folder :size="15" />
                <span>{{ breadcrumb }}</span>
              </div>
              <button class="btn-icon" aria-label="Close" @click="store.closeItemModal()">
                <X :size="18" />
              </button>
            </div>

            <!-- Body -->
            <div class="nb-modal-body">
              <!-- Name -->
              <div style="margin-bottom:22px">
                <input
                  v-model="draft.name"
                  autofocus
                  type="text"
                  class="nb-input"
                  style="font-size:22px;font-weight:700;letter-spacing:-0.01em;padding:12px 14px"
                  placeholder="What did you buy?"
                  @keydown.enter="submit"
                />
              </div>

              <!-- Row 1: category + price -->
              <div class="nb-field-row" style="margin-bottom:18px">
                <!-- Category dropdown -->
                <div class="nb-field">
                  <span class="nb-field-label">Category</span>
                  <div style="position:relative">
                    <button
                      type="button"
                      class="cat-select"
                      @click.stop="dropdownOpen = !dropdownOpen"
                    >
                      <CategoryChip
                        v-if="selectedCat"
                        :icon="selectedCat.icon"
                        :color="selectedCat.color"
                        size="sm"
                      />
                      <div v-else class="cat-chip sm" style="background:var(--bg-4)" />
                      <span class="name">{{ selectedCat?.name ?? 'Select category' }}</span>
                      <ChevronDown :size="16" class="chev" />
                    </button>
                    <div v-if="dropdownOpen" class="cat-dropdown">
                      <button
                        v-for="cat in store.categories"
                        :key="cat.id"
                        type="button"
                        @click.stop="selectCategory(cat.id)"
                      >
                        <CategoryChip :icon="cat.icon" :color="cat.color" size="sm" />
                        <span>{{ cat.name }}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Price -->
                <div class="nb-field">
                  <span class="nb-field-label">Price</span>
                  <div class="nb-input-prefix">
                    <span class="prefix">€</span>
                    <input
                      v-model="draft.priceStr"
                      type="number"
                      step="0.01"
                      inputmode="decimal"
                      class="nb-input"
                      placeholder="0.00"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <!-- Row 2: tag + date -->
              <div class="nb-field-row">
                <!-- Tag -->
                <div class="nb-field">
                  <span class="nb-field-label">Tag</span>
                  <input
                    v-model="draft.tag"
                    type="text"
                    class="nb-input"
                    placeholder="e.g. Steam, Rewe, Uber..."
                  />
                  <div v-if="tagSuggestions.length > 0" class="suggested-tags">
                    <button
                      v-for="t in tagSuggestions"
                      :key="t"
                      type="button"
                      @click="draft.tag = t"
                    >{{ t }}</button>
                  </div>
                </div>

                <!-- Date -->
                <div class="nb-field">
                  <span class="nb-field-label">Date</span>
                  <VueDatePicker
                    v-model="draft.date"
                    model-type="yyyy-MM-dd"
                    :enable-time-picker="false"
                    auto-apply
                    dark
                    :clearable="false"
                    input-class-name="nb-input"
                  />
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="nb-modal-footer">
              <button v-if="mode === 'edit'" class="btn btn-danger-ghost left" @click="handleDelete">
                <Trash2 :size="15" /> Delete item
              </button>
              <button class="btn btn-ghost" @click="store.closeItemModal()">Cancel</button>
              <button class="btn btn-primary" :disabled="!canSubmit" @click="submit">
                {{ mode === 'edit' ? 'Save changes' : 'Add spending' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
