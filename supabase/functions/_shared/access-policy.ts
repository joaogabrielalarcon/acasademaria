export const TEMP_PASSWORD_HOURS = 72;
export const normalizeLoginUsername = (username: string): string => username.trim().toLowerCase();
export const normalizeLoginPassword = (password: string): string => password.trim();
export const GENERIC_AUTH_ERROR = "usuário ou senha incorretos";
export const MSG_TROCAR_SENHA =
  "Troque sua senha no primeiro acesso em acasademaria.lovable.app antes de usar o conector.";

export function temporaryPasswordExpiresAt(now = Date.now()): string {
  return new Date(now + TEMP_PASSWORD_HOURS * 60 * 60 * 1000).toISOString();
}

export function temporaryPasswordExpired(expiresAt: string | null, now = Date.now()): boolean {
  const expiry = expiresAt ? Date.parse(expiresAt) : NaN;
  return !Number.isFinite(expiry) || expiry <= now;
}

export function accessDenial(active: boolean | null | undefined, pending: boolean): string | null {
  if (active !== true) return "Seu acesso está desativado. Procure a direção.";
  return pending ? MSG_TROCAR_SENHA : null;
}

export function generateTemporaryPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  const chars: string[] = [];
  while (chars.length < 14) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    for (const byte of bytes) {
      if (byte < limit && chars.length < 14) chars.push(alphabet[byte % alphabet.length]);
    }
  }
  return chars.join("");
}