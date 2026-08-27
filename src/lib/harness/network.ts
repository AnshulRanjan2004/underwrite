import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const LOCAL_HOSTNAME_SUFFIXES = [".localhost", ".local", ".internal", ".home"];

function isPrivateIpv4(address: string) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true;
  const [first, second, third] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113)
  );
}

export function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase();
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized);
  if (isIP(normalized) !== 6) return false;

  // IPv4-mapped IPv6 is blocked as a class. DNS lookup normally returns IPv4
  // addresses in dotted notation, so this avoids complicated mapped parsing.
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("::ffff:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  );
}

function parseHttpUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("A valid HTTP or HTTPS URL is required.");
  }
  if (!(["http:", "https:"] as string[]).includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are allowed.");
  }
  if (url.username || url.password) throw new Error("URLs with embedded credentials are not allowed.");
  return url;
}

function isLocalHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return (
    normalized === "localhost" ||
    normalized === "localhost.localdomain" ||
    normalized === "metadata.google.internal" ||
    LOCAL_HOSTNAME_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
  );
}

export async function assertSafeOutboundUrl(value: string, options: { allowPrivate?: boolean } = {}) {
  const url = parseHttpUrl(value);
  if (options.allowPrivate) return url;

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (isLocalHostname(hostname) || isPrivateAddress(hostname)) {
    throw new Error("Private and local network URLs are not allowed.");
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("The URL host could not be resolved.");
  }
  if (!addresses.length || addresses.some((item) => isPrivateAddress(item.address))) {
    throw new Error("Private and local network URLs are not allowed.");
  }
  return url;
}

export function allowsPrivateModelEndpoints() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_PRIVATE_MODEL_ENDPOINTS === "true";
}

export async function assertSafeModelEndpoint(value: string) {
  return assertSafeOutboundUrl(value, { allowPrivate: allowsPrivateModelEndpoints() });
}
