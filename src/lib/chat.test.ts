/**
 * Self-check for the community chat's two pieces of real logic: channel
 * validation and the message merge the live feed depends on.
 * Run with: npx tsx src/lib/chat.test.ts
 */
import assert from 'assert';
import { resolveChannel, CHANNELS, DEFAULT_CHANNEL, channelKey, dmKey, isOnline, presenceLabel, PRESENCE_WINDOW_MS } from './chat';
import { chatSendSchema } from './validation';

type Msg = { id: string; createdAt: string; pending?: boolean };

/** Mirror of mergeMessages in community-client.tsx. */
function mergeMessages<T extends Msg>(prev: T[], incoming: T[]): T[] {
  if (!incoming.length) return prev;
  const byId = new Map(prev.map((m) => [m.id, m]));
  let changed = false;
  for (const msg of incoming) {
    const existing = byId.get(msg.id);
    if (!existing || existing.pending) changed = true;
    byId.set(msg.id, msg);
  }
  return changed
    ? Array.from(byId.values()).sort((a, b) =>
        a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt < b.createdAt ? -1 : 1,
      )
    : prev;
}

const at = (n: number) => new Date(1_700_000_000_000 + n).toISOString();

// Channels: only the published list is writable, anything else lands on the default.
for (const ch of CHANNELS) assert.equal(resolveChannel(ch.id), ch.id);
assert.equal(resolveChannel('../../etc/passwd'), DEFAULT_CHANNEL);
assert.equal(resolveChannel(''), DEFAULT_CHANNEL);
assert.equal(resolveChannel(null), DEFAULT_CHANNEL);

// Merge: unchanged polls must return the same array reference, or the feed flashes.
const base: Msg[] = [{ id: 'a', createdAt: at(1) }, { id: 'b', createdAt: at(2) }];
assert.strictEqual(mergeMessages(base, []), base, 'empty poll must not re-render');
assert.strictEqual(mergeMessages(base, [{ id: 'a', createdAt: at(1) }]), base, 'duplicate poll must not re-render');

// Merge: new messages land in chronological order regardless of arrival order.
const grown = mergeMessages(base, [{ id: 'd', createdAt: at(4) }, { id: 'c', createdAt: at(3) }]);
assert.deepEqual(grown.map((m) => m.id), ['a', 'b', 'c', 'd']);

// Merge: history prepends without duplicating the page we already hold.
const older = mergeMessages(base, [{ id: 'z', createdAt: at(0) }, { id: 'a', createdAt: at(1) }]);
assert.deepEqual(older.map((m) => m.id), ['z', 'a', 'b']);

// Merge: a same-millisecond collision stays deterministic rather than reshuffling.
const tied = mergeMessages([], [{ id: 'y', createdAt: at(9) }, { id: 'x', createdAt: at(9) }]);
assert.deepEqual(tied.map((m) => m.id), ['x', 'y']);

// Send validation: content or an image, never neither, and never past the cap.
assert.ok(!chatSendSchema.safeParse({ content: '   ' }).success, 'whitespace-only must be rejected');
assert.ok(!chatSendSchema.safeParse({ content: 'x'.repeat(4001) }).success, 'over-long must be rejected');
assert.ok(chatSendSchema.safeParse({ content: '', imageUrl: '/media/a.webp' }).success, 'image-only must pass');
assert.equal(chatSendSchema.parse({ content: '  hello  ' }).content, 'hello');
assert.equal(chatSendSchema.parse({ content: 'hi', imageUrl: '' }).imageUrl, null);

// Conversation keys: channels and DMs share one namespace and must never collide.
assert.equal(channelKey('general'), 'ch:general');
assert.equal(dmKey('general'), 'dm:general');
assert.notEqual(channelKey('x'), dmKey('x'));

// Presence: inside the window is live, outside decays to a last-seen label.
const ago = (ms: number) => new Date(Date.now() - ms);
assert.ok(isOnline(ago(1_000)));
assert.ok(isOnline(ago(PRESENCE_WINDOW_MS - 5_000)));
assert.ok(!isOnline(ago(PRESENCE_WINDOW_MS + 5_000)));
assert.ok(!isOnline(null));
assert.equal(presenceLabel(ago(1_000)), 'Active now');
assert.equal(presenceLabel(ago(5 * 60_000)), 'Active 5m ago');
assert.equal(presenceLabel(ago(3 * 3_600_000)), 'Active 3h ago');
assert.equal(presenceLabel(ago(2 * 86_400_000)), 'Active 2d ago');
assert.equal(presenceLabel(null), 'Offline');
// A gap just past the window must never render as "Active 0m ago".
assert.equal(presenceLabel(ago(PRESENCE_WINDOW_MS + 1_000)), 'Active 1m ago');

// Seen: the receipt is a high-water mark, so it covers everything at or before it.
const seenThrough = (readAt: Date | null, createdAt: Date) => Boolean(readAt && readAt >= createdAt);
const readAt = new Date(1_700_000_005_000);
assert.ok(seenThrough(readAt, new Date(1_700_000_004_000)), 'older message is seen');
assert.ok(seenThrough(readAt, readAt), 'message at the receipt instant is seen');
assert.ok(!seenThrough(readAt, new Date(1_700_000_006_000)), 'newer message is only delivered');
assert.ok(!seenThrough(null, new Date(1_700_000_004_000)), 'no receipt means never seen');

console.log('✅ chat: channels, feed merge, send validation, presence and receipts all pass.');
