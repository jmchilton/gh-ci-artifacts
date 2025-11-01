import { readFileSync } from 'fs';
import * as cheerio from 'cheerio';

export function extractPlaywrightJSON(htmlFilePath: string): object | null {
  try {
    const html = readFileSync(htmlFilePath, 'utf-8');
    const $ = cheerio.load(html);

    // Playwright HTML reporter embeds JSON in a script tag with id="data"
    // or in data attributes
    const dataScript = $('script#data').html();
    if (dataScript) {
      // Extract JSON from script content
      const match = dataScript.match(/window\.playwrightReport\s*=\s*({.*});?/s);
      if (match) {
        return JSON.parse(match[1]);
      }
    }

    // Alternative: Look for data-* attributes
    const dataBlob = $('[data-testid="report-gzipped"]').attr('data-report');
    if (dataBlob) {
      // The data might be base64 encoded or gzipped
      // For now, try to parse it directly
      try {
        return JSON.parse(dataBlob);
      } catch {
        // Could be encoded, would need decompression
        return null;
      }
    }

    // Look for embedded JSON in script tags
    $('script[type="application/json"]').each((_, elem) => {
      const content = $(elem).html();
      if (content) {
        try {
          return JSON.parse(content);
        } catch {
          // Not valid JSON, continue
        }
      }
    });

    return null;
  } catch (error) {
    throw new Error(
      `Failed to extract JSON from Playwright HTML: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
