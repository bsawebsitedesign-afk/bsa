'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Megaphone, Trash, PushPin, Warning, CheckCircle, Info, Sparkle, PaperPlaneRight, ArrowSquareOut } from '@phosphor-icons/react/dist/ssr';
import { useToast } from '@/components/ui/toast';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  linkUrl: string | null;
  linkText: string | null;
  targetRole: string;
  isPinned: boolean;
  isActive: boolean;
  createdAt: string;
  createdBy?: {
    email: string;
    profile?: { fullName: string } | null;
  } | null;
}

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getTypeBadge(type: string) {
  switch (type.toUpperCase()) {
    case 'ALERT':
      return {
        label: 'CRITICAL ALERT',
        bg: 'border-rose/50 bg-rose/15 text-rose',
        icon: <Warning className="h-3 w-3" />,
      };
    case 'SUMMIT':
      return {
        label: 'SUMMIT & EVENT',
        bg: 'border-cyan/50 bg-cyan/15 text-cyan',
        icon: <Megaphone className="h-3 w-3" />,
      };
    case 'ADVISORY':
      return {
        label: 'SECURITY ADVISORY',
        bg: 'border-amber/50 bg-amber/15 text-amber',
        icon: <Sparkle className="h-3 w-3" />,
      };
    case 'UPDATE':
      return {
        label: 'PLATFORM UPDATE',
        bg: 'border-lime/50 bg-lime/15 text-lime',
        icon: <CheckCircle className="h-3 w-3" />,
      };
    default:
      return {
        label: 'ANNOUNCEMENT',
        bg: 'border-violet/50 bg-violet/15 text-violet-bright',
        icon: <Info className="h-3 w-3" />,
      };
  }
}

