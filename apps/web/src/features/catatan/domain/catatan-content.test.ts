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
});
