import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  Coffee,
  Compass,
  ExternalLink,
  FileText,
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
} from 'lucide';

/**
 * 書き出し（SVG）用のアイコン。
 * 画面のアイコンは lucide-react のコンポーネントだが、SVG の文字列を作る側では使えないため、
 * 同じ版の lucide（React を使わない版）から、使う分だけを名前で取り込む（全部は入れない）。
 * ノードに付けられるアイコン（IconRenderer の AVAILABLE_ICONS）を足したときは、ここにも足す
 * （exportIcons.test.ts が、画面のアイコンとの一致と、足し忘れを確かめる）
 */
export type IconNodeEntry = [tag: string, attrs: Record<string, string | number | undefined>];

export const EXPORT_ICONS: Record<string, IconNodeEntry[]> = {
  Lightbulb,
  Rocket,
  Target,
  Star,
  Flame,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Heart,
  Flag,
  Clock,
  Calendar,
  Layers,
  Zap,
  Compass,
  Sparkles,
  HelpCircle,
  Folder,
  BookOpen,
  Coffee,
};

/** 一覧にない名前のときに描くアイコン（画面の IconRenderer と同じ Tag） */
export const FALLBACK_ICON = Tag;
/** 進捗 100% のチェック印・メモの印・リンクの印（画面の NodeInfoBadges と同じアイコン） */
export const CHECK_ICON = CheckCircle2;
export const NOTE_ICON = FileText;
export const LINK_ICON = ExternalLink;

function escapeAttr(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** アイコン 1 つを、左上を (x, y)・一辺 size の正方形に収めた SVG の要素にする */
export function renderIconSvg(icon: IconNodeEntry[], x: number, y: number, size: number, color: string): string {
  const children = icon
    .map(([tag, attrs]) => {
      // lucide 1.x の属性は undefined を取りうる。値のない属性は書き出さない（`foo="undefined"` を出さない）
      const attrText = Object.entries(attrs)
        .filter((entry): entry is [string, string | number] => entry[0] !== 'key' && entry[1] !== undefined)
        .map(([key, value]) => ` ${key}="${escapeAttr(value === 'currentColor' ? color : value)}"`)
        .join('');
      return `<${tag}${attrText} />`;
    })
    .join('');
  return (
    `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${escapeAttr(color)}" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</g>`
  );
}

/** ノードの icon の名前から、書き出し用のアイコンを引く。一覧にない名前は Tag */
export function getExportIcon(name: string): IconNodeEntry[] {
  return EXPORT_ICONS[name] ?? FALLBACK_ICON;
}
