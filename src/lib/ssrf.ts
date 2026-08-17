/**
 * SSRF (Server-Side Request Forgery) Protection Utility.
 * Validates external URLs before any backend processing or outbound requests.
 * Allows safe data:image/ Data URLs for uploaded media assets while blocking
 * loopback addresses, private IP subnets, cloud metadata endpoints,
 * and dangerous protocols.
 */

const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS / GCP / Azure Instance Metadata Service
  'metadata.google.internal',
  '169.254.169.254.xip.io',
];

/** Checks if an IPv4 address belongs to a private network block */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;

  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;
  // 169.254.0.0/16 (Link-local / Cloud metadata)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0/8
  if (parts[0] === 0) return true;

  return false;
}

export function isSafeUrl(inputUrl: string | null | undefined): boolean {
  if (!inputUrl || typeof inputUrl !== 'string') return true;

  const trimmed = inputUrl.trim();
  if (!trimmed) return true;

  // Base64 Data URLs for local image uploads are valid and safe
  if (trimmed.startsWith('data:image/')) {
    return true;
  }

  // Relative URLs served from our app origin are safe
  if (trimmed.startsWith('/')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);

    // Reject non-HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(parsed.protocol.toLowerCase())) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check explicit blocked hostnames
    if (BLOCKED_HOSTS.includes(hostname)) {
      return false;
    }

    // Check if hostname is a private IP address
    if (isPrivateIPv4(hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
