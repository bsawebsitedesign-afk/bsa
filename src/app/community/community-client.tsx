'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { MediaDirectory } from '@/components/media/media-directory';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { CHANNELS, DEFAULT_CHANNEL, isOnline, presenceLabel } from '@/lib/chat';

export interface ChatUser {
  id: string;
  email: string;
  role: string;
  profile: {
    fullName: string;
    handle: string;
    jobTitle: string;
    org: string;
    avatarUrl: string | null;
  } | null;
}

export interface ChatMessageItem {
  id: string;
  senderId: string;
  channel: string | null;
  recipientId: string | null;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  sender: ChatUser;
  /** Client-only: set on an optimistic bubble that the server has not confirmed yet. */
  pending?: boolean;
}

export interface MemberListItem {
  userId: string;
  fullName: string;
  handle: string;
  jobTitle: string;
  org: string;
  avatarUrl: string | null;
  lastActiveAt: string;
}

interface DmThread {
  peerId: string;
  lastAt: string;
  preview: string;
  lastFromPeer: boolean;
  unreadCount: number;
}

/** Delivery + presence for the other side of an open DM. Null in a channel. */
interface PeerStatus {
  lastReadAt: string | null;
  lastActiveAt: string | null;
}

const POLL_MS = 3_000;
const POLL_HIDDEN_MS = 20_000;
const THREADS_POLL_MS = 20_000;
const MAX_CHARS = 4_000;
/** Below this many pixels from the bottom, the reader is considered caught up. */
const AT_BOTTOM_PX = 80;

/** Newest-last ordering, with the id as a tiebreaker so same-millisecond sends stay stable. */
function byTime(a: ChatMessageItem, b: ChatMessageItem) {
  return a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt < b.createdAt ? -1 : 1;
}

/**
 * Folds incoming messages into the existing list by id. Returning the previous
 * array untouched when nothing is new is what stops the feed from re-rendering
 * (and visibly flashing) on every poll.
 */
function mergeMessages(prev: ChatMessageItem[], incoming: ChatMessageItem[]): ChatMessageItem[] {
  if (!incoming.length) return prev;

  const byId = new Map(prev.map((m) => [m.id, m]));
  let changed = false;
  for (const msg of incoming) {
    const existing = byId.get(msg.id);
    if (!existing || existing.pending) changed = true;
    byId.set(msg.id, msg);
  }
  return changed ? Array.from(byId.values()).sort(byTime) : prev;
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
  });
}

