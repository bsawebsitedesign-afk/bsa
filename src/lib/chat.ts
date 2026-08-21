/** Single source of truth for public channels - the API rejects anything not listed here. */
export const CHANNELS = [
  { id: 'general', name: 'general-discussion', label: 'General Lounge', icon: '💬', desc: 'Main network executive exchange & discussion' },
  { id: 'convergence', name: 'cyber-physical-convergence', label: 'Physical & Cyber Integration', icon: '🛡️', desc: 'SIEM, zero-trust perimeter & AI telemetry' },
  { id: 'incidents', name: 'incident-response', label: 'Incident Response & Threat Intel', icon: '🚨', desc: 'Real-time crisis coordination & threat alerts' },
  { id: 'careers', name: 'career-opportunities', label: 'Careers & Board Openings', icon: '💼', desc: 'CISO roles, advisory seats & RFP listings' },
  { id: 'announcements', name: 'announcements', label: 'Alliance Announcements', icon: '📢', desc: 'Summit news, research playbooks & policy updates' },
] as const;

export const DEFAULT_CHANNEL = 'general';

/** Falls back to the default channel rather than 404ing, so a stale bookmark still lands somewhere real. */
export function resolveChannel(raw: string | null | undefined): string {
  const id = raw?.trim();
  return CHANNELS.some((c) => c.id === id) ? (id as string) : DEFAULT_CHANNEL;
}

/** A member counts as present if the chat has heard from them inside this window. */
export const PRESENCE_WINDOW_MS = 90_000;

/** Stable key for a read receipt: public channels and DMs share one namespace. */
export const channelKey = (channel: string) => `ch:${channel}`;
export const dmKey = (peerUserId: string) => `dm:${peerUserId}`;

export function isOnline(lastActiveAt: string | Date | null | undefined): boolean {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < PRESENCE_WINDOW_MS;
}

/** "Active now" while present, otherwise how long ago they were last seen. */
export function presenceLabel(lastActiveAt: string | Date | null | undefined): string {
  if (!lastActiveAt) return 'Offline';
  if (isOnline(lastActiveAt)) return 'Active now';

  const minutes = Math.floor((Date.now() - new Date(lastActiveAt).getTime()) / 60_000);
  if (minutes < 60) return `Active ${Math.max(1, minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `Active ${days}d ago` : 'Offline';
}
