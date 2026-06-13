import { checkRateLimit } from "../rate-limit";

describe("checkRateLimit", () => {
  it("allows requests under the limit", () => {
    const ip = "test-ip-" + Math.random();
    expect(checkRateLimit(ip, 3, 60000)).toBe(true);
    expect(checkRateLimit(ip, 3, 60000)).toBe(true);
    expect(checkRateLimit(ip, 3, 60000)).toBe(true);
  });

  it("blocks requests over the limit", () => {
    const ip = "block-ip-" + Math.random();
    checkRateLimit(ip, 2, 60000);
    checkRateLimit(ip, 2, 60000);
    expect(checkRateLimit(ip, 2, 60000)).toBe(false);
  });
});
