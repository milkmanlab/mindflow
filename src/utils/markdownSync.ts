import { t } from '../i18n';
import {
  CONNECTOR_STYLES,
  DEFAULT_CONNECTOR_STYLE,
  DEFAULT_LAYOUT_TYPE,
  MindMap,
  MindNode,
  MindRelationship,
  LayoutType,
  ConnectorStyle,
  NodeShape,
  NodeFontSize,
} from '../types';
import { DEFAULT_THEME_ID } from './themes';
import { generateId } from './id';
import { compareSiblingOrder } from './tree/treeQueries';
import { nextRootChildSide } from './rootSide';

export interface NodeMetadata {
  id?: string;
  side?: 'left' | 'right';
  color?: string;
  textColor?: string;
  icon?: string;
  progress?: number;
  shape?: NodeShape;
  fontSize?: NodeFontSize;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  isFolded?: boolean;
  note?: string;
  link?: string;
  image?: string;
  imageWidth?: number;
  imageAspect?: number;
}

// ノード内の改行（Alt+Enter）は 1 行の箇条書きに収めるため <br> として保存する
const encodeLineBreaks = (text: string) => text.replace(/\r?\n/g, '<br>');
const decodeLineBreaks = (text: string) => text.replace(/<br\s*\/?>/gi, '\n');

/**
 * Converts a MindMap into a well-structured, human-readable Markdown file (.md)
 * with YAML frontmatter for map settings and HTML comments for node metadata.
 */
export function mindMapToMarkdown(map: MindMap): string {
  const root = map.nodes[map.rootId];
  const rootText = encodeLineBreaks(root ? root.text : map.title || t('content.mapFallback'));

  // 1. YAML Frontmatter
  const frontmatterLines = [
    '---',
    `title: "${(map.title || rootText).replace(/"/g, '\\"')}"`,
    `layoutType: ${map.layoutType || DEFAULT_LAYOUT_TYPE}`,
    `themeId: ${map.themeId || DEFAULT_THEME_ID}`,
    `connectorStyle: ${map.connectorStyle || DEFAULT_CONNECTOR_STYLE}`,
  ];
  if (map.fontFamily) {
    frontmatterLines.push(`fontFamily: ${map.fontFamily}`);
  }
  frontmatterLines.push(`updatedAt: ${new Date(map.updatedAt || Date.now()).toISOString()}`);
  frontmatterLines.push('---', '');

  // 2. Main Title (H1)
  const lines: string[] = [...frontmatterLines, `# ${rootText}`];

  // If root has metadata (note, link, etc)
  if (root) {
    const rootMeta = getNodeMeta(root);
    if (Object.keys(rootMeta).length > 0) {
      lines.push(`<!-- mindflow-meta:${JSON.stringify(rootMeta)} -->`);
    }
  }
  lines.push('');

  // 3. Recursive tree to bullet list
  function serializeSubtree(nodeId: string, depth: number) {
    const children = Object.values(map.nodes)
      .filter((n) => n.parentId === nodeId)
      .sort(compareSiblingOrder);

    for (const child of children) {
      const indent = '  '.repeat(depth);
      const text = encodeLineBreaks(child.text);
      let line = `${indent}- ${text}`;

      // Append task completion indicator if progress is 100%
      if (child.progress === 100) {
        line = `${indent}- [x] ${text}`;
      } else if (child.progress !== undefined && child.progress > 0) {
        line = `${indent}- [ ] ${text} (${child.progress}%)`;
      }

      // Metadata serialization
      const meta = getNodeMeta(child);
      if (Object.keys(meta).length > 0) {
        line += ` <!-- mindflow:${JSON.stringify(meta)} -->`;
      }

      lines.push(line);

      // Recurse children
      serializeSubtree(child.id, depth + 1);
    }
  }

  if (root) {
    serializeSubtree(root.id, 0);
  }

  // 4. Relationships serialization
  if (map.relationships && Object.keys(map.relationships).length > 0) {
    const validRels = Object.values(map.relationships).filter(
      (r) => map.nodes[r.sourceId] && map.nodes[r.targetId]
    );
    if (validRels.length > 0) {
      lines.push('', `<!-- mindflow-relations:${JSON.stringify(validRels)} -->`);
    }
  }

  return lines.join('\n');
}

/**
 * Extracts serializable node metadata, omitting defaults
 */
