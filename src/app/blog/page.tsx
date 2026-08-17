import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Chip, LiveDot } from '@/components/ui/badge';
import { Marquee } from '@/components/ui/marquee';
import { ClipReveal, Reveal } from '@/components/ui/reveal';
import { Counter } from '@/components/ui/counter';
import { PhotoFrame } from '@/components/ui/photo';
import { Avatar, EmptyState, Sticker, Stat } from '@/components/ui/misc';
import { formatDate, parseList, relativeTime } from '@/lib/utils';
import { BlogClient, type FeedPost } from './blog-client';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'The Feed',
  description:
    'Writeups, career post-mortems and field notes written by BSA members. Honest numbers, wrong turns included, no thought leadership.',
};

/** A single query param, whether Next handed us a string or an array. */
function first(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The opening paragraph, with the markdown markers stripped for a teaser. */
function coldOpen(content: string): string {
  const opening = content.split('\n\n')[0] ?? '';
  return opening.replace(/\*\*/g, '').replace(/`/g, '').replace(/\*/g, '').trim();
}

const NEW_WINDOW_MS = 10 * 86_400_000;

export default async function BlogPage({
  searchParams,
}: {
  searchParams?: { category?: string | string[]; tag?: string | string[] };
}) {
  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      content: true,
      category: true,
      tags: true,
      imageUrl: true,
      authorName: true,
      authorTitle: true,
      authorAvatar: true,
      readTimeMinutes: true,
      publishedAt: true,
      isFeatured: true,
    },
  });

  const now = Date.now();

  const featured = posts.find((post) => post.isFeatured) ?? posts[0] ?? null;
  const rest = featured ? posts.filter((post) => post.id !== featured.id) : posts;

  const cards: FeedPost[] = rest.map((post) => ({
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    category: post.category,
    tags: parseList(post.tags),
    imageUrl: post.imageUrl,
    authorName: post.authorName,
    authorTitle: post.authorTitle,
    authorAvatar: post.authorAvatar,
    readTimeMinutes: post.readTimeMinutes,
    publishedAt: post.publishedAt.toISOString(),
    isNew: now - post.publishedAt.getTime() < NEW_WINDOW_MS,
  }));

  // Deep links are matched case-insensitively against what actually exists, so
  // /blog?tag=Workforce and /blog?tag=workforce both land on the same filtered view.
  const knownCategories = [...new Set(cards.map((card) => card.category))];
  const knownTags = [...new Set(cards.flatMap((card) => card.tags))];
  const rawCategory = first(searchParams?.category)?.toLowerCase();
  const rawTag = first(searchParams?.tag)?.toLowerCase();
  const initialCategory = knownCategories.find((c) => c.toLowerCase() === rawCategory) ?? null;
  const initialTag = knownTags.find((t) => t.toLowerCase() === rawTag) ?? null;

  const writers = new Set(posts.map((post) => post.authorName)).size;
  const totalMinutes = posts.reduce((sum, post) => sum + post.readTimeMinutes, 0);
  const categoryCount = new Set(posts.map((post) => post.category)).size;
  const featuredTags = featured ? parseList(featured.tags) : [];
  const contents = posts.slice(0, 5);

  return (
    <div className="overflow-x-hidden">
      {/* ==================================================================
 HERO
 ================================================================== */}
      <section className="relative border-b border-line bg-base">
        <div className="absolute inset-0 mesh-grid" aria-hidden />

        <div className="relative mx-auto grid max-w-container-max grid-cols-1 items-start gap-10 px-4 py-14 lg:grid-cols-12 lg:gap-12 lg:px-10 lg:py-20">
          <div className="lg:col-span-7">
            <Reveal direction="down">
              <div className="mb-6 inline-flex flex-wrap items-center gap-2 border border-line bg-surface px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] shadow-panel">
                {posts.length} pieces · {writers} writers · none of them on staff
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.05}>
              <h1 className="relative tracking-tight font-extrabold uppercase leading-[0.88]">
                <span className="relative inline-block text-5xl sm:text-7xl lg:text-8xl font-extrabold text-3d-pop tracking-tight">
                  THE SECURITY
                  <span className="absolute -right-6 -top-4 text-cyan text-2xl animate-pulse">✦</span>
                </span>
                <span className="relative block text-5xl sm:text-7xl lg:text-8xl font-accent font-bold lowercase italic text-3d-pop-cyan -mt-3 sm:-mt-6 lg:-mt-8 rotate-[-3.5deg] drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
                  intelligence feed!
                  <span className="absolute -left-6 bottom-2 text-white text-3xl animate-bounce">✦</span>
                </span>
              </h1>
            </Reveal>

            <Reveal direction="up" delay={0.12}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
                Writeups with the wrong turns left in. Job hunts with the actual rejection counts. Chapter admin nobody
                warns you about. <strong className="text-rose px-0.5 font-bold">No thought leadership</strong>, no
                ten-tips listicles, no post that could have been written by someone who has never opened a terminal.
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.18}>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                {featured && (
                  <Button href={`/blog/${featured.slug}`} tone="magenta" size="lg">
                    ▶ Read the featured one
                  </Button>
                )}
                <Button href="#all-posts" tone="paper" size="lg">
                  Skip to the pile
                </Button>
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.24}>
              <div className="mt-9 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat value={<Counter to={posts.length} />} label="Pieces published" tone="paper" />
                <Stat value={<Counter to={totalMinutes} suffix=" min" />} label="If you read it all" tone="magenta" />
                <Stat
                  value={<Counter to={categoryCount} />}
                  label="Sections of the feed"
                  tone="lime"
                  className="col-span-2 sm:col-span-1"
                />
              </div>
            </Reveal>
          </div>

          {/* Strategic Dispatches / Contents HUD */}
          <div className="lg:col-span-5">
            <Reveal direction="left" delay={0.15}>
              <div className="rounded-2xl border border-white/10 bg-[#0B0F19] shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden ring-1 ring-white/10">
                {/* Panel Header */}
                <div className="flex items-center justify-between border-b border-white/10 bg-[#111726] px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
                    <span className="font-mono text-xs font-black uppercase tracking-wider text-cyan">
                      STRATEGIC DISPATCHES
                    </span>
                  </div>
                  <span className="rounded-full border border-lime/40 bg-lime/15 px-2.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-widest text-lime">
                    LATEST ISSUE
                  </span>
                </div>

                {contents.length === 0 ? (
                  <p className="p-6 font-mono text-xs leading-relaxed text-slate-200" style={{ color: '#E2E8F0' }}>
                    Nothing published yet. The first piece is being written.
                  </p>
                ) : (
                  <ol className="divide-y divide-white/10">
                    {contents.map((post, i) => (
                      <li key={post.id}>
                        <Link
                          href={`/blog/${post.slug}`}
                          className="group flex items-center justify-between gap-4 px-5 py-4 transition-all hover:bg-[#111726]/80 text-white"
                          style={{ color: '#FFFFFF' }}
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan/50 bg-cyan/20 font-mono text-xs font-black text-cyan shadow-sm"
                              style={{ color: '#38BDF8' }}
                            >
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                              <span
                                className="block text-base font-bold text-white leading-snug group-hover:text-cyan transition-colors"
                                style={{ color: '#FFFFFF' }}
                              >
                                {post.title}
                              </span>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span
                                  className="rounded-md border border-cyan/40 bg-cyan/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan"
                                  style={{ color: '#38BDF8' }}
                                >
                                  {post.category}
                                </span>
                                <span
                                  className="font-mono text-[11px] font-medium text-slate-200"
                                  style={{ color: '#CBD5E1' }}
                                >
                                  {post.readTimeMinutes} min read · {relativeTime(post.publishedAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span
                            className="shrink-0 font-mono text-sm font-bold text-cyan transition-transform group-hover:translate-x-1"
                            style={{ color: '#38BDF8' }}
                          >
                            →
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}

                {/* Panel Footer */}
                <div className="border-t border-white/10 bg-[#070A12] px-5 py-3.5 flex items-center justify-between">
                  <p className="font-mono text-xs text-slate-200 flex items-center gap-1.5" style={{ color: '#E2E8F0' }}>
                    <span className="text-cyan font-bold" style={{ color: '#38BDF8' }}>⚡</span>
                    <span>Authored by practicing security leaders</span>
                  </p>
                  <a
                    href="#all-posts"
                    className="font-mono text-[11px] font-bold uppercase tracking-wider text-cyan hover:underline"
                    style={{ color: '#38BDF8' }}
                  >
                    View All →
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Marquee
        tone="ink"
        speed="slow"
        items={[
          'SECURITY INTELLIGENCE',
          'FIELD OPERATIONS',
          'INCIDENT POST-MORTEMS',
          'EXECUTIVE PLAYBOOKS',
          'RISK ARCHITECTURE',
          'ZERO-DAY WRITEUPS',
        ]}
      />

      {/* ==================================================================
  FEATURED SPOTLIGHT
  ================================================================== */}
      {featured ? (
        <section className="border-b border-white/10 bg-[#070A12] py-14 lg:py-20">
          <div className="mx-auto max-w-container-max px-4 lg:px-10">
            <Reveal>
              <div className="rounded-3xl border border-white/10 bg-[#0B0F19] p-6 sm:p-8 lg:p-10 shadow-[0_30px_90px_rgba(0,0,0,0.95)] ring-1 ring-white/10">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
                  <div className="lg:col-span-7 flex flex-col justify-between">
                    <div>
                      <div className="mb-5 flex flex-wrap items-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose/40 bg-rose/15 px-3 py-1 font-mono text-[11px] font-black uppercase tracking-widest text-rose shadow-sm">
                          <span className="h-2 w-2 rounded-full bg-rose animate-pulse" /> SPOTLIGHT BRIEFING
                        </span>
                        <span className="rounded-full border border-cyan/40 bg-cyan/15 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-cyan">
                          {featured.category}
                        </span>
                        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-xs font-bold text-slate-200">
                          {featured.readTimeMinutes} min read
                        </span>
                      </div>

                      <Link href={`/blog/${featured.slug}`} className="group block">
                        <h2
                          className="font-display text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight group-hover:text-cyan transition-colors"
                          style={{ color: '#FFFFFF' }}
                        >
                          {featured.title}
                        </h2>
                      </Link>

                      <p
                        className="mt-4 max-w-2xl border-l-2 border-cyan/40 pl-4 text-base sm:text-lg leading-relaxed text-slate-200"
                        style={{ color: '#E2E8F0' }}
                      >
                        {featured.summary}
                      </p>

                      {featuredTags.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-2">
                          {featuredTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-xs font-semibold text-slate-300"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3.5">
                        <Avatar name={featured.authorName} src={featured.authorAvatar} size="md" />
                        <div className="min-w-0">
                          <p className="font-display text-sm font-bold uppercase leading-tight text-white" style={{ color: '#FFFFFF' }}>
                            {featured.authorName}
                          </p>
                          <p className="text-xs text-slate-300 mt-0.5">{featured.authorTitle}</p>
                          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                            {formatDate(featured.publishedAt)}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/blog/${featured.slug}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan/50 bg-cyan px-5 py-3 font-mono text-xs font-black uppercase tracking-wider text-black transition-all hover:bg-white hover:scale-105 shadow-xl flex-shrink-0"
                      >
                        Read Full Intelligence Briefing →
                      </Link>
                    </div>
                  </div>

                  {/* Cover photograph, then cold open excerpt. */}
                  <div className="flex flex-col gap-5 lg:col-span-5">
                    <ClipReveal>
                      <PhotoFrame src={featured.imageUrl} alt="" seed={featured.slug} ratio="wide" priority />
                    </ClipReveal>

                    <div className="relative flex-1 rounded-2xl border border-white/10 bg-[#111726] p-5 sm:p-6 shadow-xl">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                        <span className="font-mono text-[11px] font-black uppercase tracking-widest text-cyan flex items-center gap-2">
                          <span>⚡</span> COLD OPEN // EXCERPT
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">Unfiltered View</span>
                      </div>
                      <p className="font-mono text-xs sm:text-sm leading-relaxed text-slate-200 italic" style={{ color: '#CBD5E1' }}>
                        &ldquo;{coldOpen(featured.content)}&rdquo;
                      </p>
                      <Link
                        href={`/blog/${featured.slug}`}
                        className="mt-4 inline-flex items-center gap-1.5 border-t border-white/10 pt-3 font-mono text-xs font-bold uppercase tracking-wider text-cyan hover:underline"
                      >
                        <span>{featured.readTimeMinutes} min deep dive continues</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      ) : (
        <section className="border-b border-white/10 bg-[#070A12] py-16 lg:py-20">
          <div className="mx-auto max-w-container-max px-4 lg:px-10">
            <EmptyState
              title="The intelligence feed is being prepared"
              blurb="The inaugural security dispatch is currently under peer review."
              action={
                <Button href="/contact" tone="magenta">
                  Submit An Executive Pitch
                </Button>
              }
            />
          </div>
        </section>
      )}

      {/* ==================================================================
  THE INTELLIGENCE VAULT (THE PILE)
  ================================================================== */}
      {cards.length > 0 && (
        <BlogClient
          key={`${initialCategory ?? 'all'}-${initialTag ?? 'any'}`}
          posts={cards}
          initialCategory={initialCategory}
          initialTag={initialTag}
        />
      )}

      {/* ==================================================================
  ALLIANCE CALL FOR AUTHORS
  ================================================================== */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[#070A12] py-16 lg:py-24">
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-cyan/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-violet/10 blur-3xl" />

        <div className="relative mx-auto max-w-container-max px-4 lg:px-10">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Reveal>
                <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-cyan/40 bg-cyan/15 px-3.5 py-1 font-mono text-xs font-black uppercase tracking-wider text-cyan shadow-sm">
                  ⚡ ALLIANCE CALL FOR PAPERS & AUTHORS
                </span>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                  Real Incident Post-Mortems. <br className="hidden sm:inline" />
                  <span className="text-cyan">Zero Thought Leadership.</span>
                </h2>
                <p className="mt-5 max-w-xl text-base sm:text-lg font-normal leading-relaxed text-slate-200" style={{ color: '#E2E8F0' }}>
                  The most valuable knowledge in security is unvarnished truth: exact hours spent, root causes uncovered, architectures that failed, and how teams recovered. You don’t need PR approval—practitioners read what practitioners write.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan/50 bg-cyan px-6 py-3.5 font-mono text-xs font-black uppercase tracking-wider text-black transition-all hover:bg-white hover:scale-105 shadow-xl"
                  >
                    Submit A Dispatch Proposal →
                  </Link>
                  <Link
                    href="/resources"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-white transition-all hover:border-cyan/50 hover:text-cyan shadow-xl"
                  >
                    Explore Alliance Toolkits
                  </Link>
                </div>
              </Reveal>
            </div>

            <div className="lg:col-span-5">
              <Reveal direction="left" delay={0.1}>
                <div className="rounded-3xl border border-white/10 bg-[#0B0F19] p-6 sm:p-8 shadow-2xl ring-1 ring-white/10">
                  <p className="font-mono text-xs font-black uppercase tracking-widest text-cyan mb-5 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
                    WHAT MAKES A VALUABLE BRIEFING
                  </p>
                  <ul className="space-y-4">
                    {[
                      ['First-Hand Security Operations', 'Architectures built, breached, defended, or refactored. No second-hand summaries.'],
                      ['Unvarnished Failure Modes', 'The misconfigurations and wrong assumptions that actually caused the delay.'],
                      ['Concrete Operational Telemetry', 'Real timelines, headcount involved, tooling evaluated, and actual cost benchmarks.'],
                      ['Pragmatic Recommendations', 'Direct takeaways and playbooks other security directors can deploy tomorrow.'],
                    ].map(([title, detail], i) => (
                      <li key={title} className="flex gap-4 items-start">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan/40 bg-cyan/15 font-mono text-xs font-black text-cyan shadow-sm">
                          0{i + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="block text-sm font-bold text-white" style={{ color: '#FFFFFF' }}>
                            {title}
                          </span>
                          <span className="mt-0.5 block text-xs font-normal leading-relaxed text-slate-300" style={{ color: '#CBD5E1' }}>
                            {detail}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