export function BroadcastsPanel() {
  const toast = useToast();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true
  );
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('INFO');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [targetRole, setTargetRole] = useState('ALL');
  const [isPinned, setIsPinned] = useState(false);

  // Fetch all notifications
  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && Array.isArray(data.data)) {
          setNotifications(data.data);
        }
      }
    } catch (e) {
      console.error('Failed to load admin notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Validation Error', 'Please provide both a title and message');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          type,
          linkUrl: linkUrl.trim() || null,
          linkText: linkText.trim() || null,
          targetRole,
          isPinned,
          isActive: true,
        }),
      });

      const json = await res.json();
      if (res.ok && json?.ok) {
        toast.success('Broadcast Live', '🔔 Notification broadcast sent live to all platform visitors!');
        setTitle('');
        setMessage('');
        setLinkUrl('');
        setLinkText('');
        setIsPinned(false);
        loadNotifications();
      } else {
        toast.error('Broadcast Failed', json?.error || 'Failed to send broadcast');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network Error', 'Error while broadcasting notification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to retract and delete this broadcast notification?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/notifications?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Notification Removed', 'Notification deleted from platform');
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } else {
        toast.error('Delete Failed', 'Failed to delete notification');
      }
    } catch {
      toast.error('Network Error', 'Error deleting notification');
    }
  };

  const previewBadge = getTypeBadge(type);

  return (
    <div className="space-y-8">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-cyan/40 bg-[#0B0F19]/90 p-6 shadow-panel backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan/50 bg-cyan/15 text-cyan shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Bell className="h-6 w-6" weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-lime"></span>
                </span>
                <span className="font-mono text-xs font-black uppercase tracking-widest text-cyan">
                  BROADCAST CONTROL CENTER
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                Site-Wide Notification Dispatcher
              </h2>
              <p className="text-xs text-white/70 mt-1">
                Broadcast instant custom alerts, event updates, and security advisories to all visitors via the public notification bell.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-[#111726] px-4 py-2 text-center">
              <span className="block font-mono text-[10px] font-bold text-white/50">ACTIVE BROADCASTS</span>
              <span className="font-mono text-lg font-black text-cyan">{notifications.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Dispatch Form (Left) & Live Visual Preview (Right) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Dispatch Form */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-white/15 bg-[#111726]/90 p-6 shadow-panel space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-cyan" />
                <span>Compose New Broadcast</span>
              </h3>
              <span className="font-mono text-[10px] text-white/40 uppercase">DISPATCH TELEMETRY</span>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-4">
              {/* Type & Audience Selectors */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-xs font-bold text-white mb-1.5 uppercase">
                    Alert Category
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-[#0B0F19] px-3.5 py-2.5 font-sans text-xs font-bold text-white focus:border-cyan focus:outline-none transition-colors"
                  >
                    <option value="INFO">ℹ️ General Announcement</option>
                    <option value="SUMMIT">🎟️ Summit & Event Notice</option>
                    <option value="ADVISORY">⚡ Security Advisory / Playbook</option>
                    <option value="UPDATE">✨ Platform Update</option>
                    <option value="ALERT">🚨 Critical Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-xs font-bold text-white mb-1.5 uppercase">
                    Target Audience
                  </label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-[#0B0F19] px-3.5 py-2.5 font-sans text-xs font-bold text-white focus:border-cyan focus:outline-none transition-colors"
                  >
                    <option value="ALL">🌐 All Visitors (Public & Members)</option>
                    <option value="MEMBER">🛡️ Verified Members Only</option>
                    <option value="PUBLIC">👥 Public Guests</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-mono text-xs font-bold text-white uppercase">
                    Headline Title *
                  </label>
                  <span className="font-mono text-[10px] text-white/40">{title.length}/120</span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. BSA Security Leadership Summit 2026 Keynote Announced"
                  className="w-full rounded-xl border border-white/20 bg-[#0B0F19] px-4 py-2.5 text-xs font-bold text-white placeholder:text-white/40 focus:border-cyan focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] focus:outline-none transition-all"
                />
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-mono text-xs font-bold text-white uppercase">
                    Notification Message *
                  </label>
                  <span className="font-mono text-[10px] text-white/40">{message.length}/500</span>
                </div>
                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Early-bird registration passes are now live. Reserve your access for the September 15 summit in New York, NY."
                  className="w-full rounded-xl border border-white/20 bg-[#0B0F19] px-4 py-2.5 text-xs text-white placeholder:text-white/40 focus:border-cyan focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] focus:outline-none transition-all resize-none"
                />
              </div>

              {/* Link URL & Link Text */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-xs font-bold text-white mb-1.5 uppercase">
                    Link URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="e.g. /events/bsa-security-leadership-summit-2026"
                    className="w-full rounded-xl border border-white/20 bg-[#0B0F19] px-3.5 py-2 text-xs text-white placeholder:text-white/40 focus:border-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs font-bold text-white mb-1.5 uppercase">
                    Button Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="e.g. View Summit Details"
                    className="w-full rounded-xl border border-white/20 bg-[#0B0F19] px-3.5 py-2 text-xs text-white placeholder:text-white/40 focus:border-cyan focus:outline-none"
                  />
                </div>
              </div>

              {/* Pinned Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0B0F19] p-3.5">
                <div className="flex items-center gap-2.5">
                  <PushPin className={`h-4 w-4 ${isPinned ? 'text-amber' : 'text-white/40'}`} weight={isPinned ? 'fill' : 'regular'} />
                  <div>
                    <p className="text-xs font-bold text-white">Pin to Top of Bell Feed</p>
                    <p className="text-[10px] text-white/50">Pinned notifications always appear first with a highlight badge.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="h-4 w-4 rounded border-white/30 text-cyan focus:ring-cyan"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-violet py-3 font-mono text-xs font-black uppercase tracking-wider text-black shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:scale-[1.01] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                <PaperPlaneRight className="h-4 w-4" weight="bold" />
                <span>{submitting ? 'Broadcasting…' : 'Send Broadcast Notification Live'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Live Visual Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-cyan/30 bg-[#0B0F19]/90 p-5 shadow-panel space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-mono text-xs font-black uppercase tracking-wider text-cyan">
                ✦ Real-Time Live Preview
              </span>
              <span className="rounded-md border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan">
                BELL ITEM
              </span>
            </div>

            <p className="text-[11px] text-white/60">
              This is how your broadcast will appear inside the visitor's notification dropdown:
            </p>

            {/* Mock Bell Card */}
            <div className="rounded-xl border border-cyan/40 bg-[#111726] p-4 space-y-2 shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider ${previewBadge.bg}`}
                  >
                    {previewBadge.icon}
                    <span>{previewBadge.label}</span>
                  </span>
                  {isPinned && (
                    <span className="flex items-center gap-0.5 rounded-md border border-amber/40 bg-amber/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber">
                      <PushPin className="h-2.5 w-2.5" weight="fill" />
                      PINNED
                    </span>
                  )}
                </div>
                <span className="font-mono text-[10px] text-white/40">Just now</span>
              </div>

              <h5 className="text-xs font-bold text-white leading-snug">
                {title.trim() || 'Headline Title will appear here…'}
              </h5>

              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                {message.trim() || 'Your notification message description will be formatted clearly for members here.'}
              </p>

              {(linkUrl.trim() || linkText.trim()) && (
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-cyan/40 bg-cyan/15 px-2.5 py-1 font-mono text-[10px] font-bold text-cyan">
                    <span>{linkText.trim() || 'View Details'}</span>
                    <span>→</span>
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-[#111726]/60 p-3 text-[11px] text-white/60 space-y-1">
              <p className="font-semibold text-white">⚡ Instant Synchronization</p>
              <p>Once sent, this notification immediately triggers on the navigation bar bell across all public pages.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Broadcasts History & Retraction Table */}
      <div className="rounded-2xl border border-white/15 bg-[#111726]/90 p-6 shadow-panel space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-cyan" />
              <span>Active Broadcast Notifications Feed ({notifications.length})</span>
            </h3>
            <p className="text-xs text-white/60 mt-0.5">
              Manage existing live notifications or retract them when expired.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-cyan border-t-transparent" />
            <p className="mt-2 font-mono text-xs text-white/50">Loading broadcast records…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center space-y-2 border border-dashed border-white/10 rounded-xl">
            <Bell className="mx-auto h-8 w-8 text-white/20" />
            <p className="text-xs font-semibold text-white/80">No active notifications</p>
            <p className="text-[11px] text-white/50">Compose a broadcast above to dispatch an alert.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((n) => {
              const badge = getTypeBadge(n.type);
              return (
                <div key={n.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider ${badge.bg}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                      {n.isPinned && (
                        <span className="flex items-center gap-0.5 rounded-md border border-amber/40 bg-amber/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber">
                          <PushPin className="h-2.5 w-2.5" weight="fill" />
                          PINNED
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-white/40">
                        {timeAgo(n.createdAt)} · Audience: {n.targetRole}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">{n.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>

                    {n.linkUrl && (
                      <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                        <span className="text-cyan font-bold">Link:</span>
                        <a
                          href={n.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-white/70 hover:text-cyan underline flex items-center gap-1"
                        >
                          <span>{n.linkUrl}</span>
                          <ArrowSquareOut className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-rose/40 bg-rose/10 px-3 py-1.5 font-mono text-xs font-bold text-rose transition-colors hover:bg-rose hover:text-white"
                    >
                      <Trash className="h-3.5 w-3.5" />
                      <span>Retract</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
