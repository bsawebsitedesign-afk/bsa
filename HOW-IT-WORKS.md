# BSA - Complete Guide

**How the Business Security Alliance platform works: every feature, every page, every function, and how people actually use it.**

---

## Table of contents

1. [What this is](#1-what-this-is)
2. [Getting it running](#2-getting-it-running)
3. [The three kinds of user](#3-the-three-kinds-of-user)
4. [User journeys, step by step](#4-user-journeys-step-by-step)
5. [Every page explained](#5-every-page-explained)
6. [Every feature explained](#6-every-feature-explained)
7. [The member dashboard](#7-the-member-dashboard)
8. [The admin console](#8-the-admin-console)
9. [Accounts, sessions and passwords](#9-accounts-sessions-and-passwords)
10. [Privacy: who sees what](#10-privacy-who-sees-what)
11. [Events, tickets and payment](#11-events-tickets-and-payment)
12. [Lead capture and CRM](#12-lead-capture-and-crm)
13. [Email](#13-email)
14. [Every API endpoint](#14-every-api-endpoint)
15. [The database](#15-the-database)
16. [The design system](#16-the-design-system)
17. [Security](#17-security)
18. [Configuration](#18-configuration)
19. [Deployment](#19-deployment)
20. [What still needs the client](#20-what-still-needs-the-client)
21. [Common tasks](#21-common-tasks)
22. [Troubleshooting](#22-troubleshooting)

---

## 1. What this is

BSA is a **professional association and networking platform for the security industry**. It is not a company that sells security products or services - it is the industry body that connects the people who work in it.

### Who it serves

- Security professionals (in-house roles)
- Security leaders (heads of function, directors, CISOs)
- Consultants and independent practices
- Vendors and service providers
- Industry organisations and research bodies
- Sponsors and partner companies

### The five pillars

| Pillar                 | What it means                               | Where it lives                         |
| :--------------------- | :------------------------------------------ | :------------------------------------- |
| **CONNECT**            | Help security professionals find each other | Member directory, profiles, chapters   |
| **GROW**               | Professional and business growth            | Opportunities board, applications      |
| **LEARN**              | Industry content and expertise              | Resources, insights, events            |
| **PARTICIPATE**        | Events, chapters, committees                | Events + ticketing, chapter membership |
| **BUILD THE INDUSTRY** | A stronger, better-connected ecosystem      | Partners, research, lead generation    |

### What makes it different from a normal association website

A traditional association site is a brochure with an events page. This is a **membership platform**.

```
Traditional association          BSA
─────────────────────           ───
Website                          Website
   ↓                                ↓
Information                      Membership
   ↓                                ↓
Events listing                   Professional profile
   ↓                                ↓
Contact form                     Member directory  ← the differentiator
                                    ↓
                                 Networking
                                    ↓
                                 Events + chapters
                                    ↓
                                 Business opportunities
                                    ↓
                                 Industry community
```

The member directory is the centrepiece. Everything else supports it.

### Two goals running at the same time

**For a member** - "What does BSA do for me?"

```
Join → Create profile → Discover people → Attend events → Build network → Grow
```

**For BSA** - "What is the website doing for the organisation?"

```
Attract visitors → Generate leads → Convert members → Promote events → Attract sponsors
```

Every public form on the site feeds the lead inbox and the CRM adapter. That is deliberate - the site is a growth instrument, not just a publication.

---

## 2. Getting it running

### First time

```bash
cd /Users/ansh/Desktop/BSA
npm install
cp .env.example .env        # then open .env and set JWT_SECRET
npm run db:reset            # creates the database and fills it with demo data
npm run dev
```

Open **http://localhost:3000**

### Demo accounts

| Role   | Email           | Password       |
| :----- | :-------------- | :------------- |
| Admin  | `admin@bsa.dev` | `Password123!` |
| Member | `demo@bsa.dev`  | `Password123!` |

Both are pre-filled on the sign-in page with click-to-fill buttons.

### Every command

| Command             | What it does                                           |
| :------------------ | :----------------------------------------------------- |
| `npm run dev`       | Development server with hot reload                     |
| `npm run build`     | Production build                                       |
| `npm start`         | Serve the production build                             |
| `npm run typecheck` | TypeScript check, no output files                      |
| `npm run lint`      | Next.js linting                                        |
| `npm run db:push`   | Apply schema changes to the database                   |
| `npm run db:seed`   | Fill the database with demo data                       |
| `npm run db:reset`  | Wipe, re-apply schema, re-seed (**destroys all data**) |

### The tech

| Layer      | Choice                                                   |
| :--------- | :------------------------------------------------------- |
| Framework  | Next.js 14 (App Router)                                  |
| Language   | TypeScript 5                                             |
| Styling    | Tailwind CSS 3                                           |
| Database   | Prisma ORM + SQLite (Postgres-ready)                     |
| Auth       | bcrypt + `jose` JWT in an HTTP-only cookie               |
| Animation  | Framer Motion + CSS keyframes + a hand-written 2D canvas |
| Validation | Zod on every API route                                   |
| CRM        | HubSpot adapter                                          |
| Email      | Resend adapter with a console fallback                   |

---

## 3. The three kinds of user

### Visitor (not signed in)

Can browse almost everything: the directory, member profiles, events, opportunities, resources, chapters, insights and partners. Can register for free events and apply to opportunities without an account. Can send enquiries.

**Cannot:** appear in the directory, track resource progress, join a chapter, or see the dashboard.

### Member (signed in)

Everything a visitor can do, plus a profile in the directory, chapter membership, resource progress tracking, registration history, and control over their own privacy.

### Admin (signed in, `role = ADMIN`)

Everything a member can do, plus the admin console: create and edit events, opportunities, partners and insight articles; promote or remove members; and work the lead inbox.

---

## 4. User journeys, step by step

### Journey A - A visitor becomes a member

```
1. Lands on /  (search, referral, event promotion)
2. Reads what BSA is; sees live member and chapter counts
3. Clicks "Join BSA" → /register
4. Fills in: name, email, password, organisation, job title,
   member type, optional @handle
5. Account created → signed in automatically → /dashboard
6. Welcome email sent
7. Prompted to complete profile (completeness meter shows what is missing)
8. Adds bio, specialties, skills, LinkedIn, years of experience
9. Now discoverable in the member directory
```

**What happens technically:** `POST /api/auth/register` validates with Zod, checks the email and handle are free, derives a unique `@handle` if none supplied, hashes the password with bcrypt (cost 12), creates `User` + `MemberProfile` + `MemberPrivacy` in one transaction, sets a 7-day signed session cookie, and fires the welcome email without blocking the response.

### Journey B - A member finds someone to talk to

```
1. /directory
2. Types "third-party risk" into search
   → matches name, handle, org, job title, field, location,
     specialties and skills simultaneously
3. Filters: member type = CONSULTANT, "available to mentor" = on
4. Result count updates live
5. Opens a profile → /members/tbello
6. Sees job title, org, specialties, chapters, years of experience
7. Contacts them via whichever links that member chose to publish
```

**Key point:** the directory only ever contains members who have both `isPublic` and `searchableInDirectory` switched on. Every contact field has its own switch.

### Journey C - A member attends an event

```
1. /events → filters by category and format
2. Opens an event → sees agenda timeline, speakers, venue,
   CPD hours, capacity, and partner logos
3. Picks a ticket
     Free event  → single "Member registration" tier
     Paid event  → "Member rate" and "Non-member rate"
4. Enters name, email, organisation (pre-filled when signed in)
5a. FREE  → confirmed immediately, reference code shown,
            confirmation email sent
5b. PAID  → redirected to /checkout/[transactionId]
            → pays → registration confirmed, code issued
6. Registration appears in the dashboard with its reference code
```

**Protections:** capacity is checked before booking, tickets cannot oversell, one registration per email per event, and completed events cannot be booked.

### Journey D - A member pursues an opportunity

```
1. /opportunities → filters by type
   (Senior role · Partnership · Tender · Speaking call · Board appointment)
2. Opens a listing → full description, requirements checklist,
   compensation, deadline countdown
3. Clicks Apply → modal form
4. Submits name, email, organisation, profile URL, note
5. Application stored, and mirrored into the admin lead inbox
```

Duplicate applications from the same email are rejected with a clear message.

### Journey E - A member joins a regional chapter

```
1. /chapters → chapters grouped by region
2. Opens one → sees roster, chair, meeting cadence, description
3. Clicks Join → immediate membership
4. Appears on the chapter roster; chapter shows on their profile
```

### Journey F - A member works through a resource

```
1. /resources → sees four guides with level and reading time
2. Opens one → module list, progress card
3. Expands a module → reads the content
4. Marks it complete → progress bar advances
5. Can un-mark it if they marked it by mistake
6. Finishing every module shows a completion panel
```

Progress is a record of study. There are **no points, levels or badges** - this is a professional body, not a game.

### Journey G - An organisation wants to partner

```
1. /sponsors → sees existing partners by tier and what funding covers
2. Clicks "Become a backer" → modal enquiry form
3. Submits → lands in the admin lead inbox as SPONSOR_INQUIRY
4. Also pushed to HubSpot if a key is configured
```

### Journey H - Admin runs the association

```
1. Signs in → /admin
2. Overview: every count, plus a "needs attention" panel
   (unhandled leads, events near capacity, deadlines closing)
3. Creates an event → sets category, date, capacity, CPD hours,
   ticket name and price
4. Posts an opportunity
5. Works the lead inbox: reads, replies by email, marks handled
6. Promotes a member to admin if needed
```

---

## 5. Every page explained

### Public pages

| Route                       | Purpose                             | Key behaviour                                                                                                                                            |
| :-------------------------- | :---------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                         | Home                                | Live counts from the database, directory preview, upcoming events, opportunities, resources, chapters, partners, featured insight. Animated canvas hero. |
| `/directory`                | **Member directory - the flagship** | Live search across 8 fields, filters for member type / discipline / region, availability toggles, result count, sorting                                  |
| `/members/[handle]`         | Public member profile               | Everything the member chose to publish; 404s if the profile is private                                                                                   |
| `/events`                   | Events calendar                     | Upcoming and live events, past events in a de-emphasised archive, category and format filters                                                            |
| `/events/[slug]`            | Event detail                        | Agenda timeline, speakers, partners, venue, capacity bar, CPD hours, ticket selection                                                                    |
| `/checkout/[transactionId]` | Payment                             | Order summary and settlement. Clearly labelled as a development gateway                                                                                  |
| `/opportunities`            | Opportunities board                 | Filter by type, format and text; deadline warnings inside 14 days                                                                                        |
| `/opportunities/[slug]`     | Opportunity detail                  | Full description, requirements checklist, apply modal                                                                                                    |
| `/resources`                | Professional development            | Four guides, level, reading time, per-member progress                                                                                                    |
| `/resources/[slug]`         | Resource detail                     | Module accordion, completion tracking, sticky progress card                                                                                              |
| `/chapters`                 | Regional chapters                   | Grouped by region, member counts, meeting cadence, "start a chapter" route                                                                               |
| `/chapters/[slug]`          | Chapter detail                      | Roster with chair/committee/member roles, contact links, join button                                                                                     |
| `/blog`                     | Insights                            | Featured article, category and tag filters, search                                                                                                       |
| `/blog/[slug]`              | Article                             | Full article with a small markdown-ish renderer, author card, related posts                                                                              |
| `/sponsors`                 | Partners                            | Tiered by Diamond / Gold / Silver / Community, what funding covers, enquiry modal                                                                        |
| `/about`                    | About the alliance                  | Five pillars, live numbers, funding model, **placeholder blocks for unconfirmed facts**                                                                  |
| `/membership`               | How membership works                | Provisional categories, what members get, FAQ, enquiry route                                                                                             |
| `/contact`                  | Contact                             | Reason selector mapping to lead types, `?type=` deep links, alternative routes                                                                           |

### Auth pages

| Route                     | Purpose                                                                    |
| :------------------------ | :------------------------------------------------------------------------- |
| `/login`                  | Sign in, with demo-account quick fill and expired-session notice           |
| `/register`               | Create an account; live password validation and `@handle` preview          |
| `/forgot-password`        | Request a reset link; identical response whether or not the account exists |
| `/reset-password?token=…` | Set a new password using a single-use token                                |

### Private pages

| Route        | Purpose                                    |
| :----------- | :----------------------------------------- |
| `/dashboard` | Member portal - five tabs                  |
| `/admin`     | Admin console - nine sections, admins only |

### System routes

| Route              | Purpose                                                                                                         |
| :----------------- | :-------------------------------------------------------------------------------------------------------------- |
| `/sitemap.xml`     | Generated from the database - every published event, opportunity, resource, chapter, article and public profile |
| `/robots.txt`      | Allows crawling; blocks `/admin`, `/dashboard`, `/api`, `/checkout`                                             |
| `/opengraph-image` | Social sharing card, generated at build time                                                                    |
| `/icon.svg`        | Favicon                                                                                                         |
| `not-found`        | Custom 404 with real onward links                                                                               |
| `error`            | Crash screen; never shows the raw error in production                                                           |
| `loading`          | Skeleton matching the page shape, not a spinner                                                                 |

---

## 6. Every feature explained

### Member directory

The core feature. Search runs client-side over a server-filtered set, so it is instant.

**Searches across:** full name · handle · organisation · job title · discipline · location · specialties · skills

**Filters:** member type · discipline · region (derived from the location field) · open to opportunities · available to mentor · available to speak

**Only includes** members with `isPublic = true` **and** `searchableInDirectory = true`.

### Member profiles

Each member has a public page at `/members/their-handle` showing: name, handle, job title, organisation, headline, discipline, member type, location, years of experience, bio, specialties, skills, chapter memberships with role, resources completed, and events attended.

Contact details appear **only** where the member has switched them on.

### Regional chapters

Chapters are geographic peer groups, each with a region, city, country, founding year, meeting cadence, description and roster.

Roles: **CHAIR** · **COMMITTEE** · **MEMBER** - visually distinguished on the roster.

Members join or leave with one click. Anyone wanting a new chapter is routed to `/contact?type=chapter`, which pre-selects the right enquiry type.

### Events

Six categories: **Conference · Workshop · Roundtable · Webinar · Networking · Summit**

Three formats: **In person · Virtual · Hybrid**

Each event carries an agenda timeline, speakers, partner logos, venue, capacity, and **CPD hours** (continuing professional development credit) - a genuine association benefit.

Free events have a single registration tier. Paid events have a **member rate** and a **non-member rate**, which makes the value of membership concrete.

### Opportunities board

Five types, deliberately business-focused rather than a job board:

| Type                  | Example                      |
| :-------------------- | :--------------------------- |
| **Senior role**       | Group Head of Security       |
| **Partnership**       | Consulting partner network   |
| **Tender (RFP)**      | Security systems refresh ITT |
| **Speaking call**     | Conference call for speakers |
| **Board appointment** | Non-executive director       |

Applications capture name, email, organisation, profile URL and a note; duplicates by email are blocked; every application mirrors into the lead inbox.

### Resources

Four in-depth written guides, broken into modules:

1. **Building a Security Function From Scratch** - the first ninety days as the first security hire
2. **Converging Physical and Cyber Security** - why it fails and the three operating models
3. **Third-Party and Supply Chain Security** - segmentation, assessment, contracting, monitoring
4. **Communicating Security to the Board** - reporting, metrics, and asking for money

Levels: **Foundation · Practitioner · Executive**

Signed-in members can mark modules complete and un-complete them. Signed-out visitors can read everything.

### Insights

Long-form articles with categories, tags, author cards and reading time. Content is stored as plain text and rendered by a small built-in parser handling paragraphs, `**bold**`, `*emphasis*`, `` `code` `` and `- ` bullets - no markdown dependency.

### Partners

Four tiers - **Diamond · Gold · Silver · Community** - with escalating visual treatment. Each partner has a description, a perk they provide to members, and an optional hiring flag. The page states plainly what partner funding pays for.

---

## 7. The member dashboard

`/dashboard` - five tabs, real tab semantics (arrow-key navigable).

### Overview

- Member summary: avatar, name, handle, job title, organisation, member type, location, chapters
- **Profile completeness meter** naming exactly which fields are still empty and explaining why it matters (findability in the directory)
- Stat tiles: events registered · CPD hours booked · resources in progress · chapters joined · applications submitted
- Upcoming registrations as reference stubs, with a resume-payment link where a booking is unpaid
- Suggested next actions: a resource not started, a chapter to join, an upcoming event
- Directory visibility status at a glance

### Profile

Full edit form: name, handle, headline, organisation, job title, discipline, member type, location, bio, years of experience, phone, avatar URL, LinkedIn, website, specialties, skills, and three availability switches.

Specialties and skills use a **tag input** - type and press Enter or comma to add, click to remove. Capped at 12 and 16.

Handle collisions are caught and reported inline.

### Privacy

Seven independent switches, each with an honest description of exactly what it exposes:

| Switch                  | Controls                               |
| :---------------------- | :------------------------------------- |
| `isPublic`              | Whether the profile page exists at all |
| `searchableInDirectory` | Whether you appear in directory search |
| `showOrg`               | Organisation and job title             |
| `showEmail`             | Email address                          |
| `showPhone`             | Phone number                           |
| `showLinkedIn`          | LinkedIn link                          |
| `showWebsite`           | Website link                           |

### Security

Change password - requires the current password. Sign out.

### Activity

Full history: event registrations, resource modules completed grouped by resource, applications with status, and chapter memberships with role and join date.

---

## 8. The admin console

`/admin` - admins only. A member who reaches it is redirected to their dashboard.

### Nine sections

| Section           | What you can do                                                                                                                |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| **Overview**      | Every count; "needs attention" panel for unhandled leads, events over 90% capacity and deadlines inside 7 days; recent signups |
| **Members**       | Search, promote to admin, demote, delete                                                                                       |
| **Events**        | Create, edit, delete - with tickets                                                                                            |
| **Opportunities** | Create, edit, delete                                                                                                           |
| **Applications**  | Read-only list of who applied to what                                                                                          |
| **Partners**      | Create, edit, delete sponsors                                                                                                  |
| **Insights**      | Create, edit, delete articles                                                                                                  |
| **Resources**     | Read-only list (resource content is managed in the seed)                                                                       |
| **Leads**         | Read, filter, reply by email, mark handled, delete                                                                             |

### Guard rails

- The last remaining admin **cannot** be demoted
- An admin **cannot** delete their own account here
- Deletions require a confirmation step inside the modal - never a browser `confirm()`

### Creating an event

Title · category · description · full details · location · format · venue · date and time · capacity · hero image · CPD hours · status · ticket name · ticket price.

Setting a price above zero automatically marks the event paid and creates the ticket tier.

---

## 9. Accounts, sessions and passwords

### Registration

Requires name, email, password, organisation. Optionally job title, member type, discipline, location and a preferred handle.

**Password rules:** at least 8 characters, containing at least one letter and one number. Validated live in the browser and again on the server.

**Handles** are unique, lowercase, 3-20 characters, letters/numbers/underscores. If you do not choose one, it is derived from your name and de-duplicated automatically.

### Sessions

A signed JWT in an HTTP-only cookie named `bsa_session`, valid for 7 days, `sameSite=lax`, and `secure` in production.

Middleware **verifies the signature** on every protected request - it does not merely check that a cookie exists. A tampered or expired cookie is deleted and the user is redirected to sign in with an explanatory notice.

### Password reset

```
1. User submits their email at /forgot-password
2. Server responds identically whether or not the account exists
3. If it exists: any older tokens are retired, a new random token
   is generated, and only its SHA-256 hash is stored
4. The link is emailed (printed to the server console in development)
5. Link is valid for 1 hour and works exactly once
6. Using it retires every other outstanding token for that account
```

### Changing a password while signed in

Requires the current password. This stops a hijacked session locking the real owner out.

---

## 10. Privacy: who sees what

Privacy is member-controlled and defaults to sensible values.

| Field                   | Default | Effect when off               |
| :---------------------- | :------ | :---------------------------- |
| Profile is public       | On      | Profile page 404s to everyone |
| Searchable in directory | On      | Absent from directory results |
| Show organisation       | On      | Org and job title hidden      |
| Show email              | **Off** | Email hidden                  |
| Show phone              | **Off** | Phone hidden                  |
| Show LinkedIn           | On      | Link hidden                   |
| Show website            | On      | Link hidden                   |

These are enforced **server-side in the query**, not hidden in the UI - a private member's data never leaves the server.

---

## 11. Events, tickets and payment

### Free registration

```
Pick ticket → enter details → POST /api/events/[id]/register
  → capacity checked
  → ticket availability checked
  → duplicate email checked
  → registration CONFIRMED, ticket count incremented
  → reference code generated (BSA-XXX-XXX)
  → confirmation email sent
  → lead recorded
```

### Paid registration

```
Pick ticket → enter details → POST /api/events/[id]/register
  → place held as PENDING_PAYMENT
  → Payment row created with status PENDING
  → redirect to /checkout/[transactionId]
      → Pay    → POST /api/payments/confirm {outcome: SUCCESS}
                 → payment COMPLETED, registration CONFIRMED,
                   ticket count incremented, email sent
      → Cancel → payment FAILED, registration CANCELLED
```

Confirming twice is safe - the endpoint is idempotent and returns the existing code.

### Reference codes

Format `BSA-XXX-XXX`, generated from cryptographically random bytes using an alphabet with ambiguous characters (`0`, `O`, `1`, `I`, `L`) removed, so codes survive being read aloud at a registration desk.

### The payment gateway

The default `MODULAR_GATEWAY` is a **real, working in-app checkout** that moves no money. It is clearly labelled as a development gateway in the UI.

To take real payments: implement `createCheckoutSession` in `src/lib/payment.ts` to return a Stripe-hosted URL, and point the Stripe webhook at the same confirm logic. **No other code changes.** Setting `PAYMENT_PROVIDER=STRIPE` without doing that work throws deliberately rather than silently failing to charge.

---

## 12. Lead capture and CRM

Every public form feeds one pipeline:

```
Form submitted
   ↓
Zod validation + rate limiting + honeypot check
   ↓
HubSpot adapter  →  SYNCED (key present) | SKIPPED (no key) | FAILED
   ↓
FormSubmission row written locally - always, regardless of CRM outcome
   ↓
Visible in Admin → Leads
```

### Lead types

| Type                  | Source                                           |
| :-------------------- | :----------------------------------------------- |
| `CONTACT`             | General contact form                             |
| `MEMBERSHIP_INQUIRY`  | Membership questions                             |
| `SPONSOR_INQUIRY`     | Partner prospectus requests                      |
| `CHAPTER_REQUEST`     | Requests to start a chapter                      |
| `PARTNERSHIP_INQUIRY` | Collaboration approaches                         |
| `EVENT_LEAD`          | Event registrations and opportunity applications |

The local record is written **even if HubSpot fails**, so a CRM outage never loses a lead.

### The honeypot

Every public form has a hidden field named `website`. Real users never fill it in; bots usually do. A submission containing it returns a normal success response and is silently discarded - the bot never learns it was caught.

---

## 13. Email

| Email                     | Trigger                              |
| :------------------------ | :----------------------------------- |
| Welcome                   | New registration                     |
| Password reset            | Reset requested                      |
| Registration confirmation | Free registration or settled payment |

**Without `RESEND_API_KEY`,** emails are printed in full to the server console - including working password-reset links. This makes every flow testable locally with no external service.

**With the key,** they go out through Resend. All templates are styled to match the site.

---

## 14. Every API endpoint

Every response is either `{ok: true, …}` or `{ok: false, error: "…", fields?: {…}}`.

### Authentication

| Method | Endpoint                    | Body                                                                           | Returns                  |
| :----- | :-------------------------- | :----------------------------------------------------------------------------- | :----------------------- |
| POST   | `/api/auth/register`        | name, email, password, org, jobTitle?, memberType?, field?, location?, handle? | `{role, handle}`         |
| POST   | `/api/auth/login`           | email, password                                                                | `{role}`                 |
| POST   | `/api/auth/logout`          | -                                                                              | `{}`                     |
| POST   | `/api/auth/forgot-password` | email                                                                          | `{message}` - always 200 |
| POST   | `/api/auth/reset-password`  | token, password                                                                | `{message}`              |
| POST   | `/api/auth/change-password` | currentPassword, newPassword                                                   | `{message}`              |

### Member

| Method | Endpoint            | Returns     |
| :----- | :------------------ | :---------- |
| PUT    | `/api/user/profile` | `{profile}` |
| PUT    | `/api/user/privacy` | `{privacy}` |

### Platform actions

| Method | Endpoint                            | Returns                                                                                            |
| :----- | :---------------------------------- | :------------------------------------------------------------------------------------------------- |
| POST   | `/api/resources/complete`           | `{alreadyComplete, doneModules, totalModules, resourceComplete}`                                   |
| DELETE | `/api/resources/complete?moduleId=` | `{message}`                                                                                        |
| POST   | `/api/chapters/[slug]/join`         | `{alreadyJoined, message}`                                                                         |
| DELETE | `/api/chapters/[slug]/join`         | `{message}`                                                                                        |
| POST   | `/api/events/[id]/register`         | free: `{paid:false, registrationCode, cpdHours}` · paid: `{paid:true, checkoutUrl, transactionId}` |
| POST   | `/api/payments/confirm`             | `{settled, registrationCode, eventId}`                                                             |
| POST   | `/api/opportunities/[slug]/apply`   | `{applicationId, message}`                                                                         |
| POST   | `/api/forms`                        | `{submissionId, message}`                                                                          |

> Note: the event registration route is keyed by event **id**, while event pages are routed by **slug**. Pages look the event up by slug and pass its id to the client.

### Admin (all require `role = ADMIN`)

| Endpoint                   | Methods                                 |
| :------------------------- | :-------------------------------------- |
| `/api/admin/events`        | POST · PATCH · DELETE `?id=`            |
| `/api/admin/opportunities` | POST · PATCH · DELETE `?id=`            |
| `/api/admin/sponsors`      | POST · PATCH · DELETE `?id=`            |
| `/api/admin/posts`         | POST · PATCH · DELETE `?id=`            |
| `/api/admin/members`       | PATCH `{userId, role}` · DELETE `?id=`  |
| `/api/admin/leads`         | PATCH `{id, isHandled}` · DELETE `?id=` |

### Error codes

| Code | Meaning                                                               |
| :--- | :-------------------------------------------------------------------- |
| 400  | Malformed request                                                     |
| 401  | Not signed in                                                         |
| 403  | Signed in but not permitted                                           |
| 404  | Not found                                                             |
| 409  | Conflict - already registered, already applied, sold out, at capacity |
| 422  | Validation failed - check the `fields` object                         |
| 429  | Rate limited - the message says how long to wait                      |
| 500  | Server error - details logged, never returned in production           |

---

## 15. The database

### Models

| Model                | Holds                                        |
| :------------------- | :------------------------------------------- |
| `User`               | Login credentials and role                   |
| `MemberProfile`      | Everything shown on a profile                |
| `MemberPrivacy`      | The seven visibility switches                |
| `PasswordResetToken` | Hashed, single-use, one-hour reset tokens    |
| `Chapter`            | Regional chapters                            |
| `ChapterMembership`  | Who belongs to which chapter, and their role |
| `Resource`           | A professional development guide             |
| `ResourceModule`     | One module within a guide                    |
| `ResourceProgress`   | Which member completed which module          |
| `Opportunity`        | A listing on the board                       |
| `Application`        | Someone applying to a listing                |
| `Event`              | An event, with agenda and CPD hours          |
| `EventSpeaker`       | Speakers on an event                         |
| `EventTicket`        | A ticket tier                                |
| `EventRegistration`  | A booked place                               |
| `Payment`            | A payment attempt                            |
| `Sponsor`            | A partner organisation                       |
| `EventSponsor`       | Which partners sponsor which event           |
| `BlogPost`           | An insight article                           |
| `FormSubmission`     | The lead inbox                               |

### Enumerated values

Stored as strings because SQLite has no enum type. Validated by Zod at the API boundary.

| Field                      | Values                                                                                 |
| :------------------------- | :------------------------------------------------------------------------------------- |
| `User.role`                | `MEMBER` · `ADMIN`                                                                     |
| `MemberProfile.memberType` | `PROFESSIONAL` · `LEADER` · `CONSULTANT` · `VENDOR` · `ORGANISATION` - **provisional** |
| `Event.category`           | `CONFERENCE` · `WORKSHOP` · `ROUNDTABLE` · `WEBINAR` · `NETWORKING` · `SUMMIT`         |
| `Event.locationType`       | `IN_PERSON` · `VIRTUAL` · `HYBRID`                                                     |
| `Event.status`             | `UPCOMING` · `LIVE` · `COMPLETED` · `DRAFT`                                            |
| `Opportunity.type`         | `ROLE` · `PARTNERSHIP` · `RFP` · `SPEAKING` · `BOARD_POSITION`                         |
| `Resource.level`           | `FOUNDATION` · `PRACTITIONER` · `EXECUTIVE`                                            |
| `ChapterMembership.role`   | `MEMBER` · `COMMITTEE` · `CHAIR`                                                       |
| `Sponsor.tier`             | `DIAMOND` · `GOLD` · `SILVER` · `COMMUNITY`                                            |
| `Payment.status`           | `PENDING` · `COMPLETED` · `FAILED` · `REFUNDED`                                        |

### JSON columns

`specialties`, `skills`, `requirements`, `tags` and `agendaJson` are stored as JSON strings. Always read them through `parseList()` or `parseJson()` from `src/lib/utils.ts` - never `JSON.parse` directly, because those helpers fail safe.

### What is in the seed

|               |                                                                            |
| :------------ | :------------------------------------------------------------------------- |
| Members       | 24 - 14 professionals, 5 leaders, 2 consultants, 2 vendors, 1 organisation |
| Chapters      | 8 regional                                                                 |
| Resources     | 4 guides, 17 modules                                                       |
| Events        | 7 across all six categories                                                |
| Registrations | 44                                                                         |
| Opportunities | 8 across all five types                                                    |
| Partners      | 8 across four tiers                                                        |
| Articles      | 6                                                                          |
| Leads         | 5                                                                          |

> **All of it is fictional.** No person, organisation or event is real.

---

## 16. The design system

The look is **neo-brutalist**: warm paper, thick black borders, hard un-blurred shadows, and loud accent colours. It is deliberately not the dark-navy-and-cyan glassmorphism that most generated sites default to.

### Colours

| Role             | Value                                                                                          |
| :--------------- | :--------------------------------------------------------------------------------------------- |
| Page background  | Bone `#F4F1EA`                                                                                 |
| Card background  | Paper `#FBF9F4`                                                                                |
| Borders and text | Ink `#0B0B0B`                                                                                  |
| Muted text       | `#4A4740`                                                                                      |
| Accents          | Lime `#C6F432` · Magenta `#FF3D8B` · Violet `#6C2BD9` · Tangerine `#FF7A1A` · Cobalt `#2F4BFF` |

### Rules

- Borders are 2px (3px for major panels), always solid ink
- Shadows are **hard offsets** (`3px 3px 0`) - never blurred
- **Zero border radius** everywhere
- Labels, buttons and metadata are uppercase mono with wide letter-spacing

### Type

| Use             | Font          |
| :-------------- | :------------ |
| Headings        | Archivo Black |
| Body            | Space Grotesk |
| Labels and data | Space Mono    |

### Animation

Hover lifts, staggered scroll reveals, marquee tickers, count-ups, blinking indicators, and an interactive canvas hero (a node graph with packets travelling its edges that reacts to the cursor).

**All motion is disabled automatically** under `prefers-reduced-motion`.

### Components

Located in `src/components/ui/`:

`Button` · `Card` / `CardBar` / `CardBody` · `Chip` / `LiveDot` · `Input` / `Textarea` / `Select` / `Toggle` / `Checkbox` / `Label` / `FieldError` · `Marquee` · `Reveal` / `RevealGroup` / `RevealItem` · `Counter` · `Avatar` · `ProgressMeter` · `SectionHead` · `EmptyState` · `Sticker` · `Stat` · `Modal` · `useToast`

---

## 17. Security

### The critical fix

The original `/api/auth/reset-password` accepted `{email, newPassword}` and changed the password on **any** account - no token, no verification, no authentication. Anyone who knew an email address could take over that account, including the admin.

It now requires a single-use, one-hour token delivered by email, of which only the SHA-256 hash is stored. A database leak cannot be replayed into account takeover.

### Everything else in place

| Protection         | Detail                                                                                                                                       |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| Password hashing   | bcrypt, cost 12                                                                                                                              |
| Sessions           | `jose` HS256, HTTP-only, `sameSite=lax`, `secure` in production, 7-day expiry                                                                |
| Middleware         | Verifies the JWT **signature** on the Edge runtime; clears bad cookies                                                                       |
| Secret enforcement | `JWT_SECRET` mandatory in production, minimum 32 characters; server refuses to boot without it                                               |
| Input validation   | Zod on every route; unknown fields stripped                                                                                                  |
| Rate limiting      | Login 8/10min · registration 5/hr · password reset 4/hr · forms 6/10min · writes 40/5min                                                     |
| User enumeration   | Login compares against a dummy hash when the account is missing, so timing matches. Forgot-password returns an identical response either way |
| Open redirect      | `?redirect=` after sign-in accepts same-origin paths only                                                                                    |
| Privacy            | Enforced in the database query, not the UI                                                                                                   |
| Authorisation      | Admin routes check role server-side; the client never decides                                                                                |
| Honeypot           | Silent bot rejection on public forms                                                                                                         |
| Headers            | HSTS · CSP · `X-Frame-Options: DENY` · `nosniff` · strict referrer policy · `no-store` on all API responses                                  |
| Error handling     | Internal errors logged server-side, never returned in production                                                                             |

---

## 18. Configuration

Everything lives in `.env`. Copy `.env.example` to start.

| Variable              | Required          | Behaviour when unset                   |
| :-------------------- | :---------------- | :------------------------------------- |
| `DATABASE_URL`        | **Yes**           | -                                      |
| `JWT_SECRET`          | **In production** | Dev fallback key used locally          |
| `NEXT_PUBLIC_APP_URL` | Recommended       | Defaults to `http://localhost:3000`    |
| `RESEND_API_KEY`      | No                | Emails print to the server console     |
| `EMAIL_FROM`          | No                | Defaults to a placeholder sender       |
| `HUBSPOT_API_KEY`     | No                | Leads stored locally, marked `SKIPPED` |
| `HUBSPOT_PORTAL_ID`   | No                | -                                      |
| `PAYMENT_PROVIDER`    | No                | Built-in development gateway           |
| `STRIPE_SECRET_KEY`   | No                | -                                      |

Generate a production secret with:

```bash
openssl rand -base64 48
```

**Every integration degrades gracefully.** The application is fully usable with only `DATABASE_URL` and `JWT_SECRET`.

---

## 19. Deployment

### Docker

```bash
docker build -t bsa .

docker run -p 3000:3000 \
  -e JWT_SECRET="$(openssl rand -base64 48)" \
  -e NEXT_PUBLIC_APP_URL="https://your-domain.com" \
  -v bsa-data:/app/data \
  bsa
```

The image sets `DOCKER_BUILD=1`, which switches the build to Next's `standalone` output, and runs `prisma db push` on boot against the mounted volume.

### Moving to Postgres

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to `"postgresql"`
2. Point `DATABASE_URL` at your instance
3. Run `npm run db:push`

### Beyond one server

The rate limiter in `src/lib/rate-limit.ts` holds state in memory. For multiple instances, swap its `Map` for Redis - the call sites do not change.

### Pre-launch checklist

- [ ] Real `JWT_SECRET` set
- [ ] `NEXT_PUBLIC_APP_URL` set to the live domain
- [ ] Database moved to Postgres
- [ ] All demo data replaced with real content
- [ ] Placeholder blocks filled with client copy
- [ ] Membership model confirmed
- [ ] `HUBSPOT_API_KEY` added if CRM sync is wanted
- [ ] `RESEND_API_KEY` added so emails actually send
- [ ] Stripe implemented if charging for events
- [ ] Demo accounts deleted or their passwords changed

---

## 20. What still needs the client

The requirements did not include an official mission statement, vision statement, founding history or a confirmed membership model. **None of these were invented.**

| Item                          | Current state                                                  | Where                 |
| :---------------------------- | :------------------------------------------------------------- | :-------------------- |
| Mission / vision              | **Not written** - no invented wording anywhere in the codebase | -                     |
| Founding history              | Placeholder block requesting client copy                       | `/about`              |
| Office-holders and governance | Placeholder block                                              | `/about`              |
| Partnership tiers and pricing | Placeholder block                                              | `/about`, `/sponsors` |
| Membership tiers and cost     | Marked provisional                                             | `/membership`         |
| Member categories             | Five provisional values, flagged in schema, validation and UI  | Everywhere            |
| Members, partners, events     | Fictional demo data                                            | Database              |

Placeholder blocks render as a visible dashed panel reading **"Placeholder · client content required"**, so nothing unconfirmed can be mistaken for approved copy.

**When the membership model is confirmed,** change `MEMBER_TYPES` in `src/lib/validation.ts` - it is imported everywhere, so that one edit propagates across the whole site.

---

## 21. Common tasks

### Add an event

Sign in as admin → `/admin` → Events → **New event**. Fill in the details; a price above zero automatically makes it a paid event with a ticket tier.

### Post an opportunity

`/admin` → Opportunities → **New opportunity**. Requirements is a tag input - type and press Enter for each one.

### Work the lead inbox

`/admin` → Leads. Filter by type or handled state, click the email to reply, then mark it handled.

### Make someone an admin

`/admin` → Members → find them → **Promote**. The system prevents removing the last admin.

### Change the resources content

Resource text lives in `prisma/seed.ts` under `resourceData`. Edit it and run `npm run db:seed`. (There is no admin editor for resources - they are long-form content better managed in version control.)

### Replace all demo data

Edit the arrays in `prisma/seed.ts` - `members`, `chapterData`, `resourceData`, `sponsorData`, `eventData`, `opportunityData`, `postData` - then `npm run db:reset`.

### Change the colours

`tailwind.config.ts` under `theme.extend.colors`. The whole site uses those tokens, so changes propagate everywhere.

### Add a page

Create `src/app/your-page/page.tsx`. Add it to `PRIMARY` or `SECONDARY` in `src/components/navbar.tsx`, and to `STATIC_ROUTES` in `src/app/sitemap.ts`.

---

## 22. Troubleshooting

**"JWT_SECRET is missing or shorter than 32 characters"**
Set a real secret in `.env`. Generate one with `openssl rand -base64 48`.

**Database errors after changing the schema**
Run `npm run db:push`. If the change is destructive, `npm run db:reset` (this wipes everything).

**Password reset email never arrives**
Without `RESEND_API_KEY`, mail goes to the **server console**, not an inbox. Look at the terminal running `npm run dev` - the full reset link is printed there.

**Leads not appearing in HubSpot**
Check `HUBSPOT_API_KEY` is set. Without it, leads are still saved locally and marked `SKIPPED` - look in Admin → Leads.

**"Slow down - try again in Ns"**
Rate limiting. Wait it out, or adjust the limits in `src/lib/rate-limit.ts` for local testing.

**A member is missing from the directory**
Check both `isPublic` **and** `searchableInDirectory` on their privacy settings. Both must be on.

**Redirected away from `/admin`**
That account is not an admin. Sign in as `admin@bsa.dev`, or promote the account from Admin → Members.

**`next start` warns about standalone output**
Expected only if `DOCKER_BUILD=1` is set locally. Unset it for local production testing.

**Build fails after editing a page**
Run `npm run typecheck` for the specific error. The most common cause is selecting a Prisma field that does not exist - check `prisma/schema.prisma`.

---

_Last verified against a clean `npm run build` - 41 pages, 21 API routes, zero errors, zero warnings._
