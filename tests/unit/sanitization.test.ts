import { describe, it, expect } from "vitest";

// Replicate the sanitizeValue logic from server/index.ts for unit testing
function sanitizeValue(val: unknown): unknown {
  if (typeof val === "string") {
    const decoded = val.replace(/\u003c/gi, "<").replace(/\u003e/gi, ">");
    return decoded.replace(/<[^>]*>/g, "").trim();
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val !== null && typeof val === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      sanitized[k] = sanitizeValue(v);
    }
    return sanitized;
  }
  return val;
}

describe("Input Sanitization", () => {
  it("strips HTML tags from strings", () => {
    expect(sanitizeValue("<script>alert('xss')</script>")).toBe("alert('xss')");
  });

  it("strips nested HTML tags", () => {
    expect(sanitizeValue("<b><i>bold italic</i></b>")).toBe("bold italic");
  });

  it("handles Unicode-escaped angle brackets", () => {
    expect(sanitizeValue("\u003cscript\u003ealert(1)\u003c/script\u003e")).toBe("alert(1)");
  });

  it("trims whitespace", () => {
    expect(sanitizeValue("  hello world  ")).toBe("hello world");
  });

  it("preserves plain text", () => {
    expect(sanitizeValue("Hello, World!")).toBe("Hello, World!");
  });

  it("recursively sanitizes objects", () => {
    const input = { name: "<b>Evil</b>", nested: { bio: "<script>xss</script>" } };
    const result = sanitizeValue(input) as any;
    expect(result.name).toBe("Evil");
    expect(result.nested.bio).toBe("xss");
  });

  it("recursively sanitizes arrays", () => {
    const input = ["<b>A</b>", "<i>B</i>"];
    expect(sanitizeValue(input)).toEqual(["A", "B"]);
  });

  it("passes through numbers and booleans unchanged", () => {
    expect(sanitizeValue(42)).toBe(42);
    expect(sanitizeValue(true)).toBe(true);
    expect(sanitizeValue(null)).toBe(null);
  });
});
