/**
 * SSRF guard for admin-configurable outbound connections (AI endpoint, IMAP
 * host). Admins are trusted, but a compromised/tricked admin — or a typo'd
 * base URL — must not be able to make the server hit cloud-metadata
 * (169.254.169.254), loopback, or other internal hosts, nor exfiltrate the
 * attached API key to such a target. We require http(s) and reject any host
 * that is, or resolves to, a private/reserved IP.
 *
 * Note: this validates at check time; a determined attacker controlling DNS
 * could still rebind between check and connect (TOCTOU). Full protection would
 * pin the connection to the validated IP. This is defense-in-depth for an
 * admin-only surface, not a hard sandbox.
 */
import dns from "dns/promises";
import net from "net";

function ipv4Blocked(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  if (a === 0) return true; // "this" network
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function ipBlocked(ip: string): boolean {
  if (net.isIPv4(ip)) return ipv4Blocked(ip);
  const v = ip.toLowerCase().split("%")[0]; // strip zone id
  if (v === "::1" || v === "::") return true; // loopback / unspecified
  if (v.startsWith("fe80")) return true; // link-local
  if (v.startsWith("fc") || v.startsWith("fd")) return true; // unique-local
  if (v.startsWith("::ffff:")) {
    const mapped = v.slice("::ffff:".length);
    if (net.isIPv4(mapped)) return ipv4Blocked(mapped); // IPv4-mapped IPv6
  }
  return false;
}

/** Parse + validate an outbound URL. Throws on non-http(s) or private target. */
export async function assertSafeOutboundUrl(rawUrl: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  const host = u.hostname;
  if (net.isIP(host)) {
    if (ipBlocked(host)) throw new Error("Refusing to connect to a private/reserved address");
    return u;
  }
  let addrs: { address: string }[];
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch {
    throw new Error(`Could not resolve host: ${host}`);
  }
  if (!addrs.length) throw new Error(`Could not resolve host: ${host}`);
  for (const a of addrs) {
    if (ipBlocked(a.address)) {
      throw new Error("Host resolves to a private/reserved address");
    }
  }
  return u;
}

/** Validate a bare host[:port] used for a raw TCP/IMAP connection. */
export async function assertSafeHost(host: string, port?: number): Promise<void> {
  const p = port && port > 0 ? port : 993;
  await assertSafeOutboundUrl(`https://${host}:${p}`);
}
