/**
 * Strip CMS light-theme color hints so dark-theme renderers can apply palette.
 * Handles inline styles, legacy font attrs, and embedded `<style>` blocks.
 */
export function sanitizeRichHtmlForDarkTheme(html: string): string {
  let out = html;

  out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  out = out.replace(/<link\b[^>]*rel=(["'])stylesheet\1[^>]*>/gi, "");

  out = out.replace(/\sstyle=(["'])([\s\S]*?)\1/gi, (_match, quote: string, styleContent: string) => {
    const kept = styleContent
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .filter((part) => !/^(color|background(-color)?)\s*:/i.test(part))
      .join("; ");
    return kept.length > 0 ? ` style=${quote}${kept}${quote}` : "";
  });

  out = out.replace(/\s(?:color|bgcolor|text)=(["'])[^"']*\1/gi, "");

  return out;
}
