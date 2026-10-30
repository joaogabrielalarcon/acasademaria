import { z } from "npm:zod@4.4.3";
const schema = z.object({ operation: z.enum(["criar_registros", "atualizar_registro"]), input: z.unknown(), userId: z.string().uuid(), expires: z.number() });
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const decode = (text: string) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
async function signingKey(secret: string) { return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]); }
export async function signProposal(input: { operation: string; input: unknown; userId: string }, secret: string) {
  const body = encode(new TextEncoder().encode(JSON.stringify({ ...input, expires: Date.now() + 15 * 60000 })));
  return body + "." + encode(new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(secret), new TextEncoder().encode(body))));
}
export async function verifyProposal(proposal: string, secret: string, userId: string) {
  const [body, signature] = proposal.split(".");
  if (!body || !signature || !(await crypto.subtle.verify("HMAC", await signingKey(secret), decode(signature), new TextEncoder().encode(body)))) throw new Error("Confirmação inválida.");
  const result = schema.parse(JSON.parse(new TextDecoder().decode(decode(body))));
  if (result.userId !== userId || result.expires <= Date.now()) throw new Error("Esta confirmação expirou. Revise os dados novamente.");
  return result;
}