import { Extension, mergeAttributes, Node } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Mathematics from '@tiptap/extension-mathematics';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TableKit } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import StarterKit from '@tiptap/starter-kit';
import { all, createLowlight } from 'lowlight';

const lowlight = createLowlight(all);

export const FontSizeExtension = Extension.create({
  name: 'catatanFontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
          },
        },
      },
    ];
  },
});

export const ListStyleExtension = Extension.create({
  name: 'catatanListStyle',
  addGlobalAttributes() {
    return [
      {
        types: ['bulletList', 'orderedList'],
        attributes: {
          listStyle: {
            default: null,
            parseHTML: (element) => element.style.listStyleType || null,
            renderHTML: (attributes) => attributes.listStyle ? { style: `list-style-type: ${attributes.listStyle}` } : {},
          },
        },
      },
    ];
  },
});

export const TableStyleExtension = Extension.create({
  name: 'catatanTableStyle',
  addGlobalAttributes() {
    return [
      {
        types: ['table'],
        attributes: {
          tableStyle: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-table-style'),
            renderHTML: (attributes) => attributes.tableStyle ? { 'data-table-style': attributes.tableStyle } : {},
          },
        },
      },
      {
        types: ['tableCell', 'tableHeader'],
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) => element.style.backgroundColor || null,
            renderHTML: (attributes) => attributes.backgroundColor ? { style: `background-color: ${attributes.backgroundColor}` } : {},
          },
        },
      },
    ];
  },
});

export const TabKeyExtension = Extension.create({
  name: 'catatanTabKey',
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.isActive('bulletList') || this.editor.isActive('orderedList') || this.editor.isActive('taskList')) {
          return this.editor.commands.sinkListItem('listItem') || this.editor.commands.sinkListItem('taskItem');
        }
        this.editor.commands.insertContent('\t');
        return true;
      },
      'Shift-Tab': () => {
        if (this.editor.isActive('bulletList') || this.editor.isActive('orderedList') || this.editor.isActive('taskList')) {
          return this.editor.commands.liftListItem('listItem') || this.editor.commands.liftListItem('taskItem');
        }
        return true;
      },
    };
  },
});

export const CatatanImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      objectPath: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-object-path'),
        renderHTML: (attributes) => attributes.objectPath ? { 'data-object-path': attributes.objectPath } : {},
      },
      assetId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-asset-id'),
        renderHTML: (attributes) => attributes.assetId ? { 'data-asset-id': attributes.assetId } : {},
      },
    };
  },
});

export const CatatanVideo = Node.create({
  name: 'catatanVideo',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: '' },
      objectPath: { default: null },
      assetId: { default: null },
      title: { default: 'Video Catatan' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-catatan-video]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-catatan-video': 'true',
        class: 'catatan-video-node',
      }),
      ['video', { controls: 'true', src: HTMLAttributes.src || '', title: HTMLAttributes.title || 'Video Catatan' }],
    ];
  },
});

export const CatatanDrawing = Node.create({
  name: 'catatanDrawing',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      svg: { default: '' },
      title: { default: 'Drawing' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-catatan-drawing]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const svg = String(HTMLAttributes.svg || '');
    const src = svg ? `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` : '';
    return [
      'div',
      mergeAttributes({ 'data-catatan-drawing': 'true', class: 'catatan-drawing-node' }),
      ['div', { class: 'catatan-drawing-label' }, HTMLAttributes.title || 'Drawing'],
      ['img', { class: 'catatan-drawing-canvas-preview', src, alt: HTMLAttributes.title || 'Drawing' }],
    ];
  },
});

export function createCatatanEditorExtensions() {
  return [
    StarterKit.configure({
      codeBlock: false,
      heading: { levels: [1, 2, 3, 4, 5, 6] },
    }),
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: null,
      HTMLAttributes: {
        class: 'catatan-code-block',
      },
    }),
    Typography,
    TextStyle,
    FontFamily,
    FontSizeExtension,
    Color,
    Link.configure({
      autolink: true,
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-primary underline underline-offset-2',
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
      },
    }),
    Placeholder.configure({
      placeholder: 'Tulis catatan panjangmu di sini...',
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Highlight.configure({ multicolor: true }),
    ListStyleExtension,
    TableStyleExtension,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Subscript,
    Superscript,
    TableKit.configure({
      table: { resizable: true },
    }),
    Mathematics.configure({
      katexOptions: {
        throwOnError: false,
        strict: false,
      },
    }),
    CatatanImage.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: {
        class: 'catatan-image-node',
      },
    }),
    CatatanVideo,
    CatatanDrawing,
    Underline,
    CharacterCount.configure({ limit: 20000 }),
    TabKeyExtension,
  ];
}
