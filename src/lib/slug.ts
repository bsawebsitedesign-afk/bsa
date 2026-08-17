import { prisma } from './prisma';
import { slugify } from './utils';

type SlugModel = 'event' | 'blogPost' | 'opportunity' | 'chapter' | 'resource';

/**
 * Builds a URL slug that is unique for the given model, appending -2, -3, …
 * until it lands. `ignoreId` lets an update keep its own slug.
 */
export async function uniqueSlug(model: SlugModel, title: string, ignoreId?: string): Promise<string> {
  const base = slugify(title) || 'item';

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;

    // `as never` narrows the union of delegate argument types, which TS cannot
    // resolve when the model name is dynamic.
    const delegate = prisma[model] as unknown as {
      findUnique: (args: { where: { slug: string }; select: { id: true } }) => Promise<{ id: string } | null>;
    };
    const existing = await delegate.findUnique({ where: { slug: candidate }, select: { id: true } });

    if (!existing || existing.id === ignoreId) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}
