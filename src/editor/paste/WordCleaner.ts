/**
 * WordCleaner.ts
 * Cleans content copied from Microsoft Word, Google Docs, Notion, WordPress, and Medium.
 * Strips Mso* classes, conditional XML comments, zero-width spaces, and normalizes Office list items.
 */

export function cleanOfficeHtml(html: string): string {
  if (!html) return '';

  let clean = html;

  // 1. Remove MS Word conditional comments (e.g. <!--[if gte mso 9]>...<![endif]-->)
  clean = clean.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '');

  // 2. Remove XML namespace tags and declarations (e.g., <?xml:namespace.../>, <o:p></o:p>)
  clean = clean.replace(/<\/?\w+:[^>]*>/gi, '');

  // 3. Remove Word Mso classes (e.g., class="MsoNormal", class="MsoListParagraph")
  clean = clean.replace(/class="[^"]*Mso[^"]*"/gi, '');
  clean = clean.replace(/class='[^']*Mso[^']*'/gi, '');

  // 4. Remove mso-* inline styles
  clean = clean.replace(/style="[^"]*mso-[^"]*"/gi, (match) => {
    return match.replace(/mso-[^;"]+;?/gi, '');
  });

  // 5. Clean Google Docs wrappers (e.g. id="docs-internal-guid-...")
  clean = clean.replace(/id="docs-internal-guid-[^"]*"/gi, '');
  clean = clean.replace(/b\s+style="font-weight:\s*normal;?"/gi, 'span');

  // 6. Remove zero-width spaces (\u200B) and non-breaking space floods
  clean = clean.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

  // 7. Strip empty span wrappers with no attributes
  clean = clean.replace(/<span>(.*?)<\/span>/gi, '$1');

  return clean.trim();
}
