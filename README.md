# BSA - Business Security Alliance

A professional association and networking platform for the **security industry**: a searchable member directory, regional chapters, an industry events programme with ticketing, a business opportunities board, practitioner resources, and lead capture wired through to CRM.

Built with Next.js 14 (App Router), TypeScript, Tailwind, Prisma and SQLite.

> **[PROJECT.md](PROJECT.md)** is the full reference: design system, architecture,
> data model, security, theming, motion, and everything that has been verified.
> **[HOW-IT-WORKS.md](HOW-IT-WORKS.md)** walks each feature end to end.

```bash
npm install
cp .env.example .env      # then set JWT_SECRET
npm run db:reset          # push schema + seed
npm run dev
```

→ http://localhost:3000

**Demo accounts** (password `Password123!` for both)

| Role   | Email           |
| :----- | :-------------- |
| Admin  | `admin@bsa.dev` |
| Member | `demo@bsa.dev`  |

> ⚠️ **All seeded content is fictional demo data.** Every member, partner organisation, event and opportunity was invented to exercise the product. None of it represents real people or real BSA history. See [Content status](#content-status) before showing this to anyone.

---

## What BSA is

A professional industry association - **not** a company selling security products or services. The platform exists to connect the people and organisations that make up the security industry.

The audience is security professionals, security leaders, security companies, consultants, industry organisations and sponsors.

### The five pillars

|                        |                                                                                       |
| :--------------------- | :------------------------------------------------------------------------------------ |
| **CONNECT**            | Help security professionals find each other. The member directory is the centrepiece. |
| **GROW**               | Professional and business growth - opportunities, partnerships, referrals.            |
| **LEARN**              | Industry content, practitioner resources, events and expertise.                       |
| **PARTICIPATE**        | Events, regional chapters, committees and community initiatives.                      |
| **BUILD THE INDUSTRY** | A stronger, better-connected security ecosystem.                                      |

### What differentiates it from a traditional association site

A conventional association website is a brochure with an events page. This is a membership platform: members have profiles, the directory is searchable and filterable, chapters have rosters, and the whole thing is instrumented for lead generation.

```
Traditional            BSA
───────────            ───
Information            Membership → Profile → Directory → Networking
Events page            Events + ticketing + CPD hours
Contact form           Opportunities, chapters, resources, CRM-tracked leads
```

### Two goals at once

- **For members:** join → complete profile → discover people → attend events → build network → grow.
- **For BSA:** attract visitors → generate leads → convert members → promote events → attract sponsors. Every public form feeds the HubSpot adapter and the admin lead inbox.

---

## Content status

The requirements did not include an official mission statement, vision statement, founding history or confirmed membership model. **None of these have been invented.**

| Item                                     | Status                                                                                                                                                                                |
| :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mission / vision statement               | **Not written.** No invented wording appears anywhere in the codebase.                                                                                                                |
| Founding history and timeline            | **Placeholder block** on `/about` requesting client copy.                                                                                                                             |
| Membership tiers and pricing             | **Marked provisional** on `/membership`.                                                                                                                                              |
| `memberType` categories                  | **Provisional** - `PROFESSIONAL`, `LEADER`, `CONSULTANT`, `VENDOR`, `ORGANISATION`. Flagged in the schema, validation layer and UI. Confirm with the client before treating as final. |
| Members, partners, events, opportunities | Fictional demo data. Replace before launch.                                                                                                                                           |

Unconfirmed copy is marked with an editorial note that renders **in development only**. A visitor deciding whether to join is never told, in a highlighted box, that the product is unwritten.

---

## Design

**Everything descends from the logo.** The mark is a struck silver medallion: a riveted rim, a heraldic escutcheon, a portcullis lattice across the field, and circuit traces routed into the metal. It is an institution's badge with an engineering edge, and the interface is built as the same material - engraved rather than lit.

The palette is sampled directly off the artwork: the shield's field reads `#2E5274`, and the medallion runs `#3D3F3E` through `#ACADAE` to `#EAEAEA`. One accent, under 60% saturation, with silver neutrals around it.

|           |                                                                                                            |
| :-------- | :--------------------------------------------------------------------------------------------------------- |
| Ground    | Cool silver. Light is primary, since the badge is silver; a gunmetal dark ships alongside                  |
| Signal    | One accent: the shield's steel blue, lightened on the dark ground so it still carries text                 |
| Geometry  | The escutcheon - avatars, icon tiles and empty-state glyphs are clipped to the shield                      |
| Structure | The portcullis - an orthogonal lattice, each bar dark with a lit lip beside it                             |
| Elevation | An engraved edge: a lit top lip, a shadowed lower one, and a shadow tinted to the ground. No glow anywhere |
| Type      | Archivo (display), IBM Plex Sans (body), IBM Plex Mono (labels and figures)                                |
| Icons     | Phosphor, `weight="bold"`, one family. No hand-rolled icon paths                                           |

Colour is signal, never decoration.

### Theming

Both modes ship, via CSS variables (`src/app/globals.css`). Three states are covered because a viewer has three:

- bare `:root` defines the **light** palette
- `@media (prefers-color-scheme: dark)`, guarded `:root:not([data-theme='light'])`, redefines the tokens for the default un-stamped document
- `:root[data-theme='dark']` redefines them again so an explicit choice wins in both directions

Every colour in `tailwind.config.ts` reads one of these variables, so the entire page tree themes without a single component changing. **Every text token was checked numerically against every surface it can sit on and clears WCAG AA in both modes**; `ink-faint` is the sole exception and is decorative only. `--on-accent` flips the label colour on accent fills, and the brand gradient deepens on the light ground so its white label still passes across every stop.

### Motion

Heavy by design and entirely decorative: every piece of state is also written down, so nothing is lost without it.

- **Scroll-linked**: the hero pins for a 180vh runway while the lattice disperses, plus parallax layers, a progress rail in the header, and sections that scale into place. These read scroll _position_, so scrubbing back scrubs the animation back.
- **Entrance**: one observer per grid staggers its children; headlines rise word-by-word out of clipping boxes; photography wipes in from the bottom edge.
- **Pointer**: cards tilt toward the cursor, the primary action is magnetic, and the lattice repels and re-springs under the pointer.
- **The hero** (`src/components/hero-lattice.tsx`) strikes the badge at viewport scale in three beats. The portcullis rules itself in bar by bar; the escutcheon is engraved onto it in one continuous stroke and its field fills in behind; then traces route out at right angles to their pads, carrying pulses, one trace per discipline plus more the larger the membership. Scroll settles the plate back and widens the lattice. The pointer polishes: bars near the cursor catch the light, as a raking light moves across machined metal. It repaints when the reader switches between light and dark.

No `scroll` event listeners anywhere: scroll is read through Motion's `useScroll`. No `requestAnimationFrame` loop touches React state; tweens write to a DOM ref. `prefers-reduced-motion` is honoured in one global block plus a guard in every motion component.

### Photography

Every image slot is a fixed-aspect frame, so a missing, slow or broken photo never shifts the layout.

No image-generation tool is available in this environment, so an unfilled slot draws a **seeded `picsum.photos` photograph** at the frame's own aspect. The seed is the record's slug, so the same record always draws the same picture. Supply a real URL through the admin console or a member profile and it takes over.

**Portraits are the deliberate exception**: a person with no photograph falls back to initials, never to a stock face. Inventing a face for a named member is worse than showing none.

Image URLs are member- and admin-supplied and can point anywhere, so they render through a plain `<img>` with lazy loading rather than `next/image`, which would need every possible host allow-listed at build time.

---

## Architecture

```
src/
  app/
    (auth)/          login · register · forgot-password · reset-password
    api/             route handlers
    directory/       member search            ← flagship
    members/[handle] public member profiles
    events/          listings, detail, ticketing
    checkout/        in-app payment gateway
    opportunities/   roles, partnerships, RFPs, speaking, board positions
    resources/       practitioner guidance + progress tracking
    chapters/        regional chapters + membership
    blog/            industry insights
    sponsors/        partners
    about/ membership/ contact/
    dashboard/       member portal
    admin/           association back office
  components/
    ui/
      button card badge field marquee counter misc modal toast
      reveal.tsx     entrance animation - Reveal, RevealGroup/Item, RevealWords, ClipReveal
      scroll.tsx     scroll-linked motion - Parallax, ScrollRail, ScrollScale,
                     HorizontalScroll, TiltCard, Magnetic, Spotlight, ScrollProgress
      photo.tsx      PhotoFrame, PhotoHex, LatticeArt (generated fallback art)
    navbar, footer, hero-lattice, hero-bits, logo, grain, skeleton
  lib/
    api.ts           route wrapper: validation, error shaping, rate-limit guard
    auth.ts          jose sessions, bcrypt, reset tokens
    validation.ts    every zod schema
    rate-limit.ts    fixed-window limiter
    email.ts         Resend adapter + console transport
    payment.ts       checkout adapter
    hubspot.ts       CRM adapter
    env.ts           environment contract
```

### API

Every endpoint returns `{ok: true, …}` or `{ok: false, error, fields?}`.

| Endpoint                                                                | Purpose                                                |
| :---------------------------------------------------------------------- | :----------------------------------------------------- |
| `POST /api/auth/register` · `login` · `logout`                          | Session lifecycle                                      |
| `POST /api/auth/forgot-password` · `reset-password` · `change-password` | Token-based recovery                                   |
| `PUT /api/user/profile` · `privacy`                                     | Member self-service                                    |
| `POST\|DELETE /api/resources/complete`                                  | Module progress                                        |
| `POST /api/events/[id]/register`                                        | Registration / ticket purchase                         |
| `POST /api/payments/confirm`                                            | Settle a transaction                                   |
| `POST /api/opportunities/[slug]/apply`                                  | Applications                                           |
| `POST\|DELETE /api/chapters/[slug]/join`                                | Chapter membership                                     |
| `POST /api/forms`                                                       | Contact, membership, partnership and chapter enquiries |
| `/api/admin/{events,opportunities,sponsors,posts,members,leads}`        | Full CRUD, admin-only                                  |

---

## Security

The rebuild closed a critical hole and hardened the rest.

**Fixed - unauthenticated account takeover.** The original `/api/auth/reset-password` accepted `{email, newPassword}` and rewrote the password for _any_ account, with no token and no verification. It now requires a single-use, one-hour token delivered by email, of which only the SHA-256 is stored.

Also in place:

- **Sessions** signed with `jose` (HS256, 7-day expiry, `httpOnly` + `sameSite=lax`). Middleware verifies the _signature_ on the Edge runtime rather than merely checking a cookie exists, and clears bad cookies to avoid redirect loops.
- **`JWT_SECRET` is mandatory in production** and must be ≥32 characters. Validation is lazy so CI builds don't need the production key.
- **Every input** validated with zod at the route boundary. Internal errors never leak in production.
- **Rate limiting** on auth (8/10min), registration (5/hr), password reset (4/hr) and forms (6/10min).
- **No user enumeration** - login compares against a dummy hash when the account is missing so timing matches; forgot-password returns an identical response either way.
- **Open-redirect protection** on `?redirect=` after sign-in (same-origin paths only).
- **bcrypt cost 12**; password changes require the current password.
- **Headers**: HSTS, CSP, `X-Frame-Options: DENY`, `nosniff`, strict referrer policy, `no-store` on all API responses.
- **Honeypot** on public forms, accepted silently so bots don't learn they were caught.
- **Privacy is member-controlled** - seven independent switches govern directory visibility and each contact field.

---

## Configuration

Every integration degrades gracefully when unset - the app is fully usable with only `DATABASE_URL` and `JWT_SECRET`.

| Variable              | Required      | Behaviour when unset                                      |
| :-------------------- | :------------ | :-------------------------------------------------------- |
| `DATABASE_URL`        | yes           | -                                                         |
| `JWT_SECRET`          | in production | Dev fallback key                                          |
| `NEXT_PUBLIC_APP_URL` | recommended   | Defaults to `http://localhost:3000`                       |
| `RESEND_API_KEY`      | no            | Email prints to the server console, including reset links |
| `HUBSPOT_API_KEY`     | no            | Leads stored locally, marked `SKIPPED`                    |
| `PAYMENT_PROVIDER`    | no            | Built-in gateway at `/checkout/[txn]`                     |

### Payments

`MODULAR_GATEWAY` (the default) is a real, working in-app checkout: registering for a paid ticket creates a `PENDING` payment and holds the place, and `/api/payments/confirm` settles it. It is clearly labelled as a development gateway in the UI and moves no money.

To go live, implement `createCheckoutSession` in `src/lib/payment.ts` to return a Stripe-hosted URL and point the webhook at the same confirm logic. No call sites change. Setting `PAYMENT_PROVIDER=STRIPE` before doing so throws deliberately rather than silently taking no money.

---

## Scripts

| Command             |                                                                                                                                  |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`       | Development server                                                                                                               |
| `npm run build`     | Production build                                                                                                                 |
| `npm start`         | Serve the build                                                                                                                  |
| `npm run typecheck` | `tsc --noEmit`                                                                                                                   |
| `npm run db:push`   | Sync schema                                                                                                                      |
| `npm run db:seed`   | Seed demo data                                                                                                                   |
| `npm run db:reset`  | Wipe, sync, reseed                                                                                                               |
| `npm run db:clean`  | **Empty the database for launch** - deletes every seeded row, keeps the schema. `-- --keep-admin` leaves admin accounts in place |
| `npm run format`    | Prettier over `src/` and `prisma/`                                                                                               |

### Going live with real content

The seed exists to exercise the product, not to ship. Run `npm run db:clean`, then add the real membership, events, chapters and articles through `/admin`. Every page has a first-class empty state - the site is fully browsable with zero rows, and each empty state names what belongs there and links to where it is added. That path is covered by the smoke test, not assumed.

## Deployment

```bash
docker build -t bsa .
docker run -p 3000:3000 \
  -e JWT_SECRET="$(openssl rand -base64 48)" \
  -e NEXT_PUBLIC_APP_URL="https://your-domain" \
  -v bsa-data:/app/data \
  bsa
```

The image sets `DOCKER_BUILD=1`, which switches `next.config.mjs` to Next's `standalone` output, and runs `prisma db push` on boot against the mounted volume. (`next start` is incompatible with standalone output, which is why it is build-gated rather than always on.)

For anything beyond a single node, switch `prisma/schema.prisma` to `postgresql` and move the rate limiter in `src/lib/rate-limit.ts` to Redis - the call sites are unchanged.
