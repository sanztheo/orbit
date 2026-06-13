import { generateId, generateReferralCode } from "../ids";

describe("generateId", () => {
  it("returns a 12-char alphanumeric string", () => {
    const id = generateId();
    expect(id).toHaveLength(12);
    expect(id).toMatch(/^[0-9a-z]{12}$/);
  });

  it("generates unique ids", () => {
    const ids = Array.from({ length: 100 }, () => generateId());
    expect(new Set(ids).size).toBe(100);
  });
});

describe("generateReferralCode", () => {
  it("returns an 8-char code", () => {
    const code = generateReferralCode();
    expect(code).toHaveLength(8);
  });

  it("generates unique codes", () => {
    const codes = Array.from({ length: 100 }, () => generateReferralCode());
    expect(new Set(codes).size).toBe(100);
  });
});
