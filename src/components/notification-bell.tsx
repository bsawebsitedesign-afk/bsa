'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCircle, Megaphone, PushPin, Warning, Info, Sparkle } from '@phosphor-icons/react/dist/ssr';

export interface SiteNotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'ALERT' | 'SUMMIT' | 'ADVISORY' | 'UPDATE' | string;
  linkUrl: string | null;
  linkText: string | null;
  isPinned: boolean;
  createdAt: string;
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
    case 'SECURITY':
      return {
        label: 'SECURITY ALERT',
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

export function NotificationBell() {
  const [notifications, setNotifications] = useState<SiteNotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load read state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bsa_read_notifications');
      if (stored) {
        setReadIds(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && Array.isArray(data.data)) {
          setNotifications(data.data);
        }
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000); // 45s live polling
    return () => clearInterval(interval);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem('bsa_read_notifications', JSON.stringify(allIds));
    } catch {
      // Ignore
    }
  };

  const markSingleAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      const next = [...readIds, id];
      setReadIds(next);
      try {
        localStorage.setItem('bsa_read_notifications', JSON.stringify(next));
      } catch {
        // Ignore
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open && unreadCount > 0) {
            // Optional auto-mark read after view
          }
        }}
        aria-label="Site Notifications"
        className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 ${
          open
            ? 'border-cyan bg-cyan/20 text-cyan shadow-[0_0_15px_rgba(6,182,212,0.4)]'
            : 'border-white/15 bg-white/5 text-white/85 hover:border-cyan/50 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Bell className="h-4 w-4 transition-transform hover:scale-110" weight={unreadCount > 0 ? 'fill' : 'regular'} />

        {/* Unread Ping Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 z-20 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose border-2 border-[#070A12] px-1 font-mono text-[10px] font-black text-white shadow-[0_0_12px_#f43f5e] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full pt-2.5 z-50 w-80 sm:w-96 before:absolute before:-top-3 before:inset-x-0 before:h-3"
          >
            <div className="overflow-hidden rounded-2xl border border-cyan/50 bg-[#0B0F19] shadow-[0_25px_80px_rgba(0,0,0,0.98)] ring-1 ring-white/10">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 bg-[#131A2B] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan shadow-[0_0_8px_#06b6d4]"></span>
                  </span>
                  <p className="font-mono text-xs font-black uppercase tracking-wider text-cyan">
                    Alliance Broadcasts
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="font-mono text-[10px] font-bold text-white/70 hover:text-cyan transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div className="max-h-[420px] overflow-y-auto divide-y divide-white/10 bg-[#0B0F19] scrollbar-thin">
                {loading ? (
                  <div className="p-8 text-center bg-[#0B0F19]">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-cyan border-t-transparent" />
                    <p className="mt-2 font-mono text-xs text-white/50">Fetching alerts…</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center space-y-2 bg-[#0B0F19]">
                    <Bell className="mx-auto h-8 w-8 text-white/20" />
                    <p className="text-xs font-semibold text-white/80">No broadcast notifications</p>
                    <p className="text-[11px] text-white/50">All systems are currently nominal.</p>
                  </div>
                ) : (
                  [...notifications]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((item) => {
                      const isUnread = !readIds.includes(item.id);
                      const badge = getTypeBadge(item.type);

                      return (
                        <div
                          key={item.id}
                          onClick={() => markSingleAsRead(item.id)}
                          className={`p-4 transition-colors relative cursor-pointer ${
                            isUnread
                              ? 'bg-[#101728] hover:bg-[#151E33] border-l-2 border-l-cyan'
                              : 'bg-[#0B0F19] hover:bg-[#101626] border-l-2 border-l-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider ${badge.bg}`}
                              >
                                {badge.icon}
                                <span>{badge.label}</span>
                              </span>
                              {item.isPinned && (
                                <span className="flex items-center gap-0.5 rounded-md border border-amber/40 bg-amber/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber">
                                  <PushPin className="h-2.5 w-2.5" />
                                  PINNED
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-cyan/90 font-bold shrink-0">{timeAgo(item.createdAt)}</span>
                          </div>

                          <h5 className="text-xs font-bold text-white leading-snug">
                            {item.title}
                          </h5>

                          <p className="mt-1 text-xs text-slate-200 leading-relaxed font-normal">
                            {item.message}
                          </p>

                          {item.linkUrl && (
                            <div className="mt-2.5">
                              <Link
                                href={item.linkUrl}
                                onClick={() => {
                                  markSingleAsRead(item.id);
                                  setOpen(false);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-cyan/50 bg-cyan/20 px-2.5 py-1 font-mono text-[10px] font-bold text-cyan transition-all hover:bg-cyan hover:text-black shadow-sm group"
                              >
                                <span>{item.linkText || 'View Details'}</span>
                                <span className="transition-transform group-hover:translate-x-0.5">→</span>
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-white/10 bg-[#070A12] p-2.5 text-center">
                <p className="font-mono text-[10px] text-white/50">
                  ⚡ Authenticated Executive Broadcast Network
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
