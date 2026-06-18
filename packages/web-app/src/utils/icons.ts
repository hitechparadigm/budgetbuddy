/**
 * BudgetBuddy Icon Mapping
 *
 * Maps all navigation and feature icons to Lucide React components.
 * Using a central mapping ensures consistent icon usage and enables
 * easy swapping. Icons are tree-shakeable from lucide-react.
 *
 * Usage:
 *   import { NAV_ICONS } from '../utils/icons';
 *   <NAV_ICONS.budget className="w-5 h-5" />
 */

import {
  LayoutDashboard,
  Landmark,
  Users,
  Target,
  TrendingUp,
  Sparkles,
  FileText,
  RefreshCw,
  CreditCard,
  Award,
  MessageCircle,
  BookOpen,
  Settings2,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Home,
  PiggyBank,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/** Navigation icons — sidebar primary and secondary items */
export const NAV_ICONS: Record<string, LucideIcon> = {
  // Primary nav
  overview: LayoutDashboard,
  budget: LayoutDashboard,
  accounts: Landmark,
  members: Users,
  goals: Target,
  investments: TrendingUp,
  insights: Sparkles,
  // Manage group
  bills: FileText,
  subscriptions: RefreshCw,
  debts: CreditCard,
  'credit-score': Award,
  'net-worth': Wallet,
  // Secondary nav
  tips: MessageCircle,
  learn: BookOpen,
  settings: Settings2,
  // Utility
  logout: LogOut,
  user: User,
  manage: LayoutGrid,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
} as const;

/** Onboarding budget type icons */
export const BUDGET_TYPE_ICONS: Record<string, LucideIcon> = {
  personal: User,
  family: Users,
  shared: Home,
} as const;

/** Goal category icons — used in GoalsPage */
export const GOAL_ICONS: Record<string, LucideIcon> = {
  savings: PiggyBank,
  debt: CreditCard,
  investment: TrendingUp,
  general: Target,
} as const;

export type { LucideIcon };
