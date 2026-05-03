import {
  Activity,
  Clock,
  Code,
  Eye,
  GitBranch,
  Globe,
  Play,
  Search,
  ShoppingCart,
  TrendingUp,
  Webhook,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ActionIconName } from "./registry";

export const TRIGGER_ICONS: Record<string, LucideIcon> = {
  Manual: Play,
  Schedule: Clock,
  Webhook: Webhook,
};

export const ACTION_ICONS: Record<ActionIconName, LucideIcon> = {
  Search,
  Activity,
  TrendingUp,
  ShoppingCart,
  X,
  Eye,
  Globe,
  GitBranch,
  Code,
};