function getNodeMeta(node: MindNode): NodeMetadata {
  const meta: NodeMetadata = {};
  if (node.id) meta.id = node.id;
  if (node.side) meta.side = node.side;
  if (node.color) meta.color = node.color;
  if (node.textColor) meta.textColor = node.textColor;
  if (node.icon) meta.icon = node.icon;
  if (node.progress !== undefined && node.progress !== 0 && node.progress !== 100) {
    meta.progress = node.progress;
  }
  if (node.shape && node.shape !== 'rounded') meta.shape = node.shape;
  if (node.fontSize && node.fontSize !== 'base') meta.fontSize = node.fontSize;
  if (node.bold) meta.bold = true;
  if (node.italic) meta.italic = true;
  if (node.underline) meta.underline = true;
  if (node.isFolded) meta.isFolded = true;
  if (node.note) meta.note = node.note;
  if (node.link) meta.link = node.link;
  if (node.image) {
    meta.image = node.image;
    if (node.imageWidth) meta.imageWidth = node.imageWidth;
    if (node.imageAspect) meta.imageAspect = node.imageAspect;
  }
  return meta;
}

/** 知らない接続線の種類（手で書き換えた値など）は既定の接続線として扱う */
function isConnectorStyle(value: string): value is ConnectorStyle {
  return (CONNECTOR_STYLES as readonly string[]).includes(value);
}

/** フロントマター（YAML）から読み取る、マップの設定 */
interface MapSettings {
  title?: string;
  layoutType: LayoutType;
  themeId: string;
  connectorStyle: ConnectorStyle;
  fontFamily?: string;
  updatedAt?: number;
}

/** 設定の 1 行（key: value）を settings に反映する。知らないキーと不正な値は読み飛ばす */
function applyFrontmatterEntry(settings: MapSettings, key: string, val: string): void {
  if (key === 'title' && val) settings.title = val;
  if (key === 'layoutType' && val) {
    settings.layoutType = (val === 'vertical-tree' ? 'tree-right' : val) as LayoutType;
  }
  if (key === 'themeId' && val) settings.themeId = val;
  if (key === 'connectorStyle' && isConnectorStyle(val)) settings.connectorStyle = val;
  if (key === 'fontFamily' && val) settings.fontFamily = val;
  if (key === 'updatedAt' && val) {
    const t = Date.parse(val);
    if (!Number.isNaN(t)) settings.updatedAt = t;
  }
}

