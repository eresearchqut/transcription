import { XMLParser } from "fast-xml-parser";

/**
 * Helpers for translating transcript segments via Amazon Translate batch jobs.
 *
 * Each transcript segment becomes a `<trans-unit>` in an XLIFF 1.2 document
 * (`id` = the segment's index). Amazon Translate translates each unit's
 * `<source>` independently and writes the result into a `<target>` element,
 * preserving the `id`. This gives a robust 1:1 segment -> translation mapping in
 * a single document, which we reassemble back onto the original timed segments.
 */

/** Name of the single XLIFF document submitted per batch translation job. */
export const XLIFF_FILE_NAME = "source.xlf";

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const buildXliff = (
  segmentTexts: string[],
  sourceLanguage: string,
  targetLanguage: string,
): string => {
  const transUnits = segmentTexts
    .map(
      (text, index) =>
        `      <trans-unit id="${index}"><source>${escapeXml(text)}</source></trans-unit>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file original="transcript" source-language="${escapeXml(sourceLanguage)}" target-language="${escapeXml(targetLanguage)}" datatype="plaintext">
    <body>
${transUnits}
    </body>
  </file>
</xliff>
`;
};

const textContent = (node: unknown): string => {
  if (node === undefined || node === null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (
    typeof node === "object" &&
    "#text" in (node as Record<string, unknown>)
  ) {
    return String((node as Record<string, unknown>)["#text"]);
  }
  return "";
};

/**
 * Parse an Amazon Translate XLIFF output document into a map of trans-unit id
 * (segment index) -> translated text. Falls back to the `<source>` text when a
 * unit has no `<target>`.
 */
export const parseXliffTargets = (xml: string): Map<number, string> => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    trimValues: false,
  });
  const parsed = parser.parse(xml);

  const file = parsed?.xliff?.file;
  const body = Array.isArray(file)
    ? file[0]?.body
    : (file?.body as Record<string, unknown> | undefined);
  const rawUnits = body?.["trans-unit"];
  const units: Record<string, unknown>[] = Array.isArray(rawUnits)
    ? rawUnits
    : rawUnits
      ? [rawUnits as Record<string, unknown>]
      : [];

  const targets = new Map<number, string>();
  for (const unit of units) {
    const id = Number(unit["@_id"]);
    if (Number.isNaN(id)) continue;
    const target = textContent(unit["target"]);
    targets.set(id, target !== "" ? target : textContent(unit["source"]));
  }
  return targets;
};
