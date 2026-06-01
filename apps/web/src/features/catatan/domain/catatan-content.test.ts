import { describe, expect, it } from 'vitest';

import {
  catatanDocumentToMarkdown,
  catatanDocumentToPlainText,
  normalizeCatatanDocument,
  textToCatatanDocument,
} from './catatan-content';

describe('catatan content converter', () => {
  it('converts legacy plain text into a document and plain preview', () => {
    const doc = textToCatatanDocument('Baris satu\nBaris dua');

    expect(doc.type).toBe('doc');
    expect(catatanDocumentToPlainText(doc)).toBe('Baris satu\nBaris dua');
  });

  it('normalizes invalid document input using fallback text', () => {
    const doc = normalizeCatatanDocument({ bad: true }, 'Fallback lama');

    expect(catatanDocumentToPlainText(doc)).toBe('Fallback lama');
  });

  it('renders common rich marks to markdown for chat clipboard', () => {
    const doc = normalizeCatatanDocument({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Penting', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' dan ' },
            { type: 'text', text: 'miring', marks: [{ type: 'italic' }] },
          ],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Satu' }] }] },
          ],
        },
      ],
    });

    expect(catatanDocumentToMarkdown(doc)).toContain('**Penting** dan _miring_');
    expect(catatanDocumentToMarkdown(doc)).toContain('- Satu');
  });

  it('keeps advanced editor nodes searchable and exportable', () => {
    const doc = normalizeCatatanDocument({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 6 }, content: [{ type: 'text', text: 'Heading kecil' }] },
        {
          type: 'codeBlock',
          attrs: { language: 'typescript' },
          content: [{ type: 'text', text: 'const ok = true;' }],
        },
        { type: 'image', attrs: { alt: 'Bukti gambar', objectPath: 'user/new/image.png' } },
        { type: 'catatanVideo', attrs: { title: 'Video demo', objectPath: 'user/new/video.mp4' } },
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nama' }] }] },
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nilai' }] }] },
              ],
            },
            {
              type: 'tableRow',
              content: [
                { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Krom' }] }] },
                { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '500.000' }] }] },
              ],
            },
          ],
        },
      ],
    });

    expect(catatanDocumentToPlainText(doc)).toContain('Bukti gambar');
    expect(catatanDocumentToPlainText(doc)).toContain('Video demo');
    expect(catatanDocumentToMarkdown(doc)).toContain('```typescript');
    expect(catatanDocumentToMarkdown(doc)).toContain('| Nama | Nilai |');
  });
});
