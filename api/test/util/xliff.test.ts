import { buildXliff, parseXliffTargets } from "../../src/util/xliff";

describe("xliff", () => {
  test("buildXliff emits one escaped trans-unit per segment", () => {
    const xliff = buildXliff(
      ["Hello world.", "How <are> you & you?"],
      "en",
      "es",
    );
    expect(xliff).toContain('source-language="en"');
    expect(xliff).toContain('target-language="es"');
    expect(xliff).toContain('<trans-unit id="0"><source>Hello world.</source>');
    expect(xliff).toContain("How &lt;are&gt; you &amp; you?");
  });

  test("parseXliffTargets maps trans-unit id -> target text", () => {
    const translated = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2">
  <file source-language="en" target-language="es">
    <body>
      <trans-unit id="0"><source>Hello world.</source><target>Hola mundo.</target></trans-unit>
      <trans-unit id="1"><source>How are you?</source><target>¿Cómo estás?</target></trans-unit>
    </body>
  </file>
</xliff>`;
    const targets = parseXliffTargets(translated);
    expect(targets.get(0)).toEqual("Hola mundo.");
    expect(targets.get(1)).toEqual("¿Cómo estás?");
  });

  test("parseXliffTargets falls back to source when target is missing", () => {
    const noTarget = `<?xml version="1.0"?>
<xliff version="1.2"><file><body>
  <trans-unit id="0"><source>Untranslated</source></trans-unit>
</body></file></xliff>`;
    expect(parseXliffTargets(noTarget).get(0)).toEqual("Untranslated");
  });

  test("buildXliff/parseXliffTargets round-trip survives a single unit", () => {
    const built = buildXliff(["Only one."], "en", "fr");
    // simulate Translate echoing the source into a target
    const withTarget = built.replace(
      "<source>Only one.</source>",
      "<source>Only one.</source><target>Un seul.</target>",
    );
    const targets = parseXliffTargets(withTarget);
    expect(targets.size).toEqual(1);
    expect(targets.get(0)).toEqual("Un seul.");
  });
});
