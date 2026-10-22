import { describe, expect, test } from "bun:test";
import { accessDenial, generateTemporaryPassword, temporaryPasswordExpired, temporaryPasswordExpiresAt } from "./access-policy";

describe("first access rules", () => {
  test("temporary passwords last exactly 72 hours", () => {
    const now = Date.UTC(2026, 9, 22, 17);
    expect(Date.parse(temporaryPasswordExpiresAt(now)) - now).toBe(72 * 60 * 60 * 1000);
  });
  test("temporary password is random and at least ten characters", () => {
    const passwords = Array.from({ length: 50 }, generateTemporaryPassword);
    expect(passwords.every(password => password.length >= 10)).toBe(true);
    expect(new Set(passwords).size).toBe(50);
  });
  test("expiry is enforced at 72 hours, including malformed pending state", () => {
    const now = Date.UTC(2026, 9, 22, 17);
    expect(temporaryPasswordExpired(new Date(now + 1).toISOString(), now)).toBe(false);
    expect(temporaryPasswordExpired(new Date(now).toISOString(), now)).toBe(true);
    expect(temporaryPasswordExpired(null, now)).toBe(true);
  });
  test("pending password blocks connector even for active users", () => {
    expect(accessDenial(true, true)).toBe("Troque sua senha no primeiro acesso em acasademaria.lovable.app antes de usar o conector.");
    expect(accessDenial(true, false)).toBeNull();
  });
  test("inactive or missing profile never grants access", () => {
    expect(accessDenial(false, false)).not.toBeNull();
    expect(accessDenial(undefined, false)).not.toBeNull();
  });
});