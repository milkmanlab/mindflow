import { MessageKey } from '../i18n';
import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  Coffee,
  Compass,
  Flag,
  Flame,
  Folder,
  Heart,
  HelpCircle,
  Layers,
  Lightbulb,
  Rocket,
  Sparkles,
  Star,
  Tag,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * ノードに付けられるアイコン。名前・ラベル・部品を 1 か所で管理する。
 * 部品は名前を指定して取り込む（`import * as` にすると、使わない 1,000 個以上のアイコンまでバンドルに入る）。
 * 足したときは、書き出し用の exportIcons.ts にも足す（exportIcons.test.ts が足し忘れを検出する）
 */
export const AVAILABLE_ICONS: { name: string; labelKey: MessageKey; Icon: LucideIcon }[] = [
  { name: 'Lightbulb', labelKey: 'icon.Lightbulb', Icon: Lightbulb },
  { name: 'Rocket', labelKey: 'icon.Rocket', Icon: Rocket },
  { name: 'Target', labelKey: 'icon.Target', Icon: Target },
  { name: 'Star', labelKey: 'icon.Star', Icon: Star },
  { name: 'Flame', labelKey: 'icon.Flame', Icon: Flame },
  { name: 'CheckCircle', labelKey: 'icon.CheckCircle', Icon: CheckCircle },
  { name: 'AlertCircle', labelKey: 'icon.AlertCircle', Icon: AlertCircle },
  { name: 'AlertTriangle', labelKey: 'icon.AlertTriangle', Icon: AlertTriangle },
  { name: 'Heart', labelKey: 'icon.Heart', Icon: Heart },
  { name: 'Flag', labelKey: 'icon.Flag', Icon: Flag },
  { name: 'Clock', labelKey: 'icon.Clock', Icon: Clock },
  { name: 'Calendar', labelKey: 'icon.Calendar', Icon: Calendar },
  { name: 'Layers', labelKey: 'icon.Layers', Icon: Layers },
  { name: 'Zap', labelKey: 'icon.Zap', Icon: Zap },
  { name: 'Compass', labelKey: 'icon.Compass', Icon: Compass },
  { name: 'Sparkles', labelKey: 'icon.Sparkles', Icon: Sparkles },
  { name: 'HelpCircle', labelKey: 'icon.HelpCircle', Icon: HelpCircle },
  { name: 'Folder', labelKey: 'icon.Folder', Icon: Folder },
  { name: 'BookOpen', labelKey: 'icon.BookOpen', Icon: BookOpen },
  { name: 'Coffee', labelKey: 'icon.Coffee', Icon: Coffee },
];

const ICON_BY_NAME: Record<string, LucideIcon> = Object.fromEntries(
  AVAILABLE_ICONS.map((item) => [item.name, item.Icon])
);

interface IconRendererProps {
  name?: string;
  className?: string;
  size?: number;
}

/** 名前のアイコンを描く。一覧にない名前（手で書いた Markdown など）は Tag になる */
export const IconRenderer: React.FC<IconRendererProps> = ({
  name,
  className = 'w-4 h-4',
  size,
}) => {
  if (!name) return null;

  const IconComponent = Object.hasOwn(ICON_BY_NAME, name) ? ICON_BY_NAME[name] : Tag;
  return <IconComponent className={className} size={size} />;
};