/** 1. フロントマターを読み、設定と、フロントマターを除いた本文の行を返す */
function parseFrontmatter(rawLines: string[]): { settings: MapSettings; contentLines: string[] } {
  const settings: MapSettings = {
    layoutType: DEFAULT_LAYOUT_TYPE,
    themeId: DEFAULT_THEME_ID,
    connectorStyle: DEFAULT_CONNECTOR_STYLE,
  };
  const contentLines: string[] = [];
  let inFrontmatter = false;
  let frontmatterParsed = false;

  for (const line of rawLines) {
    const trimmed = line.trim();

    if (!frontmatterParsed && !inFrontmatter) {
      if (trimmed === '') continue;
      if (trimmed === '---') {
        inFrontmatter = true;
        continue;
      }
    }

    if (inFrontmatter) {
      if (trimmed === '---') {
        inFrontmatter = false;
        frontmatterParsed = true;
        continue;
      }
      const kvMatch = line.match(/^([a-zA-Z0-9_]+)\s*:\s*(.*)$/);
      if (kvMatch) {
        applyFrontmatterEntry(settings, kvMatch[1].trim(), kvMatch[2].trim().replace(/^["']|["']$/g, ''));
      }
      continue;
    }

    contentLines.push(line);
  }
  return { settings, contentLines };
}

/** 2. ルートの見出し（# 題名）と、直後のメタデータのコメントを探す。箇条書きはその次の行から始まる */
function parseRootHeader(
  contentLines: string[],
  fallbackTitle: string
): { rootTitle: string; rootMeta: NodeMetadata; contentStartIndex: number } {
  let rootTitle = fallbackTitle;
  let rootMeta: NodeMetadata = {};
  let contentStartIndex = 0;

  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i].trim();
    if (line.startsWith('#')) {
      rootTitle = decodeLineBreaks(line.replace(/^#+\s*/, '').trim());
      contentStartIndex = i + 1;

      // 次の行にルートのメタデータがあれば読む
      if (contentStartIndex < contentLines.length) {
        const metaMatch = contentLines[contentStartIndex].trim().match(/<!--\s*mindflow-meta:(.*?)\s*-->/);
        if (metaMatch) {
          try {
            rootMeta = JSON.parse(metaMatch[1]);
          } catch {
            // 壊れた JSON は、既定値のまま読み進める（development-guidelines 1.8）
          }
          contentStartIndex++;
        }
      }
      break;
    } else if (line.length > 0 && !line.startsWith('-') && !line.startsWith('*')) {
      // 見出しがなければ、最初の空でない文をルートの題名にする
      rootTitle = line;
      contentStartIndex = i + 1;
      break;
    }
  }
  return { rootTitle, rootMeta, contentStartIndex };
}

/** 関連線のコメント（<!-- mindflow-relations:[...] -->）の中身を読む。壊れた要素は読み飛ばす */
function parseRelationsComment(json: string): MindRelationship[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    // 壊れた JSON は、関連線なしとして読み進める（development-guidelines 1.8）
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const relationships: MindRelationship[] = [];
  for (const r of parsed as Array<Record<string, unknown> | null>) {
    if (r && r.id && r.sourceId && r.targetId) {
      relationships.push({
        id: String(r.id),
        sourceId: String(r.sourceId),
        targetId: String(r.targetId),
        label: r.label ? String(r.label) : undefined,
        color: r.color ? String(r.color) : undefined,
        style: r.style === 'solid' ? 'solid' : 'dashed',
        arrow: r.arrow === 'both' || r.arrow === 'none' ? r.arrow : 'forward',
      });
    }
  }
  return relationships;
}

/** 箇条書き 1 行から読み取った中身 */
interface ParsedBullet {
  /** 入れ子の深さ（インデント 2 スペースで 1 段） */
  level: number;
  text: string;
  /** タスクのチェックボックスか、行末の「(50%)」から決まった進捗。なければメタデータの値を使う */
  progress?: number;
  meta: NodeMetadata;
  /** 本文の中の ![代替文](URL) の URL */
  inlineImage?: string;
}

/** 3a. 箇条書きの 1 行を読む（箇条書きでない行は null） */
function parseBulletLine(rawLine: string): ParsedBullet | null {
  // インデントと、箇条書きの記号（-, *, +, 1.）
  const bulletMatch = rawLine.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.*)$/);
  if (!bulletMatch) return null;

  const level = Math.floor(bulletMatch[1].replace(/\t/g, '  ').length / 2);
  let textAndMeta = bulletMatch[2].trim();

  // タスクのチェックボックス：[x] は 100%、[ ] は進捗を別に読む
  let progress: number | undefined = undefined;
  let isOpenTask = false;
  if (textAndMeta.startsWith('[x] ') || textAndMeta.startsWith('[X] ')) {
    progress = 100;
    textAndMeta = textAndMeta.substring(4).trim();
  } else if (textAndMeta.startsWith('[ ] ')) {
    isOpenTask = true;
    textAndMeta = textAndMeta.substring(4).trim();
  }

  // 行末のメタデータ <!-- mindflow:{...} --> を取り出す（行末の「(50%)」を探すより先に取り除く）
  let meta: NodeMetadata = {};
  const metaMatch = textAndMeta.match(/<!--\s*mindflow:(.*?)\s*-->/);
  if (metaMatch) {
    try {
      meta = JSON.parse(metaMatch[1]);
    } catch {
      // 壊れた JSON は、属性なしとして読み進める（development-guidelines 1.8）
    }
    textAndMeta = textAndMeta.replace(/<!--\s*mindflow:.*?\s*-->/, '').trim();
  }

  if (isOpenTask) {
    // 行末の「(50%)」。なければメタデータの値、それもなければ 0
    const pctMatch = textAndMeta.match(/\((\d+)%\)$/);
    if (pctMatch) {
      progress = Math.min(100, Math.max(0, parseInt(pctMatch[1], 10)));
      textAndMeta = textAndMeta.replace(/\s*\(\d+%\)$/, '').trim();
    } else {
      progress = meta.progress ?? 0;
    }
  }

  // 本文の中の画像 ![代替文](URL)
  let inlineImage: string | undefined = undefined;
  const imgMatch = textAndMeta.match(/!\[(.*?)\]\((.*?)\)/);
  if (imgMatch) {
    inlineImage = imgMatch[2].trim();
    textAndMeta = textAndMeta.replace(/!\[(.*?)\]\(.*?\)/, '$1').trim();
  }

  return { level, text: textAndMeta, progress, meta, inlineImage };
}

/** 新しいノードの左右。ルートの子は、メタデータか、レイアウトの既定（マインドマップ型は rootSide.ts の決まり）。孫以降は親に従う */
function resolveSide(
  parentIsRoot: boolean,
  parentSide: 'left' | 'right' | undefined,
  metaSide: 'left' | 'right' | undefined,
  layoutType: LayoutType,
  rootSides: { right: number; left: number }
): 'left' | 'right' {
  if (!parentIsRoot) return parentSide || 'right';
  const defaultSide =
    layoutType === 'tree-right' ? 'right' : layoutType === 'tree-left' ? 'left' : nextRootChildSide(rootSides.right, rootSides.left);
  return metaSide || defaultSide;
}

/** 3. 箇条書きの入れ子を、ルートの下のノードの木にする。関連線のコメントも、ここで集める */
function parseBulletTree(
  contentLines: string[],
  startIndex: number,
  rootId: string,
  nodes: Record<string, MindNode>,
  layoutType: LayoutType,
  now: number
): MindRelationship[] {
  const relationships: MindRelationship[] = [];
  const stack: { level: number; id: string; side?: 'left' | 'right' }[] = [{ level: -1, id: rootId }];
  const childCounts: Record<string, number> = {};
  const rootSides = { right: 0, left: 0 };

  for (let i = startIndex; i < contentLines.length; i++) {
    const rawLine = contentLines[i];
    if (!rawLine.trim()) continue;

    const relMatch = rawLine.match(/<!--\s*mindflow-relations:(.*?)\s*-->/);
    if (relMatch) {
      relationships.push(...parseRelationsComment(relMatch[1]));
      continue;
    }

    const bullet = parseBulletLine(rawLine);
    if (!bullet) continue;
    const { level, meta } = bullet;

    // 親を探す：自分より深い（同じ深さを含む）ものを、スタックから外す
    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    const parentIsRoot = parent.id === rootId;
    const nodeId = meta.id || generateId();
    const side = resolveSide(parentIsRoot, parent.side, meta.side, layoutType, rootSides);
    if (parentIsRoot) rootSides[side]++;

    const order = childCounts[parent.id] ?? 0;
    childCounts[parent.id] = order + 1;

    nodes[nodeId] = {
      id: nodeId,
      parentId: parent.id,
      // Mindflow 自身が書き出した空ノード（id 付き）は空のまま往復させる
      text: decodeLineBreaks(bullet.text) || (meta.id ? '' : t('content.nodeFallback')),
      side,
      order,
      progress: bullet.progress !== undefined ? bullet.progress : meta.progress,
      color: meta.color,
      textColor: meta.textColor,
      icon: meta.icon,
      shape: meta.shape,
      fontSize: meta.fontSize,
      bold: meta.bold,
      italic: meta.italic,
      underline: meta.underline,
      isFolded: meta.isFolded,
      note: meta.note,
      link: meta.link,
      image: meta.image || bullet.inlineImage,
      imageWidth: meta.imageWidth,
      imageAspect: meta.imageAspect,
      createdAt: now + i,
      updatedAt: now + i,
    };

    stack.push({ level, id: nodeId, side });
  }
  return relationships;
}

/** 4. 関連線のうち、両端のノードが存在するものだけを残す（id が重なれば、あとのものが勝つ） */
function sanitizeRelationships(
  relationships: MindRelationship[],
  nodes: Record<string, MindNode>
): Record<string, MindRelationship> {
  const sanitized: Record<string, MindRelationship> = {};
  for (const rel of relationships) {
    if (nodes[rel.sourceId] && nodes[rel.targetId]) sanitized[rel.id] = rel;
  }
  return sanitized;
}

/**
 * Markdown を MindMap に読み込む（mindMapToMarkdown の逆）。
 * 段階：フロントマター → ルートの見出し → 箇条書きの木 → 関連線の整理
 */
export function markdownToMindMap(markdown: string, fallbackTitle = t('content.mapFallback')): MindMap {
  const { settings, contentLines } = parseFrontmatter(markdown.split(/\r?\n/));
  const { rootTitle, rootMeta, contentStartIndex } = parseRootHeader(contentLines, settings.title || fallbackTitle);

  const now = Date.now();
  const rootId = rootMeta.id || generateId();
  const nodes: Record<string, MindNode> = {
    [rootId]: {
      id: rootId,
      parentId: null,
      text: rootTitle,
      ...rootMeta,
      createdAt: now,
      updatedAt: now,
    },
  };

  const rawRelationships = parseBulletTree(contentLines, contentStartIndex, rootId, nodes, settings.layoutType, now);
  const relationships = sanitizeRelationships(rawRelationships, nodes);

  return {
    id: 'map_' + Date.now().toString(36),
    title: settings.title || rootTitle,
    rootId,
    nodes,
    relationships: Object.keys(relationships).length > 0 ? relationships : undefined,
    themeId: settings.themeId,
    fontFamily: settings.fontFamily,
    layoutType: settings.layoutType,
    connectorStyle: settings.connectorStyle,
    createdAt: now,
    // 再シリアライズしても同じ Markdown になるよう、保存済みの更新日時を引き継ぐ
    updatedAt: settings.updatedAt ?? now,
  };
}
