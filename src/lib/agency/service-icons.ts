import {
  Briefcase,
  Target,
  Megaphone,
  Globe2,
  Scale,
  ShieldCheck,
  Trophy,
  Star,
  Heart,
  Compass,
  Building2,
  Users,
  Handshake,
  Sparkles,
  Newspaper,
  GraduationCap,
  Camera,
  Plane,
  FileSignature,
  type LucideIcon,
} from "lucide-react";

export type ServiceIconKey =
  | "briefcase"
  | "target"
  | "megaphone"
  | "globe"
  | "scale"
  | "shield"
  | "trophy"
  | "star"
  | "heart"
  | "compass"
  | "building"
  | "users"
  | "handshake"
  | "sparkles"
  | "newspaper"
  | "education"
  | "camera"
  | "plane"
  | "contract";

export type ServiceIconOption = {
  key: ServiceIconKey;
  label: string;
  Icon: LucideIcon;
};

export const SERVICE_ICONS: ServiceIconOption[] = [
  { key: "briefcase", label: "Maletín", Icon: Briefcase },
  { key: "handshake", label: "Acuerdo", Icon: Handshake },
  { key: "target", label: "Objetivo", Icon: Target },
  { key: "trophy", label: "Trofeo", Icon: Trophy },
  { key: "star", label: "Estrella", Icon: Star },
  { key: "shield", label: "Escudo", Icon: ShieldCheck },
  { key: "scale", label: "Legal", Icon: Scale },
  { key: "contract", label: "Contrato", Icon: FileSignature },
  { key: "megaphone", label: "Marketing", Icon: Megaphone },
  { key: "newspaper", label: "Prensa", Icon: Newspaper },
  { key: "camera", label: "Multimedia", Icon: Camera },
  { key: "globe", label: "Global", Icon: Globe2 },
  { key: "compass", label: "Estrategia", Icon: Compass },
  { key: "plane", label: "Movilidad", Icon: Plane },
  { key: "building", label: "Institucional", Icon: Building2 },
  { key: "users", label: "Equipo", Icon: Users },
  { key: "education", label: "Formación", Icon: GraduationCap },
  { key: "sparkles", label: "Branding", Icon: Sparkles },
  { key: "heart", label: "Bienestar", Icon: Heart },
];

const ICON_BY_KEY: Record<string, LucideIcon> = SERVICE_ICONS.reduce(
  (acc, opt) => {
    acc[opt.key] = opt.Icon;
    return acc;
  },
  {} as Record<string, LucideIcon>,
);

export function resolveServiceIcon(key: string | null | undefined): LucideIcon {
  if (!key) return Briefcase;
  return ICON_BY_KEY[key] ?? Briefcase;
}
