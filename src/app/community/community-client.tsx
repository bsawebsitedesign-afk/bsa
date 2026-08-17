'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { MediaDirectory } from '@/components/media/media-directory';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

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
  recipient?: ChatUser | null;
}

export interface MemberListItem {
  userId: string;
  fullName: string;
  handle: string;
  jobTitle: string;
  org: string;
  avatarUrl: string | null;
}

const CHANNELS = [
  { id: 'general', name: 'general-discussion', label: 'General Lounge', icon: '💬', desc: 'Main network executive exchange & discussion' },
  { id: 'convergence', name: 'cyber-physical-convergence', label: 'Physical & Cyber Integration', icon: '🛡️', desc: 'SIEM, zero-trust perimeter & AI telemetry' },
  { id: 'incidents', name: 'incident-response', label: 'Incident Response & Threat Intel', icon: '🚨', desc: 'Real-time crisis coordination & threat alerts' },
  { id: 'careers', name: 'career-opportunities', label: 'Careers & Board Openings', icon: '💼', desc: 'CISO roles, advisory seats & RFP listings' },
  { id: 'announcements', name: 'announcements', label: 'Alliance Announcements', icon: '📢', desc: 'Summit news, research playbooks & policy updates' },
];

export function CommunityClient({ initialUser }: { initialUser: { userId: string; fullName: string; role: string } }) {
  const searchParams = useSearchParams();
  const toast = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialDm = searchParams.get('dm');

  const [activeTab, setActiveTab] = useState<'channels' | 'dms'>(initialDm ? 'dms' : 'channels');
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [activeRecipient, setActiveRecipient] = useState<MemberListItem | null>(null);

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [memberQuery, setMemberQuery] = useState('');

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  // Initial load members & DM recipient if query param present
  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (initialDm && members.length > 0) {
      const match = members.find((m) => m.userId === initialDm);
      if (match) {
        setActiveRecipient(match);
        setActiveTab('dms');
      }
    }
  }, [initialDm, members]);

  // Poll messages every 3 seconds
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [activeChannel, activeRecipient, activeTab]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchMembers() {
    try {
      const res = await fetch('/api/chat/conversations');
      const data = await res.json();
      const memberList = data.members || data.data?.members;
      if (data.ok && Array.isArray(memberList)) {
        setMembers(memberList.filter((m: MemberListItem) => m.userId !== initialUser.userId));
      }
    } catch {
      // quiet retry
    }
  }

  async function fetchMessages() {
    try {
      let url = '/api/chat/messages?';
      if (activeTab === 'dms' && activeRecipient) {
        url += `recipientId=${encodeURIComponent(activeRecipient.userId)}`;
      } else {
        url += `channel=${encodeURIComponent(activeChannel)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      const msgList = data.messages || data.data?.messages;
      if (data.ok && Array.isArray(msgList)) {
        setMessages(msgList);
      }
    } catch {
      // quiet retry
    }
  }

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const content = inputText.trim();
    if (!content && !attachedImage) return;

    setSending(true);
    try {
      const payload: any = {
        content,
        imageUrl: attachedImage,
      };

      if (activeTab === 'dms' && activeRecipient) {
        payload.recipientId = activeRecipient.userId;
      } else {
        payload.channel = activeChannel;
      }

      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      const newMsg = data.message || data.data?.message;

      if (data.ok && newMsg) {
        setMessages((prev) => [...prev, newMsg]);
        setInputText('');
        setAttachedImage(null);
      } else {
        toast.error(data.error || 'Failed to send message');
      }
    } catch {
      toast.error('Network error sending message');
    } finally {
      setSending(false);
    }
  }

  const filteredMembers = members.filter((m) =>
    `${m.fullName} ${m.handle} ${m.jobTitle} ${m.org}`.toLowerCase().includes(memberQuery.toLowerCase()),
  );

  const currentChannelObj = CHANNELS.find((c) => c.id === activeChannel) || CHANNELS[0];

  return (
    <div className="mx-auto max-w-container-max px-4 py-8 lg:px-10 space-y-6">
      {/* Executive Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-r from-surface via-surface-raised/50 to-surface p-6 shadow-panel-lg backdrop-blur-xl">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-cyan/10 blur-3xl pointer-events-none" />
        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-cyan/20 border border-cyan/40 px-3 py-1 font-mono text-xs font-bold text-cyan">
                BSA NEXUS HUB
              </span>
              <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-lime">
                <span className="h-2 w-2 rounded-full bg-lime animate-pulse" /> Live Real-Time Feed
              </span>
            </div>
            <h1 className="mt-2 text-2xl lg:text-3xl font-extrabold text-white">Global Member Community & Messaging</h1>
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
      <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-6 items-start h-[780px] max-h-[82vh]">
        {/* Left Sidebar Nav Panel */}
        <div className="flex flex-col h-full overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-panel-lg backdrop-blur-md">
          {/* Tabs Selector */}
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
                'py-2.5 px-3 rounded-xl font-sans text-xs font-bold transition-all flex items-center justify-center gap-2',
                activeTab === 'dms'
                  ? 'bg-cyan/15 border border-cyan/40 text-cyan shadow-sm'
                  : 'text-ink-muted hover:text-white hover:bg-surface-raised/50',
              )}
            >
              <span>🔒</span> Direct Messages
            </button>
          </div>

          {/* Tab 1: Channels List */}
          {activeTab === 'channels' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="px-2 font-mono text-[11px] font-bold uppercase tracking-wider text-cyan mb-2">
                Public Community Channels
              </p>
              {CHANNELS.map((ch) => {
                const isActive = activeChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setActiveChannel(ch.id);
                      setActiveRecipient(null);
                    }}
                    className={cn(
                      'w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 border',
                      isActive
                        ? 'bg-cyan/15 border-cyan/40 text-cyan shadow-sm'
                        : 'border-transparent text-ink hover:bg-surface-raised/60 hover:text-white hover:border-line/60',
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-inset text-base border border-line/60">
                      {ch.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">#{ch.name}</p>
                      <p className="text-xs text-ink-muted truncate">{ch.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tab 2: Direct Messages List */}
          {activeTab === 'dms' && (
            <div className="flex-1 flex flex-col min-h-0 p-4 space-y-3">
              <div>
                <input
                  type="search"
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder="Search executive members…"
                  className="w-full rounded-xl border border-line bg-surface-inset px-3.5 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-cyan focus:outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5">
                <p className="px-1 font-mono text-[11px] font-bold uppercase tracking-wider text-cyan mb-2">
                  Active Alliance Members ({filteredMembers.length})
                </p>
                {filteredMembers.map((m) => {
                  const isActive = activeRecipient?.userId === m.userId;
                  return (
                    <button
                      key={m.userId}
                      onClick={() => setActiveRecipient(m)}
                      className={cn(
                        'w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-3 border',
                        isActive
                          ? 'bg-cyan/15 border-cyan/40 text-cyan shadow-sm'
                          : 'border-transparent text-ink hover:bg-surface-raised/60 hover:text-white hover:border-line/60',
                      )}
                    >
                      <Avatar name={m.fullName} src={m.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs truncate text-white">{m.fullName}</p>
                        <p className="text-[11px] text-ink-muted truncate">@{m.handle} • {m.jobTitle || m.org}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Main Chat Container */}
        <div className="flex flex-col h-full rounded-2xl border border-line bg-surface/90 shadow-panel-lg backdrop-blur-md overflow-hidden">
          {/* Header Bar */}
          <div className="border-b border-line bg-surface-inset/80 px-6 py-4 flex items-center justify-between">
            {activeTab === 'dms' && activeRecipient ? (
              <div className="flex items-center gap-3.5">
                <Avatar name={activeRecipient.fullName} src={activeRecipient.avatarUrl} size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-white">{activeRecipient.fullName}</h3>
                    <span className="font-mono text-xs font-semibold text-cyan">@{activeRecipient.handle}</span>
                  </div>
                  <p className="text-xs text-ink-muted">{activeRecipient.jobTitle} • {activeRecipient.org}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/15 text-xl border border-cyan/30">
                  {currentChannelObj.icon}
                </span>
                <div>
                  <h3 className="font-bold text-base text-white">#{currentChannelObj.name}</h3>
                  <p className="text-xs text-ink-muted">{currentChannelObj.desc}</p>
                </div>
              </div>
            )}

            <span className="rounded-full bg-lime/10 border border-lime/30 px-3 py-1 font-mono text-xs font-semibold text-lime flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-lime animate-pulse" /> Live Real-Time Feed
            </span>
          </div>

          {/* Messages Feed Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-base/40">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-ink-muted space-y-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan/15 text-3xl border border-cyan/30">
                  💬
                </div>
                <h4 className="font-extrabold text-white text-lg">No messages in this feed yet</h4>
                <p className="text-sm max-w-sm text-ink-muted">
                  {activeTab === 'dms'
                    ? `Start a private 1-on-1 executive conversation with ${activeRecipient?.fullName || 'this member'}.`
                    : `Be the first to share insights or questions in #${currentChannelObj.name}.`}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = Boolean(initialUser && msg.senderId === initialUser.userId);
                const senderName = msg.sender?.profile?.fullName || msg.sender?.email || 'BSA Member';
                const senderHandle = msg.sender?.profile?.handle ? `@${msg.sender.profile.handle}` : '';
                const senderAvatar = msg.sender?.profile?.avatarUrl;

                return (
                  <div
                    key={msg.id}
                    className={cn('flex items-start gap-3.5', isMe && 'flex-row-reverse')}
                  >
                    <Avatar name={senderName} src={senderAvatar} size="sm" />
                    <div className={cn('max-w-[75%] space-y-1.5', isMe && 'text-right')}>
                      <div className={cn('flex items-center gap-2 font-mono text-[11px] text-ink-muted', isMe && 'justify-end')}>
                        <strong className="text-white font-bold">{senderName}</strong>
                        {senderHandle && <span className="text-cyan">{senderHandle}</span>}
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={cn(
                          'p-4 rounded-2xl text-sm leading-relaxed shadow-sm',
                          isMe
                            ? 'bg-gradient-to-r from-cyan/20 to-cyan/10 border border-cyan/40 text-white rounded-tr-xs'
                            : 'bg-surface-raised border border-line text-ink rounded-tl-xs',
                        )}
                      >
                        {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                        {msg.imageUrl && (
                          <div className="mt-3 rounded-xl overflow-hidden border border-line">
                            <img src={msg.imageUrl} alt="Attachment" className="max-h-72 max-w-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attachment Preview if any */}
          {attachedImage && (
            <div className="px-5 py-3 bg-surface-inset border-t border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-cyan font-bold">🖼️ Image Attached</span>
                <img src={attachedImage} alt="Preview" className="h-10 w-10 object-cover rounded-lg border border-line" />
              </div>
              <button
                onClick={() => setAttachedImage(null)}
                className="font-mono text-xs text-rose hover:underline"
              >
                Remove
              </button>
            </div>
          )}

          {/* Message Composer Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-line bg-surface-inset/80 backdrop-blur-md flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMediaModalOpen(true)}
              className="p-3 rounded-xl border border-line bg-surface text-lg hover:text-cyan hover:border-cyan transition-colors"
              title="Attach image from Media Directory"
            >
              🖼️
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                activeTab === 'dms' && activeRecipient
                  ? `Message ${activeRecipient.fullName} privately…`
                  : `Message #${currentChannelObj.name}…`
              }
              className="flex-1 rounded-xl border border-line bg-base px-4 py-3 font-sans text-sm text-ink placeholder:text-ink-muted focus:border-cyan focus:ring-1 focus:ring-cyan focus:outline-none"
            />

            <Button type="submit" tone="lime" size="md" className="rounded-xl px-5 py-3 text-sm font-bold" disabled={sending}>
              {sending ? 'Sending…' : 'Send →'}
            </Button>
          </form>
        </div>
      </div>

      {/* Media Directory Modal for Attachment Picker */}
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
