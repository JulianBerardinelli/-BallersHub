// Maps the handoff's icon-name vocabulary to lucide-react components (the
// icon set already used across the app). No inline SVGs — every name resolves
// to a real lucide export.

import {
  Home,
  User,
  Search,
  Sparkles,
  Lock,
  Plus,
  Eye,
  Share2,
  LogOut,
  Trophy,
  Play,
  Globe,
  CreditCard,
  Settings,
  ChevronRight,
  Menu,
  Bell,
  LayoutDashboard,
  LayoutTemplate,
  LayoutGrid,
  Briefcase,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { DockIconName } from "./types";

export const DOCK_ICONS: Record<DockIconName, LucideIcon> = {
  home: Home,
  user: User,
  search: Search,
  sparkle: Sparkles,
  lock: Lock,
  plus: Plus,
  eye: Eye,
  share: Share2,
  logout: LogOut,
  trophy: Trophy,
  play: Play,
  globe: Globe,
  creditcard: CreditCard,
  cog: Settings,
  chevron: ChevronRight,
  menu: Menu,
  bell: Bell,
  panel: LayoutDashboard,
  layout: LayoutTemplate,
  grid: LayoutGrid,
  briefcase: Briefcase,
  users: Users,
};

type DockIconProps = {
  name: DockIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
};

export function DockIcon({ name, ...props }: DockIconProps) {
  const Cmp = DOCK_ICONS[name];
  return <Cmp aria-hidden {...props} />;
}
