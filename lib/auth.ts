const COOKIE_NAME = "subtrack_session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 30;
const encoder = new TextEncoder();
function bytesToBase64Url(bytes: Uint8Array) { let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
async function digest(value: string) { return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))); }
async function signature(payload: string, secret: string) { const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)))); }
function secureEqual(left: Uint8Array, right: Uint8Array) { if (left.length !== right.length) return false; let difference = 0; for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index]; return difference === 0; }
export function authConfig() { const password = process.env.AUTH_PASSWORD; const secret = process.env.AUTH_SECRET; if (!password || !secret || secret.length < 32) throw new Error("AUTH_PASSWORD and AUTH_SECRET (at least 32 characters) must be configured"); return { password, secret }; }
export async function verifyPassword(candidate: string) { const { password } = authConfig(); return secureEqual(await digest(candidate), await digest(password)); }
export async function createSession(now = Date.now()) { const { secret } = authConfig(); const payload = String(Math.floor(now / 1000) + SESSION_LIFETIME_SECONDS); return `${payload}.${await signature(payload, secret)}`; }
export async function verifySession(value: string | undefined, now = Date.now()) { if (!value) return false; const [expires, suppliedSignature, extra] = value.split("."); if (!expires || !suppliedSignature || extra || !/^\d+$/.test(expires) || Number(expires) <= Math.floor(now / 1000)) return false; const { secret } = authConfig(); return secureEqual(encoder.encode(suppliedSignature), encoder.encode(await signature(expires, secret))); }
export const sessionCookie = { name: COOKIE_NAME, maxAge: SESSION_LIFETIME_SECONDS };
