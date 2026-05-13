<script setup lang="ts">
import {
  Gamepad2, ShoppingCart, Shirt, Utensils, Car, RefreshCw,
  Home, Heart, Plane, Film, Coffee, BookOpen,
  Gift, PawPrint, Wrench, Sparkles,
} from 'lucide-vue-next';
import type { IconKey } from '@/@types/index';

const props = withDefaults(
  defineProps<{
    icon: IconKey;
    color: string;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  { size: 'md' },
);

const ICON_MAP: Record<IconKey, unknown> = {
  gamepad: Gamepad2,
  cart: ShoppingCart,
  shirt: Shirt,
  utensils: Utensils,
  car: Car,
  refresh: RefreshCw,
  house: Home,
  heart: Heart,
  plane: Plane,
  film: Film,
  coffee: Coffee,
  book: BookOpen,
  gift: Gift,
  pet: PawPrint,
  tools: Wrench,
  sparkle: Sparkles,
};

const iconSizes = { sm: 14, md: 18, lg: 24 } as const;
const iconSize = iconSizes[props.size];
const IconComponent = ICON_MAP[props.icon] ?? Sparkles;
</script>

<template>
  <div
    class="cat-chip"
    :class="size"
    :style="{
      background: color + '22',
      color: color,
      border: '1px solid ' + color + '33',
    }"
  >
    <component :is="IconComponent" :size="iconSize" :stroke-width="2.2" />
  </div>
</template>
