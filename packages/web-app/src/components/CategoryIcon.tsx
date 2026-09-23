/**
 * CategoryIcon — Colored circular badge for budget categories
 *
 * Both Budge and Budgety use colored icon badges as a core UX pattern.
 * Color + shape scanning is faster than reading text — this replaces plain emoji.
 *
 * Usage:
 *   <CategoryIcon name="Food" size="md" />
 *   <CategoryIcon name="Transport" emoji="🚗" size="lg" />
 */

import React from 'react';

export type CategoryIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface CategoryIconProps {
  /** Category name used to determine color (case-insensitive substring match) */
  name: string;
  /** Explicit emoji to display inside the badge. Falls back to initials if not provided. */
  emoji?: string;
  /** Badge size */
  size?: CategoryIconSize;
  /** Optional className override */
  className?: string;
}

// ─── Color map — category name → background color ────────────────────────────
// Matches mobile-ux-design.md §Design System → Category Color Map
const CATEGORY_COLORS: [RegExp, string][] = [
  [/supermarket|grocery|groceries/i,       '#EF4444'],  // red
  [/food|restaurant|dining|eat|lunch|coffee/i, '#F97316'],  // orange
  [/transport|car|auto|gas|fuel|uber|lyft|transit|bus|subway/i, '#3B82F6'],  // blue
  [/housing|house|rent|mortgage|home|apartment/i, '#8B5CF6'],  // violet
  [/utilities|electric|water|hydro|internet|phone|utility/i, '#06B6D4'],  // cyan
  [/entertainment|movies|streaming|netflix|spotify|game|hobby/i, '#EC4899'],  // pink
  [/health|medical|doctor|pharmacy|gym|fitness|dental|vision/i, '#10B981'],  // emerald
  [/education|school|tuition|course|book|learn|child|childcare/i, '#22C55E'],  // green
  [/clothing|clothes|fashion|shoes|apparel/i, '#A78BFA'],  // purple
  [/travel|vacation|flight|hotel|trip|airbnb/i, '#0EA5E9'],  // sky
  [/gifts|gift|donation|charity|present/i, '#F59E0B'],  // amber
  [/work|business|office|professional|freelance/i, '#6366F1'],  // indigo
  [/electronics|tech|computer|phone|gadget|device/i, '#64748B'],  // slate
  [/sport|fitness|workout|yoga|outdoor/i, '#84CC16'],  // lime
  [/savings|emergency|saving|invest/i, '#10B981'],  // emerald
  [/income|salary|paycheck|wage|freelance income/i, '#22C55E'],  // green
  [/transfer|move/i, '#94A3B8'],  // gray
  [/pets|pet|dog|cat|vet/i, '#F97316'],  // orange
  [/kids|baby|children|daycare/i, '#EC4899'],  // pink
  [/insurance|life insurance|auto insurance/i, '#6366F1'],  // indigo
  [/subscriptions?|subscription/i, '#8B5CF6'],  // violet
  [/bills?|utility/i, '#06B6D4'],  // cyan
];

const DEFAULT_COLOR = '#6366F1'; // indigo fallback

function getCategoryColor(name: string): string {
  for (const [pattern, color] of CATEGORY_COLORS) {
    if (pattern.test(name)) return color;
  }
  return DEFAULT_COLOR;
}

// ─── Emoji fallback — derive initials from name ───────────────────────────────
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// ─── Size config ─────────────────────────────────────────────────────────────
const SIZE_CONFIG: Record<CategoryIconSize, { badge: string; text: string; emoji: string }> = {
  xs:  { badge: 'w-6 h-6',   text: 'text-[9px]',  emoji: 'text-[11px]' },
  sm:  { badge: 'w-8 h-8',   text: 'text-[10px]', emoji: 'text-sm' },
  md:  { badge: 'w-10 h-10', text: 'text-xs',     emoji: 'text-base' },
  lg:  { badge: 'w-12 h-12', text: 'text-sm',     emoji: 'text-xl' },
  xl:  { badge: 'w-16 h-16', text: 'text-base',   emoji: 'text-3xl' },
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  emoji,
  size = 'md',
  className = '',
}) => {
  const color = getCategoryColor(name);
  const { badge, text, emoji: emojiSize } = SIZE_CONFIG[size];

  return (
    <span
      role="img"
      aria-label={name}
      className={`
        inline-flex items-center justify-center
        rounded-full shrink-0 select-none
        ${badge} ${className}
      `}
      style={{
        backgroundColor: color + '22',  // 13% opacity tint
        border: `1.5px solid ${color}44`, // 27% opacity border
      }}
    >
      {emoji ? (
        <span className={emojiSize} aria-hidden="true">{emoji}</span>
      ) : (
        <span
          className={`font-bold ${text}`}
          style={{ color }}
          aria-hidden="true"
        >
          {getInitials(name)}
        </span>
      )}
    </span>
  );
};

export default CategoryIcon;
