import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip } from '@/components/ui/badge';
import { ClipReveal, Reveal, RevealGroup, RevealItem } from '@/components/ui/reveal';
import { PhotoFrame } from '@/components/ui/photo';
import { Avatar, SectionHead, Sticker } from '@/components/ui/misc';
import { cn, formatDate, parseList, relativeTime } from '@/lib/utils';

export const revalidate = 30;

const CATEGORY_TONE: Record<string, 'lime' | 'magenta' | 'violet' | 'tangerine' | 'cobalt'> = {
  'Field Notes': 'lime',
  Careers: 'magenta',
  Writeups: 'violet',
  Chapters: 'tangerine',
};

function toneFor(category: string) {
  return CATEGORY_TONE[category] ?? 'cobalt';
}

/* -------------------------------------------------------------------------- */
/* Content rendering  */
/*  */
/* Posts are stored as plain text: blank lines separate paragraphs, **stars**  */
/* mark bold, *single stars* mark emphasis, `backticks` mark code, and lines  */
/* beginning with "- " are bullets. Small parser, no markdown dependency.  */
/* -------------------------------------------------------------------------- */

const INLINE_PATTERN = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text
    .split(INLINE_PATTERN)
    .filter((piece) => Boolean(piece))
    .map((piece, i) => {
      const key = `${keyPrefix}-${i}`;

      if (piece.length > 4 && piece.startsWith('**') && piece.endsWith('**')) {
        return (
          <strong key={key} className="font-bold text-ink">
            {piece.slice(2, -2)}
          </strong>
        );
      }
      if (piece.length > 2 && piece.startsWith('`') && piece.endsWith('`')) {
        return (
          <code
            key={key}
            className="border border-line bg-surface-inset px-1.5 py-0.5 font-mono text-[0.85em] text-ink"
          >
            {piece.slice(1, -1)}
          </code>
        );
      }
      if (piece.length > 2 && piece.startsWith('*') && piece.endsWith('*')) {
        return (
          <em key={key} className="italic">
            {piece.slice(1, -1)}
          </em>
        );
      }
      return <React.Fragment key={key}>{piece}</React.Fragment>;
    });
}

function renderArticle(content: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const blocks = content
    .split('\n\n')
    .map((block) => block.trim())
    .filter(Boolean);

  blocks.forEach((block, blockIndex) => {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    let paragraph: string[] = [];
    let bullets: string[] = [];
    let part = 0;

    const flushParagraph = () => {
      if (paragraph.length === 0) return;
      const text = paragraph.join(' ');
      const isOpener = nodes.length === 0;
      const key = `p-${blockIndex}-${part++}`;
      nodes.push(
        <p
          key={key}
          className={cn(
            'text-lg leading-relaxed text-ink-soft',
            // The opening paragraph gets a printed drop cap.
            isOpener &&
              'first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-display first-letter:text-[3.6rem] first-letter:leading-[0.74] first-letter:text-ink',
          )}
        >
          {renderInline(text, key)}
        </p>,
      );
      paragraph = [];
    };

    const flushBullets = () => {
      if (bullets.length === 0) return;
      const key = `ul-${blockIndex}-${part++}`;
      nodes.push(
        <ul key={key} className="space-y-3 border-l border-cyan/40 py-1 pl-5">
          {bullets.map((item, i) => (
            <li key={`${key}-${i}`} className="flex gap-3 text-lg leading-relaxed text-ink-soft">
              <span aria-hidden className="mt-[0.6rem] h-2.5 w-2.5 flex-shrink-0 border border-line bg-cyan/12" />
              <span className="min-w-0">{renderInline(item, `${key}-${i}`)}</span>
            </li>
          ))}
        </ul>,
      );
      bullets = [];
    };

    for (const line of lines) {
      if (line.startsWith('- ')) {
        flushParagraph();
        bullets.push(line.slice(2));
      } else {
        flushBullets();
        paragraph.push(line);
      }
    }

    flushParagraph();
    flushBullets();
  });

  return nodes;
}

