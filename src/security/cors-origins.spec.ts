import { parseAllowedOrigins } from "./cors-origins";

describe("parseAllowedOrigins", () => {
  it("normalizes a comma-separated origin allowlist", () => {
    expect(
      parseAllowedOrigins(" http://localhost:9130, http://127.0.0.1:9130 ,,"),
    ).toEqual(["http://localhost:9130", "http://127.0.0.1:9130"]);
  });

  it("returns an empty allowlist when no value is configured", () => {
    expect(parseAllowedOrigins()).toEqual([]);
  });
});
