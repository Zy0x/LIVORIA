import type { Json } from '@/integrations/supabase/types';
import type { JSONContent } from '@tiptap/core';

export type CatatanDocument = JSONContent & { type: 'doc' };
type CatatanNode = JSONContent;

export const CATATAN_CONTENT_FORMAT = 'tiptap_json_v1' as const;

export const createEmptyCatatanDocument = (): CatatanDocument => ({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});

export const isCatatanDocument = (value: unknown): value is CatatanDocument => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as { type?: unknown; content?: unknown };
  return candidate.type === 'doc' && (candidate.content === undefined || Array.isArray(candidate.content));
};

export function textToCatatanDocument(text: string): CatatanDocument {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const content = lines.length > 0
    ? lines.map((line) => ({
        type: 'paragraph',
        content: line ? [{ type: 'text', text: line }] : undefined,
      }))
    : [{ type: 'paragraph' }];

  return { type: 'doc', content };
}

export function normalizeCatatanDocument(value: unknown, fallbackText = ''): CatatanDocument {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (isCatatanDocument(parsed)) return parsed;
    } catch {
      return textToCatatanDocument(value);
    }
  }

  if (isCatatanDocument(value)) return value;
  return fallbackText.trim() ? textToCatatanDocument(fallbackText) : createEmptyCatatanDocument();
}

export function catatanDocumentToPlainText(document: unknown): string {
  const doc = normalizeCatatanDocument(document);
  return renderPlainNodes(doc.content ?? []).trim();
}

export function catatanDocumentToMarkdown(document: unknown): string {
  const doc = normalizeCatatanDocument(document);
  return renderMarkdownBlocks(doc.content ?? []).trim();
}

export function catatanDocumentToJson(document: CatatanDocument): Json {
  return document as unknown as Json;
}

function renderPlainNodes(nodes: CatatanNode[]): string {
  return nodes.map((node) => renderPlainNode(node)).filter(Boolean).join('\n');
}

function renderPlainNode(node: CatatanNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (!node.content?.length) return '';
  if (node.type === 'bulletList' || node.type === 'orderedList' || node.type === 'taskList') {
    return node.content.map(renderPlainNode).filter(Boolean).join('\n');
  }
  if (node.type === 'listItem' || node.type === 'taskItem') {
    return renderPlainNodes(node.content);
  }
  return renderPlainNodes(node.content);
}

function renderMarkdownBlocks(nodes: CatatanNode[], depth = 0): string {
  return nodes.map((node, index) => renderMarkdownBlock(node, index, depth)).filter(Boolean).join('\n\n');
}

function renderMarkdownBlock(node: CatatanNode, index: number, depth: number): string {
  const children = node.content ?? [];
  const inline = renderMarkdownInline(children);

  switch (node.type) {
    case 'heading': {
      const level = Number(node.attrs?.level) || 2;
      return `${'#'.repeat(Math.min(Math.max(level, 1), 6))} ${inline}`;
    }
    case 'bulletList':
      return children.map((child) => `${'  '.repeat(depth)}- ${renderMarkdownListItem(child, depth)}`).join('\n');
    case 'orderedList':
      return children.map((child, childIndex) => `${'  '.repeat(depth)}${childIndex + 1}. ${renderMarkdownListItem(child, depth)}`).join('\n');
    case 'taskList':
      return children.map((child) => {
        const checked = child.attrs?.checked === true ? 'x' : ' ';
        return `${'  '.repeat(depth)}- [${checked}] ${renderMarkdownListItem(child, depth)}`;
      }).join('\n');
    case 'blockquote':
      return renderMarkdownBlocks(children, depth).split('\n').map((line) => `> ${line}`).join('\n');
    case 'codeBlock':
      return `\`\`\`\n${renderPlainNodes(children)}\n\`\`\``;
    case 'horizontalRule':
      return '---';
    case 'listItem':
    case 'taskItem':
      return renderMarkdownListItem(node, depth);
    case 'paragraph':
      return inline;
    default:
      return inline || renderMarkdownBlocks(children, depth);
  }
}

function renderMarkdownListItem(node: CatatanNode, depth: number): string {
  const parts = (node.content ?? []).map((child) => {
    if (child.type === 'bulletList' || child.type === 'orderedList' || child.type === 'taskList') {
      return `\n${renderMarkdownBlock(child, 0, depth + 1)}`;
    }
    return renderMarkdownBlock(child, 0, depth);
  });
  return parts.join('\n').trim();
}

function renderMarkdownInline(nodes: CatatanNode[]): string {
  return nodes.map((node) => {
    if (node.type !== 'text') return renderMarkdownBlocks(node.content ?? []);
    let text = escapeMarkdown(node.text ?? '');
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold') text = `**${text}**`;
      if (mark.type === 'italic') text = `_${text}_`;
      if (mark.type === 'strike') text = `~~${text}~~`;
      if (mark.type === 'code') text = `\`${text.replace(/`/g, '\\`')}\``;
      if (mark.type === 'link') {
        const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : '';
        if (href) text = `[${text}](${href})`;
      }
      if (mark.type === 'highlight') text = `==${text}==`;
      if (mark.type === 'underline') text = `<u>${text}</u>`;
    }
    return text;
  }).join('');
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\*_~`[\]])/g, '\\$1');
}