/* -------------------------------------------------------------------------- */

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await prisma.blogPost.findFirst({
    where: { slug: params.slug, isPublished: true },
    select: { title: true, summary: true },
  });

  if (!post) {
    return { title: 'Post not found', description: 'That piece is not on the feed.' };
  }

  return { title: post.title, description: post.summary };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  let post: any = null;
  let pool: any[] = [];

  try {
    post = await prisma.blogPost.findFirst({
      where: { slug: params.slug, isPublished: true },
      select: {
        id: true,
        title: true,
        summary: true,
        content: true,
        category: true,
        tags: true,
        imageUrl: true,
        authorName: true,
        authorTitle: true,
        authorAvatar: true,
        publishedAt: true,
        readTimeMinutes: true,
      },
    });

    if (post) {
      pool = await prisma.blogPost.findMany({
        where: { isPublished: true, id: { not: post.id } },
        orderBy: { publishedAt: 'desc' },
        take: 12,
        select: {
          slug: true,
          title: true,
          summary: true,
          category: true,
          authorName: true,
          authorAvatar: true,
          publishedAt: true,
          readTimeMinutes: true,
        },
      });
    }
  } catch (err) {
    console.error('Blog Detail DB Error on Serverless:', err);
  }

  if (!post) notFound();

  const tags = parseList(post.tags);
  const tone = toneFor(post.category);

  // Same section first, then whatever shares tags, then plain recency.
  const related = [...pool]
    .map((candidate) => {
      const shared = parseList(candidate.tags).filter((tag) => tags.includes(tag)).length;
      return { post: candidate, score: (candidate.category === post.category ? 10 : 0) + shared };
    })
    .sort((a, b) => b.score - a.score || b.post.publishedAt.getTime() - a.post.publishedAt.getTime())
    .slice(0, 3)
    .map((row) => row.post);

  const body = renderArticle(post.content);

  return (
    <div className="overflow-x-hidden">
      {/* ==================================================================
 MASTHEAD
 ================================================================== */}
      <section className="relative border-b border-line bg-base">
        <div className="absolute inset-0 mesh-grid" aria-hidden />

        <div className="relative mx-auto max-w-container-max px-4 py-10 lg:px-10 lg:py-16">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 border border-line bg-surface px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] shadow-panel panel-hover"
          >
            ← Back to the feed
          </Link>

          <div className="mt-8 max-w-4xl">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Chip tone={tone}>{post.category}</Chip>
              <Chip size="sm" tone="paper">
                {post.readTimeMinutes} min read
              </Chip>
              <Chip size="sm" tone="paper">
                {formatDate(post.publishedAt)}
              </Chip>
            </div>

            <Reveal direction="up">
              <h1 className="text-display-lg">{post.title}</h1>
            </Reveal>

            <Reveal direction="up" delay={0.08}>
              <p className="mt-6 max-w-2xl border-l border-line pl-4 text-base leading-relaxed text-ink-soft sm:text-lg">
                {post.summary}
              </p>
            </Reveal>

            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-dashed border-line pt-5">
              <Avatar name={post.authorName} src={post.authorAvatar} size="md" />
              <div className="min-w-0">
                <p className="font-display text-sm uppercase leading-tight">{post.authorName}</p>
                <p className="text-xs leading-snug text-ink-muted">{post.authorTitle}</p>
              </div>
              <span className="ml-auto font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                Published {relativeTime(post.publishedAt)}
              </span>
            </div>

            {/* Lead image. Wipes in from the bottom edge as the reader arrives. */}
            <ClipReveal className="mt-10">
              <PhotoFrame src={post.imageUrl} alt="" seed={params.slug} ratio="ultra" priority overlay={false} />
            </ClipReveal>
          </div>
        </div>
      </section>

      {/* ==================================================================
 THE PIECE
 ================================================================== */}
      <section className="border-b border-line bg-surface py-12 lg:py-16">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Article */}
            <article className="lg:col-span-8">
              <div className="max-w-[68ch] space-y-6">{body}</div>

              <div className="mt-12 max-w-[68ch] border border-line bg-surface-inset p-6 text-ink shadow-panel-lg">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan">End of piece</p>
                <p className="mt-3 text-lg leading-relaxed">
                  That was {post.readTimeMinutes} minutes of someone else&apos;s hard-won experience. The fastest way to
                  say thanks is to write the next one.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button href="/contact" tone="lime">
                    Pitch your post
                  </Button>
                  <Button href="/resources" tone="paper">
                    Go break something
                  </Button>
                </div>
              </div>
            </article>

            {/* Sticky rail */}
            <aside className="lg:col-span-4">
              <div className="space-y-5 lg:sticky lg:top-[88px]">
                <div className="relative">
                  <Sticker
                    tone={tone === 'cobalt' ? 'violet' : tone}
                    rotate={-7}
                    className="absolute -left-2 -top-4 z-20 text-[10px]"
                  >
                    written by a member
                  </Sticker>

                  <Card className="pt-2">
                    <CardBody className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Avatar name={post.authorName} src={post.authorAvatar} size="lg" />
                        <div className="min-w-0">
                          <p className="font-display text-lg uppercase leading-tight">{post.authorName}</p>
                          <p className="mt-1 text-xs leading-snug text-ink-muted">{post.authorTitle}</p>
                        </div>
                      </div>

                      <dl className="space-y-2 border-t border-dashed border-line pt-4 font-mono text-[11px] font-bold uppercase tracking-[0.12em]">
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-ink-muted">Published</dt>
                          <dd>{formatDate(post.publishedAt)}</dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-ink-muted">Read time</dt>
                          <dd>{post.readTimeMinutes} min</dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-ink-muted">Filed under</dt>
                          <dd className="text-right">{post.category}</dd>
                        </div>
                      </dl>

                      {tags.length > 0 && (
                        <div className="border-t border-dashed border-line pt-4">
                          <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
                            Tagged
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                              <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>
                                <Chip size="sm" tone="paper" className="panel-hover shadow-panel">
                                  #{tag}
                                </Chip>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button href="/blog" tone="ink" size="sm" className="w-full">
                        More from the feed →
                      </Button>
                    </CardBody>
                  </Card>
                </div>

                <div className="border border-dashed border-line bg-cyan/10 p-4">
                  <p className="text-xs leading-relaxed text-ink-soft">
                    <strong className="font-bold">Spotted something wrong?</strong> Writers edit their own pieces. Tell
                    us and we will pass it on - corrections get published, not quietly patched.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ==================================================================
 MORE FROM THE FEED
 ================================================================== */}
      {related.length > 0 && (
        <section className="border-b border-line bg-base py-14 lg:py-20">
          <div className="mx-auto max-w-container-max px-4 lg:px-10">
            <SectionHead
              kicker="Keep going"
              title="More from the feed"
              blurb="Same corner of the feed first, then whatever went up most recently."
              action={
                <Button href="/blog" tone="ink" arrow>
                  All pieces
                </Button>
              }
            />

            <RevealGroup className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {related.map((item) => (
                <RevealItem key={item.slug} className="h-full">
                  <Card href={`/blog/${item.slug}`} className="group flex h-full flex-col">
                    <CardBar tone={toneFor(item.category)}>
                      <span className="truncate">{item.category}</span>
                      <span className="flex-shrink-0">{item.readTimeMinutes} min</span>
                    </CardBar>
                    <CardBody className="flex flex-1 flex-col">
                      <h3 className="text-lg leading-tight transition-colors group-hover:text-violet-bright">
                        {item.title}
                      </h3>
                      <p className="mt-2 flex-1 text-xs leading-relaxed text-ink-muted">{item.summary}</p>
                      <div className="mt-4 flex items-center gap-2.5 border-t border-dashed border-line pt-3">
                        <Avatar name={item.authorName} src={item.authorAvatar} size="sm" />
                        <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em]">
                          {item.authorName}
                        </span>
                        <span className="flex-shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-violet-bright transition-transform group-hover:translate-x-1">
                          Read →
                        </span>
                      </div>
                    </CardBody>
                  </Card>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>
      )}
    </div>
  );
}
