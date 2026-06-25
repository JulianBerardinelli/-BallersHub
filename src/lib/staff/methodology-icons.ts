// Set curado de íconos para los rubros de Metodología (staff). El rubro guarda
// una KEY estable (string) en coach_methodology_rubros.icon; nunca importamos un
// nombre arbitrario. Compartido por el editor (picker) y los renderers públicos.
import {
  Target,
  ClipboardList,
  Activity,
  Shield,
  Zap,
  Users,
  Brain,
  TrendingUp,
  HeartPulse,
  BookOpen,
  Video,
  Dumbbell,
  Compass,
  Lightbulb,
  Flag,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export const METHODOLOGY_ICONS: Record<string, LucideIcon> = {
  target: Target,
  clipboard: ClipboardList,
  activity: Activity,
  shield: Shield,
  zap: Zap,
  users: Users,
  brain: Brain,
  trending: TrendingUp,
  health: HeartPulse,
  book: BookOpen,
  video: Video,
  dumbbell: Dumbbell,
  compass: Compass,
  idea: Lightbulb,
  flag: Flag,
  trophy: Trophy,
};

export const METHODOLOGY_ICON_KEYS = Object.keys(METHODOLOGY_ICONS);
export const DEFAULT_METHODOLOGY_ICON = "target";

/** Devuelve el componente lucide para la key guardada, o null si no está. */
export function methodologyIcon(key: string | null | undefined): LucideIcon | null {
  if (!key) return null;
  return METHODOLOGY_ICONS[key] ?? null;
}

/** Valida que una key sea de la lista permitida (para las server actions). */
export function isMethodologyIconKey(key: unknown): key is string {
  return typeof key === "string" && key in METHODOLOGY_ICONS;
}
