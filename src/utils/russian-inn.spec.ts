import {
  InvalidRussianInnError,
  isValidRussianInn,
  normalizeLegacyRussianInn,
  normalizeRussianInn,
} from "./russian-inn";

describe("Russian INN helpers", () => {
  describe("normalizeRussianInn", () => {
    it.each([
      ["7707083893", "7707083893"],
      [" 7707-083-893 ", "7707083893"],
      ["(7707) 083 893", "7707083893"],
      ["500100732259", "500100732259"],
      ["5001.0073/2259", "500100732259"],
      ["5001\u00a00073\u20132259", "500100732259"],
    ])("normalizes valid INN %s", (input, expected) => {
      expect(normalizeRussianInn(input)).toBe(expected);
      expect(isValidRussianInn(input)).toBe(true);
    });

    it.each([
      ["7707083894", "invalid 10-digit checksum"],
      ["500100732258", "invalid 12-digit checksum"],
      ["123456789", "too short"],
      ["1234567890123", "too long"],
      ["0000000000", "non-issued repeated digits"],
      ["7707_083_893", "unsupported separator"],
      ["7707A083893", "letter"],
      ["", "empty string"],
      [null, "null"],
      [7707083893, "number"],
    ])("rejects %s (%s)", (input, _description) => {
      expect(() => normalizeRussianInn(input)).toThrow(InvalidRussianInnError);
      expect(isValidRussianInn(input)).toBe(false);
    });
  });

  describe("normalizeLegacyRussianInn", () => {
    it("returns a canonical value for a valid historical representation", () => {
      expect(normalizeLegacyRussianInn(" 77-0708-3893 ")).toBe("7707083893");
    });

    it.each(["123456789", "7707083894", null, undefined, 7707083893])(
      "returns null instead of throwing for invalid legacy value %s",
      (value) => {
        expect(normalizeLegacyRussianInn(value)).toBeNull();
      },
    );
  });
});
