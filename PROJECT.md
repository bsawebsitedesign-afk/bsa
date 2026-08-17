# BSA Platform: Design and Architecture

The single reference for this codebase. What it is, how it is built, why it looks
the way it does, and what has actually been verified.

`README.md` is the short version for someone who just wants it running.
`HOW-IT-WORKS.md` walks each feature end to end. This file is the whole picture.

---

## Contents

1. [What this is](#1-what-this-is)
2. [Stack and conventions](#2-stack-and-conventions)
3. [Architecture](#3-architecture)
4. [Data model](#4-data-model)
5. [API surface](#5-api-surface)
6. [Security](#6-security)
7. [Design system](#7-design-system)
8. [Theming](#8-theming)
9. [Motion](#9-motion)
10. [Photography](#10-photography)
11. [Design rules this project follows](#11-design-rules-this-project-follows)
12. [Content: seed, demo and launch](#12-content-seed-demo-and-launch)
13. [Configuration](#13-configuration)
14. [Scripts](#14-scripts)
15. [Deployment](#15-deployment)
16. [Verification](#16-verification)
17. [Known gaps](#17-known-gaps)

---

## 1. What this is

The Business Security Alliance is a **professional association for the security
industry**, not a company selling security products. The platform exists to
connect the people and organisations that make up that industry.

Its audience is security professionals, security leaders, consultants, vendors,
member organisations and partners.

The product is a membership platform rather than a brochure site. Members have
real profiles, the directory is searchable and filterable, chapters have
published rosters, events sell tickets, and every public form feeds a lead
inbox.

| Pillar      | What it means here                                                         |
| :---------- | :------------------------------------------------------------------------- |
| Connect     | The member directory. The centrepiece and the reason most people join.     |
| Grow        | Opportunities: roles, partnerships, tenders, board seats, speaking calls.  |
| Learn       | Practitioner resources with per-module progress tracked against a profile. |
| Participate | Events with ticketing and CPD hours, plus regional chapters.               |

**Scale:** 33,211 lines of TypeScript across 24 page routes, 20 API routes,
20 data models, 12 UI primitives and 11 library modules.

---

## 2. Stack and conventions

|            |                                                             |
| :--------- | :---------------------------------------------------------- |
| Framework  | Next.js 14, App Router, Server Components by default        |
| Language   | TypeScript 5.5, strict                                      |
| Styling    | Tailwind CSS 3.4, colours driven by CSS variables           |
| Data       | Prisma 5 with SQLite. One line changes it to PostgreSQL     |
| Auth       | `jose` (JWT, HS256) plus `bcryptjs` at cost 12              |
| Validation | `zod` at every route boundary                               |
| Motion     | Framer Motion                                               |
| Icons      | Phosphor, `weight="bold"`, one family, no hand-rolled paths |
| Formatting | Prettier, 120 columns, single quotes                        |

**Conventions that are load-bearing:**

- Server Components are the default. `'use client'` marks an isolated leaf, never
  a whole page. Interactive pages are a server `page.tsx` that queries and a
  client `*-client.tsx` that renders controls.
- List pages set `export const revalidate = 30`. The dashboard and admin console
  are dynamic.
- Detail pages call `notFound()` for a missing or unpublished record, and there
  is deliberately **no root `loading.tsx`**: a Suspense boundary above a detail
  page flushes the response before `notFound()` can set a 404, and a nonexistent
  event would then be served as a perfectly indexable 200. Skeletons live only on
  routes that are slow and never call `notFound()`.
- No `scroll` event listeners. Scroll is read through Motion's `useScroll`.
- No `requestAnimationFrame` loop touches React state. Tweens write to a DOM ref.

---

## 3. Architecture

```
src/
  app/
    (auth)/            login, register, forgot-password, reset-password
    api/               20 route handlers
    directory/         member search              <- the flagship surface
    members/[handle]   public member profiles
    events/            listings, detail, ticketing
    checkout/          in-app payment gateway
    opportunities/     roles, partnerships, tenders, speaking, board seats
    resources/         practitioner guidance plus progress tracking
    chapters/          regional chapters and membership
    blog/              industry insights
    sponsors/ about/ membership/ contact/
    dashboard/         member portal
    admin/             association back office
    globals.css        theme tokens, material language, utilities
    layout.tsx         fonts, metadata, nav session, providers

  components/
    ui/
      button card badge field marquee counter misc modal toast
      reveal.tsx       entrance motion: Reveal, RevealGroup/Item,
                       RevealWords, ClipReveal, EngraveRule
      scroll.tsx       scroll-linked motion: Parallax, ScrollRail, ScrollScale,
                       HorizontalScroll, TiltCard, Magnetic, Spotlight,
                       ScrollProgress
      photo.tsx        PhotoFrame, PhotoHex, LatticeArt
    navbar footer logo grain skeleton
    hero-lattice.tsx   the hero canvas
    hero-bits.tsx      hero figure strip and pinned copy column

  lib/
    api.ts             route wrapper: validation, error shaping, rate limiting
    auth.ts            jose sessions, bcrypt, single-use reset tokens
    validation.ts      every zod schema in one place
    rate-limit.ts      fixed-window limiter
    email.ts           Resend adapter plus a console transport
    payment.ts         checkout adapter
    hubspot.ts         CRM adapter
    env.ts             environment contract
    slug.ts utils.ts prisma.ts

  middleware.ts        Edge session verification and role gating
```

### Request shape

Every API route is wrapped in `route()` from `lib/api.ts`, which gives all of
them the same behaviour: zod validation, rate limiting, consistent error shaping,
and no internal detail leaking in production.

Responses are always `{ ok: true, ... }` or `{ ok: false, error, fields? }`.

| Status    | Meaning here                                                 |
| :-------- | :----------------------------------------------------------- |
| 200 / 201 | Success. 201 on creation.                                    |
| 401       | Not signed in, or bad credentials.                           |
| 403       | Signed in, not allowed.                                      |
| 404       | No such record.                                              |
| 409       | Conflict: duplicate email, handle taken, already registered. |
| 422       | Validation failed. `fields` carries per-field messages.      |
| 429       | Rate limited, with seconds remaining.                        |

### Adapters

Payments, email and CRM are adapters, so the platform runs fully without any of
them and upgrades without touching call sites.

- **Payment.** `MODULAR_GATEWAY` is a real, working in-app checkout: a paid
  registration creates a `PENDING` payment and holds the place, and
  `/api/payments/confirm` settles it idempotently. Setting
  `PAYMENT_PROVIDER=STRIPE` before implementing it **throws deliberately**
  rather than silently taking no money.
- **Email.** With `RESEND_API_KEY` set it posts to Resend. Without it, mail is
  written to the server log with the reset link printed verbatim, so the whole
  recovery flow stays testable locally.
- **CRM.** Unconfigured, leads are stored locally and marked `SKIPPED`. It never
  claims a sync that did not happen.

---

## 4. Data model

20 models. The spine:

**Identity.** `User` holds credentials and role. `MemberProfile` is the public
record, one per user, carrying the handle, discipline, specialisms and
availability flags. `MemberPrivacy` is a separate row of seven independent
switches so visibility is never a side effect of anything else.
`PasswordResetToken` stores only a SHA-256 of the token.

**Learn.** `Resource` has many `ResourceModule`. `ResourceProgress` is unique on
`(userId, moduleId)`, so marking a module read twice is a no-op.

**Grow.** `Opportunity` has many `Application`, unique on
`(opportunityId, email)`, so one response per person per listing.

**Participate.** `Chapter` has many `ChapterMembership`, unique on
`(chapterId, userId)`. `Event` has speakers, sponsors, tickets and
registrations; `EventRegistration` is unique on `(eventId, attendeeEmail)` and
carries a `registrationCode`. `Payment` links to a registration and holds the
provider transaction id.

**Content and leads.** `BlogPost`, `Sponsor`, `FormSubmission`.

Notes on shape:

- SQLite has no array type, so list columns (`specialties`, `skills`, `tags`,
  `requirements`, `agendaJson`) are JSON strings read through `parseList` and
  `parseJson`.
- `imageUrl` exists on `Chapter`, `Resource` and `BlogPost`; `heroImageUrl` on
  `Event`; `logoUrl` on `Sponsor` and `Opportunity`; `avatarUrl` on
  `MemberProfile`. Any of these can be set to a real photograph at any time.
- `memberType` is marked **provisional** in the schema, the validation layer and
  the UI. The membership model was never confirmed, and nothing invented was
  presented as settled.

---

## 5. API surface

| Endpoint                                                         | Methods             | Notes                                                     |
| :--------------------------------------------------------------- | :------------------ | :-------------------------------------------------------- |
| `/api/auth/register`                                             | POST                | Resolves a unique handle, sends a welcome email           |
| `/api/auth/login`                                                | POST                | Compares against a dummy hash when the account is missing |
| `/api/auth/logout`                                               | POST                |                                                           |
| `/api/auth/forgot-password`                                      | POST                | Always the same 200, retires prior tokens                 |
| `/api/auth/reset-password`                                       | POST                | Single-use token, one hour, SHA-256 stored                |
| `/api/auth/change-password`                                      | POST                | Requires the current password, rejects reuse              |
| `/api/user/profile`                                              | PUT                 | Handle collision check                                    |
| `/api/user/privacy`                                              | PUT                 | Seven switches                                            |
| `/api/resources/complete`                                        | POST, DELETE        | Idempotent                                                |
| `/api/chapters/[slug]/join`                                      | POST, DELETE        | Re-joining is idempotent by design                        |
| `/api/opportunities/[slug]/apply`                                | POST                | One response per email                                    |
| `/api/events/[id]/register`                                      | POST                | Status, ticket, capacity and duplicate checks             |
| `/api/payments/confirm`                                          | POST                | Idempotent, re-verifies before settling                   |
| `/api/forms`                                                     | POST                | Honeypot, accepted and discarded silently                 |
| `/api/admin/{events,opportunities,sponsors,posts,members,leads}` | POST, PATCH, DELETE | Admin only                                                |

The event registration route is keyed by event **id** while event pages route by
**slug**: look the event up by slug, then post to its id.

---

## 6. Security

**The headline fix.** The original `/api/auth/reset-password` accepted
`{ email, newPassword }` and rewrote the password for _any_ account, with no
token and no verification. That is an unauthenticated full-account takeover of
every user on the platform. It now requires a single-use, one-hour token
delivered by email, of which only the SHA-256 is stored.

Also in place:

- **Sessions** signed with `jose` (HS256, 7 days, `httpOnly`, `sameSite=lax`).
  Middleware verifies the **signature** on the Edge runtime rather than merely
  checking that a cookie exists, and clears bad cookies to avoid redirect loops.
- **`JWT_SECRET` is mandatory in production** and must be at least 32 characters.
  Validation is lazy so CI builds do not need the production key.
- **No user enumeration.** Login compares against a dummy bcrypt hash when the
  account does not exist so timing and response shape match; forgot-password
  returns an identical response either way.
- **Rate limiting** on auth (8 per 10 min), registration (5/hr), password reset
  (4/hr), forms (6 per 10 min) and all writes.
- **Open-redirect protection** on `?redirect=` after sign-in: same-origin paths
  only.
- **Admin cannot lock the platform out of itself**: the last admin cannot be
  demoted or deleted.
- **Headers**: HSTS, CSP, `X-Frame-Options: DENY`, `nosniff`, strict referrer
  policy, `no-store` on every API response.
- **Privacy is member-controlled.** A profile can be fully public, directory-only,
  or hidden entirely while the member still uses everything else.

---

## 7. Design system

**Everything descends from the logo.**

The mark is a struck silver medallion: a riveted rim, a heraldic escutcheon, a
portcullis lattice across the field, and circuit traces routed into the metal. It
is an institution's badge with an engineering edge. The interface is built as the
same material, **engraved rather than lit**.

The palette was sampled off the artwork rather than guessed:

| Sampled                               | Value                             |
| :------------------------------------ | :-------------------------------- |
| Shield field, modal                   | `#2E5274`                         |
| Shield field, mean                    | `#466681`                         |
| Medallion shadow / median / highlight | `#3D3F3E` / `#ACADAE` / `#EAEAEA` |

That gives **one accent** at about 60% saturation with cool silver neutrals
around it, which is what a disciplined palette wants anyway.

|           |                                                                                          |
| :-------- | :--------------------------------------------------------------------------------------- |
| Ground    | Cool silver. Light is primary, because the badge is silver                               |
| Accent    | One: the shield's steel blue. Lightened on the dark ground so it still carries text      |
| Geometry  | The escutcheon. Avatars, icon tiles and empty-state glyphs are clipped to the shield     |
| Structure | The portcullis: an orthogonal lattice, each bar dark with a lit lip beside it            |
| Elevation | An engraved edge: a lit top lip, a shadowed lower one, and a shadow tinted to the ground |
| Type      | Archivo (display), IBM Plex Sans (body), IBM Plex Mono (labels and figures)              |

**Type choice.** Archivo is a grotesque with square shoulders and tight apertures
that match an engraved plate. IBM Plex carries the body and the figures, which
keeps the engineering register the circuit traces imply, and keeps the site off
Inter.

**Material utilities** (`globals.css`):

| Class                      | What it draws                                                                        |
| :------------------------- | :----------------------------------------------------------------------------------- |
| `.panel` / `.panel-raised` | A machined plate: hairline, lit top lip, shadowed lower lip                          |
| `.panel-hover`             | The plate lifts and its edge catches more light                                      |
| `.hex-clip`                | The escutcheon. The name predates the shape and is kept so call sites did not change |
| `.mesh-tri`                | The portcullis: orthogonal bars, each with a lit lip                                 |
| `.mesh-grid`               | A plain rule grid                                                                    |
| `.mesh-dots`               | Rivets                                                                               |
| `.aura-*`                  | The sheen a curved metal face throws under a raking light                            |
| `.text-extrude`            | Struck type: lit above, shadowed below. Once per page at most                        |

**Elevation is never a glow.** There are zero glow utilities in the codebase. The
only place light is drawn is the hero canvas, where it is the badge itself, drawn
on canvas rather than as a CSS effect.

---

## 8. Theming

Both modes ship, using CSS variables, and **three viewer states are covered**
because a viewer has three:

| State                            | Selector                                                                           | Palette |
| :------------------------------- | :--------------------------------------------------------------------------------- | :------ |
| Explicit light, or no preference | bare `:root`                                                                       | light   |
| System dark, nothing stamped     | `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme='light'])` | dark    |
| Explicit dark                    | `:root[data-theme='dark']`                                                         | dark    |

Every colour in `tailwind.config.ts` reads one of these variables as
`rgb(var(--token) / <alpha-value>)`, so the entire page tree themes without a
single component changing, and `bg-surface/70` still works.

Three details that make it hold together:

- **`--on-accent`** flips the label colour on accent fills, so a button reads
  correctly in both modes.
- **The brand gradient is themed.** On the light ground it deepens so its white
  label still clears AA across every stop.
- **`--shadow`** is tinted to the ground, so a light page never gets a pure-black
  drop shadow.

**Contrast was verified numerically, not by eye.** Every text token was computed
against every surface it can sit on. That process caught two real failures:
`ink-muted` at 4.08 on raised panels in dark, and near-black at 4.18 on the
gradient's violet end. Both were corrected. `ink-faint` is the one token below
4.5 and is decorative only: rules, dividers and disabled marks, never text.

---

## 9. Motion

Motion is present throughout and **entirely decorative**: every piece of state is
also written down, so nothing is lost without it.

**Scroll-linked.** These read scroll _position_, so scrubbing back scrubs the
animation back.

- The hero pins for a 180vh runway while the badge is struck and then recedes
- `Parallax`, `ScrollScale`, `ScrollRail` (a rail that fills with a node riding
  its leading edge), `ScrollProgress` in the header

**Entrance.** One observer per grid staggers its children, so a 40-item grid
costs one observer. `RevealWords` rides each word up out of its own clipping box.
`ClipReveal` wipes photography in from the bottom edge. `EngraveRule` cuts a
divider in: the shadowed groove first, the lit lip chasing it 80ms behind.

**Pointer.** Cards tilt toward the cursor, the primary action is magnetic, and
the hero's portcullis polishes: bars near the cursor catch the light, the way a
raking light moves across machined metal.

**The hero** (`hero-lattice.tsx`) strikes the badge at viewport scale in three
beats:

1. **Strike.** The portcullis rules itself in bar by bar, then the escutcheon is
   engraved onto it in one continuous stroke and its field fills in behind.
2. **Route.** Traces run out at right angles to their pads, the way a board is
   routed, carrying pulses. One trace per discipline, plus more the larger the
   membership, both read from the live counts.
3. **Recede.** Bound to scroll position: the plate settles back and the lattice
   widens. Scroll up and it returns.

It takes one layout read per frame, suspends the loop entirely when scrolled out
of view, repaints when the reader switches between light and dark, and renders a
single static frame under reduced motion.

`prefers-reduced-motion` is honoured in one global block plus a guard inside
every motion component. Reveals resolve to their final position immediately and
the page is complete on first paint.

### Two motion bugs worth remembering

**The headline deadlock.** `RevealWords` starts each word translated fully below
its `overflow-hidden` wrapper. IntersectionObserver accounts for ancestor
clipping, so an observer on the word itself reports "never intersecting" and the
animation can never start: the headline stays invisible forever. The observer
watches the **wrapper**, not the word.

**Canvas colour strings.** Theme tokens are stored space-separated so Tailwind's
`<alpha-value>` works. Canvas needs commas, and `rgba(1 2 3, 0.5)` is a parse
error that throws on every frame. `token()` converts.

---

## 10. Photography

Every image slot is a fixed-aspect frame, so a missing, slow or broken photograph
never shifts the layout.

`PhotoFrame` does three things beyond showing a picture:

- **Drift.** The image is drawn 8% larger than its frame and moves against the
  scroll, so a page of cards has depth instead of sitting flat.
- **Sheen.** Hovering sweeps a raking light across it, the same gesture the
  buttons use, so the whole interface reads as one material.
- **Engraved lip.** An inset highlight, so the photograph sits _in_ the plate.

**Where the pictures come from.** No image-generation tool is available in this
environment, so an unfilled slot draws a seeded `picsum.photos` photograph at the
frame's own aspect. The seed is the record's slug, so the same record always
draws the same picture. Set a real URL through the admin console or a member
profile and it takes over immediately.

**Portraits are the deliberate exception.** A person with no photograph falls
back to initials in a shield, never to a stock face. Inventing a face for a named
member is worse than showing none.

Image URLs are member- and admin-supplied and can point anywhere, so they render
through a plain `<img>` with lazy loading rather than `next/image`, which would
need every possible host allow-listed at build time.

---

## 11. Design rules this project follows

The repository carries an anti-slop frontend skill at
`.agents/skills/design-taste-frontend/SKILL.md`. Its pre-flight check is
mechanical, so compliance is measurable rather than a matter of opinion.

| Rule                                            |                    State |
| :---------------------------------------------- | -----------------------: |
| 9.G em-dash and en-dash, zero allowed           |                        0 |
| 4.7 eyebrows, budget `ceil(sections / 3)` = 35  |                       26 |
| 5.D `window.addEventListener('scroll')`, banned |                        0 |
| 5.D rAF loops touching React state              |                        0 |
| 9.F scroll cues, banned                         |                        0 |
| 9.F decorative status dots, zero by default     |          7, all semantic |
| 9.A neon and outer glow                         |                        0 |
| 3.D emoji, discouraged                          |                        0 |
| 9.E hand-rolled icon SVGs                       |                        0 |
| 3.C allowed icon library                        |                 Phosphor |
| 3.E `h-screen`, banned                          | 0, uses `min-h-[100dvh]` |
| 6.C both themes                                 |                        2 |

Two deliberate exceptions, both flagged rather than hidden:

- **Marquee appears twice per page.** One is the global footer; removing it
  changes every page's footer composition.
- **`/admin` and `/dashboard` are out of scope.** Section 13 of the skill
  excludes dashboards and admin panels, so they were not judged against it.

Three hand-rolled SVGs remain and are permitted: the brand mark (11.F forbids
changing it, 4.8 allows a single geometric mark), the favicon, and `LatticeArt`,
which now only covers a failed image load.

---

## 12. Content: seed, demo and launch

**Everything seeded is fictional.** Every member, partner, event and opportunity
was invented to exercise the product. None of it represents real people or real
BSA history.

The requirements never included a mission statement, founding history or a
confirmed membership model, and **none of those were invented**. Where copy is
missing, an editorial note marks it **in development only**. A visitor deciding
whether to join is never told, in a highlighted box, that the product is
unwritten.

### Going live

```bash
npm run db:clean          # empty every seeded row, keep the schema
npm run db:clean -- --keep-admin
```

Then add the real membership, events, chapters and articles through `/admin`.

**Every page has a first-class empty state.** The site is fully browsable with
zero rows, and each empty state names what belongs there and links to where it is
added. That path is covered by the test sweep, not assumed: all 14 public pages
were verified rendering correctly against an empty database.

---

## 13. Configuration

Every integration degrades gracefully. The app is fully usable with only
`DATABASE_URL` and `JWT_SECRET`.

| Variable              | Required      | Unset behaviour                                      |
| :-------------------- | :------------ | :--------------------------------------------------- |
| `DATABASE_URL`        | yes           |                                                      |
| `JWT_SECRET`          | in production | Dev fallback key; production refuses to boot         |
| `NEXT_PUBLIC_APP_URL` | recommended   | `http://localhost:3000`                              |
| `RESEND_API_KEY`      | no            | Email prints to the server log, reset links included |
| `HUBSPOT_API_KEY`     | no            | Leads stored locally, marked `SKIPPED`               |
| `PAYMENT_PROVIDER`    | no            | Built-in gateway at `/checkout/[txn]`                |

---

## 14. Scripts

| Command             |                                                          |
| :------------------ | :------------------------------------------------------- |
| `npm run dev`       | Development server                                       |
| `npm run build`     | `prisma generate` then `next build`                      |
| `npm start`         | Serve the build                                          |
| `npm run typecheck` | `tsc --noEmit`                                           |
| `npm run format`    | Prettier over `src/` and `prisma/`                       |
| `npm run db:push`   | Sync schema                                              |
| `npm run db:seed`   | Seed demo data                                           |
| `npm run db:reset`  | Wipe, sync, reseed                                       |
| `npm run db:clean`  | Empty for launch. `-- --keep-admin` keeps admin accounts |

**Demo accounts**, password `Password123!`: `admin@bsa.dev`, `demo@bsa.dev`.

---

## 15. Deployment

```bash
docker build -t bsa .
docker run -p 3000:3000 -v bsa-data:/app/data \
  -e JWT_SECRET="$(openssl rand -base64 48)" \
  -e NEXT_PUBLIC_APP_URL="https://your-domain" bsa
```

The image sets `DOCKER_BUILD=1`, which switches `next.config.mjs` to Next's
`standalone` output. It is build-gated because standalone is incompatible with
`next start`, so local production checks keep working.

The entrypoint creates the SQLite schema on first boot against the mounted
volume, and only then, so it never touches an existing database. Prisma's
generated client and native engines are copied explicitly, because the standalone
trace does not follow them.

For more than a single node: change the datasource to `postgresql` and move the
rate limiter in `lib/rate-limit.ts` to Redis. No call sites change.

---

## 16. Verification

Not assumed. Each item below was run.

|                             |                        |
| :-------------------------- | :--------------------- |
| Production build            | clean                  |
| `tsc --noEmit`              | 0 errors               |
| Prettier                    | clean                  |
| Browser console, production | clean                  |
| Pages returning 200         | 56 of 56               |
| Bad slugs returning 404     | verified, not 200      |
| Feature tests               | **58 of 58**           |
| Empty-database render       | all 14 public pages    |
| Both themes                 | captured and inspected |

The feature suite covers registration, sign-in including wrong-password and
unknown-email paths, route guards, profile and privacy, module progress, chapter
join and leave, applications, free and paid event registration, payment
settlement and its idempotency, forms and the honeypot, password change, and the
**full password-reset round trip using the token the email transport actually
emitted**, including single-use enforcement. Plus admin CRUD across sponsors,
posts, opportunities and events, and the role guards around them.

Rate limiting is verified by the suite failing when re-run too quickly, which is
the limiter working.

---

## 17. Known gaps

Stated plainly rather than left to be discovered.

- **Placeholder photography.** The seeded images are `picsum.photos` shots:
  deterministic and never a fake person, but generic stock rather than
  security-industry imagery. Real URLs replace them per record.
- **Membership model unconfirmed.** `memberType`, tiers and pricing are
  provisional and flagged as such in the schema, validation and UI.
- **Institutional copy missing.** Mission, founding history and governance were
  never supplied and were not invented.
- **SQLite and an in-process rate limiter** are single-node. Both have a
  documented upgrade path that changes no call sites.
- **One dev-only Motion warning** about a scroll container. It does not appear in
  the production build and does not affect rendering.
- **List-page structure repeats.** The five list pages are the same header band
  plus a uniform grid. A structural variation pass would help and has not been
  done.