export function CommunityClient({ initialUser }: { initialUser: { userId: string; fullName: string; role: string } }) {
  const searchParams = useSearchParams();
  const toast = useToast();
  const feedRef = useRef<HTMLDivElement>(null);

  const initialDm = searchParams.get('dm');

  const [activeTab, setActiveTab] = useState<'channels' | 'dms'>(initialDm ? 'dms' : 'channels');
  const [activeChannel, setActiveChannel] = useState<string>(DEFAULT_CHANNEL);
  const [activeRecipient, setActiveRecipient] = useState<MemberListItem | null>(null);
  const [mobilePanel, setMobilePanel] = useState<'list' | 'chat'>('chat');

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [channelUnread, setChannelUnread] = useState<Record<string, number>>({});
  const [peer, setPeer] = useState<PeerStatus | null>(null);
  const [memberQuery, setMemberQuery] = useState('');

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [online, setOnline] = useState(true);
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false);

  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  // The server resolves the session to a live row, which can differ from the
  // JWT's id after a DB re-seed - trust its answer for "is this mine?".
  const [currentUserId, setCurrentUserId] = useState(initialUser.userId);

  const messagesRef = useRef<ChatMessageItem[]>([]);
  messagesRef.current = messages;
  const lastRenderedIdRef = useRef<string | null>(null);
  // Read receipts only advance while the feed is genuinely caught up on screen.
  const atBottomRef = useRef(true);

  const inDm = activeTab === 'dms';
  const conversationKey = inDm ? (activeRecipient ? `dm:${activeRecipient.userId}` : '') : `ch:${activeChannel}`;

  const scopeQuery = useMemo(
    () =>
      inDm && activeRecipient
        ? `recipientId=${encodeURIComponent(activeRecipient.userId)}`
        : `channel=${encodeURIComponent(activeChannel)}`,
    [inDm, activeRecipient, activeChannel],
  );

  /* ---------------------------------------------------------------- members */

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/conversations');
      const data = await res.json();
      if (!data.ok) return;
      if (Array.isArray(data.members)) setMembers(data.members);
      if (Array.isArray(data.threads)) setThreads(data.threads);
      if (Array.isArray(data.channels)) {
        setChannelUnread(Object.fromEntries(data.channels.map((c: { id: string; unreadCount: number }) => [c.id, c.unreadCount])));
      }
      if (data.currentUserId) setCurrentUserId(data.currentUserId);
    } catch {
      // The message poll already surfaces connectivity problems.
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    // Skipped while hidden so a backgrounded tab stops reporting the member as present.
    const timer = setInterval(() => {
      if (!document.hidden) fetchConversations();
    }, THREADS_POLL_MS);
    return () => clearInterval(timer);
  }, [fetchConversations]);

  // Deep link from the directory / profile pages: /community?dm=<userId>
  useEffect(() => {
    if (!initialDm || activeRecipient) return;
    const match = members.find((m) => m.userId === initialDm);
    if (match) {
      setActiveRecipient(match);
      setActiveTab('dms');
      setMobilePanel('chat');
    }
  }, [initialDm, members, activeRecipient]);

  /* --------------------------------------------------------------- messages */

  useEffect(() => {
    setMessages([]);
    lastRenderedIdRef.current = null;
    setHasUnreadBelow(false);
    setHasMore(false);
    setPeer(null);
    atBottomRef.current = true;

    if (!conversationKey) {
      setLoadingFeed(false);
      return;
    }
    setLoadingFeed(true);

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    // Newest timestamp already reported as read, so an idle tab does not upsert a receipt every tick.
    let markedThrough: string | null = null;

    /** Newest confirmed message: optimistic bubbles have no server timestamp to trust. */
    function cursor(): string | null {
      const confirmed = messagesRef.current.filter((m) => !m.pending);
      return confirmed.length ? confirmed[confirmed.length - 1].createdAt : null;
    }

    async function poll(initial: boolean) {
      // A backgrounded tab has nobody reading it - idle instead of burning quota.
      if (!initial && typeof document !== 'undefined' && document.hidden) {
        timer = setTimeout(() => poll(false), POLL_HIDDEN_MS);
        return;
      }

      const since = initial ? null : cursor();
      // Only claim "read" when the feed is on screen, scrolled to the bottom,
      // and something has actually arrived since the last receipt.
      const markRead = initial || (!document.hidden && atBottomRef.current && cursor() !== markedThrough);
      try {
        const res = await fetch(
          `/api/chat/messages?${scopeQuery}` +
            (since ? `&since=${encodeURIComponent(since)}` : '') +
            (markRead ? '&markRead=1' : ''),
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) throw new Error(data.error || 'Request failed');

        failures = 0;
        setOnline(true);
        if (data.currentUserId) setCurrentUserId(data.currentUserId);

        // Keep the previous object when nothing moved: a fresh one every 3s
        // would re-render every message bubble through peerReadThrough.
        setPeer((prev) => {
          const next: PeerStatus | null = data.peer ?? null;
          if (!prev || !next) return prev === next ? prev : next;
          return prev.lastReadAt === next.lastReadAt && prev.lastActiveAt === next.lastActiveAt ? prev : next;
        });

        const incoming: ChatMessageItem[] = Array.isArray(data.messages) ? data.messages : [];
        if (initial) {
          setMessages(incoming);
          setHasMore(Boolean(data.hasMore));
        } else {
          setMessages((prev) => mergeMessages(prev, incoming));
        }

        if (markRead) {
          const tip = incoming.filter((m) => !m.pending).pop();
          markedThrough = tip ? tip.createdAt : cursor();
          // Clear the sidebar badge for what we just read.
          if (initial || incoming.length) fetchConversations();
        }
      } catch {
        if (cancelled) return;
        failures += 1;
        // Three misses is roughly ten seconds - long enough to not flag a blip.
        if (failures >= 3) setOnline(false);
      } finally {
        if (cancelled) return;
        if (initial) setLoadingFeed(false);
        // Back off while the server is unreachable rather than hammering it.
        const delay = failures ? Math.min(30_000, POLL_MS * 2 ** failures) : POLL_MS;
        timer = setTimeout(() => poll(false), delay);
      }
    }

    function onVisible() {
      if (document.hidden || cancelled) return;
      clearTimeout(timer);
      poll(false);
    }

    poll(true);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [conversationKey, scopeQuery, fetchConversations]);

  /* ----------------------------------------------------------------- scroll */

  const lastId = messages.length ? messages[messages.length - 1].id : null;

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || !lastId || lastRenderedIdRef.current === lastId) return;

    const isFirstPaint = lastRenderedIdRef.current === null;
    lastRenderedIdRef.current = lastId;

    if (isFirstPaint) {
      feed.scrollTop = feed.scrollHeight;
      return;
    }

    const nearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 260;
    const isMine = messages[messages.length - 1]?.senderId === currentUserId;
    if (nearBottom || isMine) {
      feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
      setHasUnreadBelow(false);
    } else {
      setHasUnreadBelow(true);
    }
  }, [lastId, messages, currentUserId]);

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest || loadingOlder) return;

    setLoadingOlder(true);
    const feed = feedRef.current;
    const anchor = feed ? feed.scrollHeight - feed.scrollTop : 0;

    try {
      const res = await fetch(`/api/chat/messages?${scopeQuery}&before=${encodeURIComponent(oldest.createdAt)}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.messages)) {
        setMessages((prev) => mergeMessages(prev, data.messages));
        setHasMore(Boolean(data.hasMore));
        // Keep the reader's eye where it was instead of yanking the view.
        requestAnimationFrame(() => {
          if (feed) feed.scrollTop = feed.scrollHeight - anchor;
        });
      }
    } catch {
      toast.error('Could not load earlier messages');
    } finally {
      setLoadingOlder(false);
    }
  }

  /* ------------------------------------------------------------------- send */

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (sending) return;

    if (inDm && !activeRecipient) {
      toast.error('Select an executive member to send a direct message');
      return;
    }

    const content = inputText.trim();
    if (!content && !attachedImage) return;
    if (content.length > MAX_CHARS) {
      toast.error(`Messages max out at ${MAX_CHARS.toLocaleString()} characters`);
      return;
    }

    const image = attachedImage;
    const optimisticId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: ChatMessageItem = {
      id: optimisticId,
      senderId: currentUserId,
      channel: inDm ? null : activeChannel,
      recipientId: inDm && activeRecipient ? activeRecipient.userId : null,
      content,
      imageUrl: image,
      createdAt: new Date().toISOString(),
      sender: { id: currentUserId, email: '', role: initialUser.role, profile: null },
      pending: true,
    };

    // Show it immediately; a chat that waits on a round trip feels broken.
    setMessages((prev) => [...prev, optimistic]);
    setInputText('');
    setAttachedImage(null);
    setSending(true);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          imageUrl: image,
          ...(inDm && activeRecipient ? { recipientId: activeRecipient.userId } : { channel: activeChannel }),
        }),
      });
      const data = await res.json();

      if (!data.ok || !data.message) throw new Error(data.error || 'Failed to send message');

      setMessages((prev) => mergeMessages(prev.filter((m) => m.id !== optimisticId), [data.message]));
      setOnline(true);
      if (inDm) fetchConversations();
    } catch (err) {
      // Roll the bubble back and hand the text back so nothing is silently lost.
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInputText((current) => current || content);
      setAttachedImage(image);
      toast.error(err instanceof Error ? err.message : 'Network error sending message');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  /* ------------------------------------------------------------------- view */

  const threadsByPeer = useMemo(() => new Map(threads.map((t) => [t.peerId, t])), [threads]);

  // The open conversation is being read right now, so never badge it - the
  // server's count catches up on the next threads poll either way.
  const unreadFor = useCallback(
    (peerId: string) => {
      if (inDm && activeRecipient?.userId === peerId) return 0;
      return threadsByPeer.get(peerId)?.unreadCount ?? 0;
    },
    [inDm, activeRecipient, threadsByPeer],
  );

  const totalDmUnread = useMemo(
    () => threads.reduce((sum, t) => sum + (inDm && activeRecipient?.userId === t.peerId ? 0 : t.unreadCount), 0),
    [threads, inDm, activeRecipient],
  );

  const sortedMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    return members
      .filter((m) => !query || `${m.fullName} ${m.handle} ${m.jobTitle} ${m.org}`.toLowerCase().includes(query))
      .sort((a, b) => {
        // Live conversations first, most recent at the top; everyone else A-Z.
        const aAt = threadsByPeer.get(a.userId)?.lastAt ?? '';
        const bAt = threadsByPeer.get(b.userId)?.lastAt ?? '';
        if (aAt !== bAt) return bAt.localeCompare(aAt);
        return a.fullName.localeCompare(b.fullName);
      });
  }, [members, memberQuery, threadsByPeer]);

  // Fall back to the directory's copy until the first DM poll answers.
  const peerLastActiveAt = peer?.lastActiveAt ?? activeRecipient?.lastActiveAt ?? null;
  const peerPresent = isOnline(peerLastActiveAt);

  /** True once the other side's read receipt has passed this message. */
  const peerReadThrough = useCallback(
    (createdAt: string) => Boolean(peer?.lastReadAt && new Date(peer.lastReadAt) >= new Date(createdAt)),
    [peer],
  );

  const currentChannel = CHANNELS.find((c) => c.id === activeChannel) ?? CHANNELS[0];
  const charsLeft = MAX_CHARS - inputText.length;
  const composerDisabled = inDm && !activeRecipient;

  return (
    <div className="mx-auto max-w-container-max px-4 py-8 lg:px-10 space-y-6">
      {/* Executive Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-r from-surface via-surface-raised/50 to-surface p-6 shadow-panel-lg backdrop-blur-xl">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-cyan/10 blur-3xl pointer-events-none" />
        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-cyan/20 border border-cyan/40 px-3 py-1 font-mono text-xs font-bold text-cyan">
                BSA COMMUNITY HUB
              </span>
              <span
                className={cn(
                  'flex items-center gap-1.5 font-mono text-xs font-semibold',
                  online ? 'text-emerald' : 'text-amber',
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', online ? 'bg-emerald animate-pulse' : 'bg-amber')} />
                {online ? 'Live Real-Time Feed' : 'Reconnecting…'}
              </span>
            </div>
            <h1 className="mt-2 text-2xl lg:text-3xl font-extrabold text-white">Global Member Community &amp; Messaging</h1>
            <p className="mt-1 text-sm text-ink-muted max-w-2xl">
              Connect, collaborate, and share threat intelligence in real time with security executives and verified industry leaders across the Alliance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button href="/directory" tone="paper" size="sm" className="rounded-xl px-4 py-2.5 text-xs font-semibold">
              👥 Member Directory
            </Button>
            <Button href="/dashboard" tone="paper" size="sm" className="rounded-xl px-4 py-2.5 text-xs font-semibold">
              👤 My Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-6 items-start h-[calc(100dvh-180px)] min-h-[520px] max-h-[820px] lg:h-[760px]">
        {/* Left Sidebar Nav Panel */}
        <div className={cn('flex flex-col h-full overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-panel-lg backdrop-blur-md', mobilePanel === 'chat' && 'hidden lg:flex')}>
          <div className="grid grid-cols-2 border-b border-line bg-surface-inset/80 p-1.5 gap-1">
            <button
              onClick={() => setActiveTab('channels')}
              className={cn(
                'py-2.5 px-3 rounded-xl font-sans text-xs font-bold transition-all flex items-center justify-center gap-2',
                activeTab === 'channels'
                  ? 'bg-cyan/15 border border-cyan/40 text-cyan shadow-sm'
                  : 'text-ink-muted hover:text-white hover:bg-surface-raised/50',
              )}
            >
              <span>💬</span> Channels
            </button>
            <button
              onClick={() => setActiveTab('dms')}
              className={cn(
                'relative py-2.5 px-3 rounded-xl font-sans text-xs font-bold transition-all flex items-center justify-center gap-2',
                activeTab === 'dms'
                  ? 'bg-cyan/15 border border-cyan/40 text-cyan shadow-sm'
                  : 'text-ink-muted hover:text-white hover:bg-surface-raised/50',
              )}
            >
              <span>🔒</span> Direct Messages
              {totalDmUnread > 0 && (
                <span className="absolute top-1 right-1.5 min-w-[18px] rounded-full bg-rose px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                  {totalDmUnread > 99 ? '99+' : totalDmUnread}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'channels' ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="px-2 font-mono text-[11px] font-bold uppercase tracking-wider text-cyan mb-2">
                Public Community Channels
              </p>
              {CHANNELS.map((ch) => {
                const unread = activeTab === 'channels' && activeChannel === ch.id ? 0 : channelUnread[ch.id] ?? 0;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setActiveChannel(ch.id);
                      setActiveRecipient(null);
                      setMobilePanel('chat');
                    }}
                    className={cn(
                      'w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 border',
                      activeChannel === ch.id
                        ? 'bg-cyan/15 border-cyan/40 text-cyan shadow-sm'
                        : 'border-transparent text-ink hover:bg-surface-raised/60 hover:text-white hover:border-line/60',
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-inset text-base border border-line/60">
                      {ch.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm truncate', unread > 0 ? 'font-extrabold text-white' : 'font-semibold')}>
                        #{ch.name}
                      </p>
                      <p className="text-xs text-ink-muted truncate">{ch.desc}</p>
                    </div>
                    {unread > 0 && (
                      <span className="shrink-0 min-w-[20px] rounded-full bg-rose px-1.5 py-0.5 text-center font-mono text-[10px] font-bold text-white">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 p-4 space-y-3">
              <input
                type="search"
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Search executive members…"
                className="w-full rounded-xl border border-line bg-surface-inset px-3.5 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-cyan focus:outline-none"
              />

              <div className="flex-1 overflow-y-auto space-y-1.5">
                <p className="px-1 font-mono text-[11px] font-bold uppercase tracking-wider text-cyan mb-2">
                  Active Alliance Members ({sortedMembers.length})
                </p>

                {sortedMembers.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-ink-muted">
                    {memberQuery ? 'No members match that search.' : 'No other active members yet.'}
                  </p>
                )}

                {sortedMembers.map((m) => {
                  const thread = threadsByPeer.get(m.userId);
                  const unread = unreadFor(m.userId);
                  const present = isOnline(m.lastActiveAt);
                  return (
                    <button
                      key={m.userId}
                      onClick={() => {
                        setActiveRecipient(m);
                        setMobilePanel('chat');
                      }}
                      className={cn(
                        'w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-3 border',
                        activeRecipient?.userId === m.userId
                          ? 'bg-cyan/15 border-cyan/40 text-cyan shadow-sm'
                          : 'border-transparent text-ink hover:bg-surface-raised/60 hover:text-white hover:border-line/60',
                      )}
                    >
                      <span className="relative shrink-0">
                        <Avatar name={m.fullName} src={m.avatarUrl} size="sm" />
                        <span
                          title={presenceLabel(m.lastActiveAt)}
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface',
                            present ? 'bg-emerald' : 'bg-ink-faint',
                          )}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-xs truncate text-white', unread > 0 ? 'font-extrabold' : 'font-bold')}>
                          {m.fullName}
                        </p>
                        <p className="text-[11px] text-ink-muted truncate">
                          {thread?.preview ? thread.preview : `@${m.handle} • ${m.jobTitle || m.org}`}
                        </p>
                      </div>
                      {unread > 0 && (
                        <span
                          aria-label={`${unread} unread messages`}
                          className="shrink-0 min-w-[20px] rounded-full bg-rose px-1.5 py-0.5 text-center font-mono text-[10px] font-bold text-white"
                        >
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Main Chat Container */}
        <div className={cn('relative flex flex-col h-full rounded-2xl border border-line bg-surface/90 shadow-panel-lg backdrop-blur-md overflow-hidden', mobilePanel === 'list' && 'hidden lg:flex')}>
          <div className="border-b border-line bg-surface-inset/80 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobilePanel('list')}
                className="lg:hidden rounded-xl border border-cyan/40 bg-cyan/15 px-3 py-1.5 font-mono text-xs font-bold text-cyan hover:bg-cyan/20 flex items-center gap-1.5 shrink-0"
              >
                ← {inDm ? 'Members' : 'Channels'}
              </button>

              {inDm && activeRecipient ? (
                <div className="flex items-center gap-3 min-w-0">
                  <span className="relative shrink-0">
                    <Avatar name={activeRecipient.fullName} src={activeRecipient.avatarUrl} size="md" />
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface-inset',
                        peerPresent ? 'bg-emerald' : 'bg-ink-faint',
                      )}
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm sm:text-base text-white truncate">{activeRecipient.fullName}</h3>
                      <span className="font-mono text-xs font-semibold text-cyan hidden sm:inline">@{activeRecipient.handle}</span>
                    </div>
                    <p className={cn('text-xs truncate', peerPresent ? 'text-emerald' : 'text-ink-muted')}>
                      {presenceLabel(peerLastActiveAt)} • Private 1-on-1
                    </p>
                  </div>
                </div>
              ) : inDm ? (
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-white truncate">Direct Messages</h3>
                  <p className="text-xs text-ink-muted truncate">Pick a member to start a private conversation</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan/15 text-xl border border-cyan/30">
                    {currentChannel.icon}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-white truncate">#{currentChannel.name}</h3>
                    <p className="text-xs text-ink-muted truncate hidden sm:block">{currentChannel.desc}</p>
                  </div>
                </div>
              )}
            </div>

            <span
              className={cn(
                'rounded-full border px-2.5 sm:px-3 py-1 font-mono text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 shrink-0',
                online ? 'bg-emerald/10 border-emerald/30 text-emerald' : 'bg-amber/10 border-amber/30 text-amber',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', online ? 'bg-emerald animate-pulse' : 'bg-amber')} />
              {online ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* Messages Feed Area */}
          <div
            ref={feedRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < AT_BOTTOM_PX;
              if (atBottomRef.current) setHasUnreadBelow(false);
            }}
            role="log"
            aria-live="polite"
            aria-label="Message history"
            className="flex-1 overflow-y-auto p-6 space-y-5 bg-base/40"
          >
            {hasMore && messages.length > 0 && (
              <div className="flex justify-center">
                <button
                  onClick={loadOlder}
                  disabled={loadingOlder}
                  className="rounded-full border border-line bg-surface-raised px-4 py-1.5 font-mono text-[11px] font-bold text-ink-muted hover:text-cyan hover:border-cyan/40 disabled:opacity-50"
                >
                  {loadingOlder ? 'Loading…' : '↑ Load earlier messages'}
                </button>
              </div>
            )}

            {loadingFeed ? (
              <div className="h-full flex items-center justify-center font-mono text-xs text-ink-muted">
                Loading conversation…
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-ink-muted space-y-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan/15 text-3xl border border-cyan/30">
                  {composerDisabled ? '🔒' : '💬'}
                </div>
                <h4 className="font-extrabold text-white text-lg">
                  {composerDisabled ? 'Select a member' : 'No messages in this feed yet'}
                </h4>
                <p className="text-sm max-w-sm text-ink-muted">
                  {composerDisabled
                    ? 'Choose an Alliance member from the list to open a private, end-to-end member-only conversation.'
                    : inDm
                      ? `Start a private 1-on-1 executive conversation with ${activeRecipient?.fullName}.`
                      : `Be the first to share insights or questions in #${currentChannel.name}.`}
                </p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.senderId === currentUserId;
                const senderName = isMe
                  ? msg.sender?.profile?.fullName || initialUser.fullName
                  : msg.sender?.profile?.fullName || 'BSA Member';
                const senderHandle = msg.sender?.profile?.handle ? `@${msg.sender.profile.handle}` : '';
                const prev = messages[index - 1];
                const showDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();

                return (
                  <React.Fragment key={msg.id}>
                    {showDay && (
                      <div className="flex items-center gap-3 py-1">
                        <span className="h-px flex-1 bg-line" />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                          {dayLabel(msg.createdAt)}
                        </span>
                        <span className="h-px flex-1 bg-line" />
                      </div>
                    )}

                    <div className={cn('flex items-start gap-3.5', isMe && 'flex-row-reverse', msg.pending && 'opacity-60')}>
                      <Avatar name={senderName} src={msg.sender?.profile?.avatarUrl} size="sm" />
                      <div className={cn('max-w-[75%] space-y-1.5', isMe && 'text-right')}>
                        <div className={cn('flex items-center gap-2 font-mono text-[11px] text-ink-muted', isMe && 'justify-end')}>
                          <strong className="text-white font-bold">{senderName}</strong>
                          {senderHandle && <span className="text-cyan">{senderHandle}</span>}
                          <span>
                            {msg.pending
                              ? 'Sending…'
                              : new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && inDm && !msg.pending && (
                            <span
                              title={peerReadThrough(msg.createdAt) ? 'Seen' : 'Delivered'}
                              className={peerReadThrough(msg.createdAt) ? 'text-cyan font-bold' : 'text-ink-faint'}
                            >
                              {peerReadThrough(msg.createdAt) ? '✓✓ Seen' : '✓ Sent'}
                            </span>
                          )}
                        </div>

                        <div
                          className={cn(
                            'p-4 rounded-2xl text-sm leading-relaxed shadow-sm',
                            isMe
                              ? 'bg-gradient-to-r from-cyan/20 to-cyan/10 border border-cyan/40 text-white rounded-tr-sm'
                              : 'bg-surface-raised border border-line text-ink rounded-tl-sm',
                          )}
                        >
                          {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

                          {msg.imageUrl && (
                            <div className="mt-3 rounded-xl overflow-hidden border border-line">
                              <img src={msg.imageUrl} alt="Attachment" loading="lazy" className="max-h-72 max-w-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>

          {hasUnreadBelow && (
            <button
              onClick={() => {
                feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
                setHasUnreadBelow(false);
              }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full border border-cyan/40 bg-cyan px-4 py-2 font-mono text-xs font-bold text-on-accent shadow-panel-lg transition-all hover:bg-cyan-bright hover:scale-105 z-30 flex items-center gap-2"
            >
              <span>↓</span> New messages below
            </button>
          )}

          {attachedImage && (
            <div className="px-5 py-3 bg-surface-inset border-t border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-cyan font-bold">🖼️ Image attached</span>
                <img src={attachedImage} alt="Preview" className="h-10 w-10 object-cover rounded-lg border border-line" />
              </div>
              <button onClick={() => setAttachedImage(null)} className="font-mono text-xs text-rose hover:underline">
                Remove
              </button>
            </div>
          )}

          {/* Message Composer */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-line bg-surface-inset/80 backdrop-blur-md flex items-end gap-3">
            <button
              type="button"
              onClick={() => setMediaModalOpen(true)}
              disabled={composerDisabled}
              className="p-3 rounded-xl border border-line bg-surface text-lg hover:text-cyan hover:border-cyan transition-colors disabled:opacity-40 disabled:hover:border-line"
              title="Attach image from Media Directory"
              aria-label="Attach image"
            >
              🖼️
            </button>

            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={composerDisabled}
                aria-label="Message"
                placeholder={
                  composerDisabled
                    ? 'Select a member to start messaging…'
                    : inDm && activeRecipient
                      ? `Message ${activeRecipient.fullName} privately…`
                      : `Message #${currentChannel.name}…`
                }
                className="w-full resize-none max-h-32 rounded-xl border border-line bg-base px-4 py-3 font-sans text-sm text-ink placeholder:text-ink-muted focus:border-cyan focus:ring-1 focus:ring-cyan focus:outline-none disabled:opacity-50"
              />
              {charsLeft < 400 && (
                <span className={cn('absolute -top-5 right-1 font-mono text-[10px]', charsLeft < 50 ? 'text-rose' : 'text-ink-muted')}>
                  {charsLeft} left
                </span>
              )}
            </div>

            <Button
              type="submit"
              tone="lime"
              size="md"
              className="rounded-xl px-5 py-3 text-sm font-bold"
              disabled={sending || composerDisabled || (!inputText.trim() && !attachedImage)}
            >
              {sending ? 'Sending…' : 'Send →'}
            </Button>
          </form>
        </div>
      </div>

      <Modal
        open={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        title="Select Image to Attach"
        kicker="Media Directory"
        size="lg"
      >
        <MediaDirectory
          onSelectUrl={(url) => {
            setAttachedImage(url);
            setMediaModalOpen(false);
            toast.success('Image attached to message');
          }}
          selectLabel="Attach to Message"
        />
      </Modal>
    </div>
  );
}
