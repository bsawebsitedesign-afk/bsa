# Business Security Alliance (BSA) — Full Platform Documentation

Welcome to the official, end-to-end documentation for the **Business Security Alliance (BSA) Nexus Platform**. This document serves as the comprehensive user manual, developer guide, system architecture specification, and administration guide for the platform.

---

## 📋 Table of Contents

1. [Executive Overview & Platform Purpose](#1-executive-overview--platform-purpose)
2. [Technology Stack & Architecture](#2-technology-stack--architecture)
3. [User Roles & Access Levels](#3-user-roles--access-levels)
4. [Core Feature Modules & User Experience](#4-core-feature-modules--user-experience)
   - [4.1 Member Directory & Public Profiles](#41-member-directory--public-profiles)
   - [4.2 Events & Ticketing Programme](#42-events--ticketing-programme)
   - [4.3 Regional Chapters & Interactive 3D Radar](#43-regional-chapters--interactive-3d-radar)
   - [4.4 Business Opportunities & Applications](#44-business-opportunities--applications)
   - [4.5 Knowledge Playbooks & Learning Modules](#45-knowledge-playbooks--learning-modules)
   - [4.6 Published Thinking & Insights (Blog)](#46-published-thinking--insights-blog)
   - [4.7 Industry Partners & Sponsorships](#47-industry-partners--sponsorships)
   - [4.8 Real-Time Peer Messaging & Community Chat](#48-real-time-peer-messaging--community-chat)
   - [4.9 Site Broadcasts & In-App Notifications](#49-site-broadcasts--in-app-notifications)
5. [Admin Console Command Center (`/admin`)](#5-admin-console-command-center-admin)
   - [5.1 Single-Admin Governance Policy](#51-single-admin-governance-policy)
   - [5.2 Live Metrics Dashboard](#52-live-metrics-dashboard)
   - [5.3 Member Management & Access Control](#53-member-management--access-control)
   - [5.4 Event Management](#54-event-management)
   - [5.5 Regional Chapter Radar Management](#55-regional-chapter-radar-management)
   - [5.6 Opportunities & Application Tracking](#56-opportunities--application-tracking)
   - [5.7 Broadcast Notifications Panel](#57-broadcast-notifications-panel)
   - [5.8 Enquiries & Leads Inbox (HubSpot CRM Sync)](#58-enquiries--leads-inbox-hubspot-crm-sync)
   - [5.9 Custom Scripts & Code Injector CMS](#59-custom-scripts--code-injector-cms)
   - [5.10 Media Asset Directory Manager](#510-media-asset-directory-manager)
6. [Security, Protection & Compliance Architecture](#6-security-protection--compliance-architecture)
7. [Database Schema & Data Model](#7-database-schema--data-model)
8. [API Route Sitemap](#8-api-route-sitemap)
9. [Local Development & Deployment Guide](#9-local-development--deployment-guide)

---

## 1. Executive Overview & Platform Purpose

The **Business Security Alliance (BSA)** is a professional association platform designed specifically for the global security industry. Unlike generic corporate brochure websites, BSA is a dynamic, membership-driven network that connects security leaders, cybersecurity directors, physical defense specialists, enterprise risk officers, and security vendors.

### The Five Core Pillars
- **CONNECT**: Help security practitioners and executives locate peers via a searchable, privacy-governed Member Directory.
- **GROW**: Facilitate business growth, career advancement, and strategic partnerships via the Opportunities Board.
- **LEARN**: Provide practitioner-written playbooks, CPD-credited educational modules, and recorded executive roundtables.
- **PARTICIPATE**: Engage members through live events, workshops, regional chapter meetups, and community discussions.
- **BUILD THE INDUSTRY**: Advance converged physical and cyber security resilience across enterprises worldwide.

---

## 2. Technology Stack & Architecture

BSA is built on a modern, high-performance, serverless-ready stack:

| Layer | Technology | Key Details |
| :--- | :--- | :--- |
| **Framework** | **Next.js 14 (App Router)** | Server-side rendering (SSR), Static Generation (SSG), Incremental Static Regeneration (ISR), and React Server Components (RSC). |
| **Language** | **TypeScript 5.x** | End-to-end static typing across database models, API payloads, and client UI props. |
| **Styling & System** | **Tailwind CSS + Vanilla CSS Tokens** | Custom design system using dark mode, glassmorphism, steel/silver metallic accents, and responsive layout primitives. |
| **Database** | **PostgreSQL (Supabase)** | Managed PostgreSQL with dual connection pool configuration. |
| **ORM** | **Prisma ORM 5.x** | Type-safe query builder with automated schema migrations. |
| **Connection Pooler** | **PgBouncer (Transaction Mode)** | Port `6543` used for runtime lambdas (`DATABASE_URL`) with `connection_limit=10` and `pool_timeout=20`. Port `5432` used for Prisma CLI migrations (`DIRECT_URL`). |
| **Authentication** | **JWT + Bcrypt** | Cryptographically signed `bsa_session` cookies stored as `HttpOnly`, `SameSite=Lax/Strict`, and `Secure`. Passwords salted with `bcryptjs`. |
| **Validation** | **Zod 3.x** | Input sanitization, email verification, and payload coercion. |
| **Icons & Media** | **Phosphor Icons (SSR)** | Server-side rendered icon set (`@phosphor-icons/react/dist/ssr`). |

---

## 3. User Roles & Access Levels

The platform enforces three distinct user roles:

1. **GUEST (Unauthenticated Visitor)**
   - Can browse public marketing pages, blog insights, event listings, chapter radar, resource overviews, and sponsorship info.
   - Can register for public events, submit contact inquiries, and apply for membership.
   - Cannot view private member directory details, access member dashboard, join chapters, or participate in peer chat.

2. **MEMBER (Authenticated Security Professional)**
   - Has full access to the **Member Dashboard** (`/dashboard`).
   - Can customize public/private profile fields, specialties, and contact preferences.
   - Can view the full **Member Directory**, search members by discipline, and initiate 1-on-1 direct messaging.
   - Can join regional chapters, claim event tickets, track CPD learning credits, and apply for job/board opportunities.

3. **ADMIN (System Administrator)**
   - Has exclusive access to the **Admin Console** (`/admin`).
   - Governed by the **Single Primary Admin Policy** (`admin@bsa.in`).
   - Full write/delete capabilities across all entities (members, events, chapters, opportunities, posts, resources, broadcasts, CRM leads, and custom scripts).

---

## 4. Core Feature Modules & User Experience

### 4.1 Member Directory & Public Profiles (`/directory`, `/members/[handle]`)
- **Search & Filters**: Search members by name, organization, job title, handle, or location. Filter by role, discipline, or member type (`PROFESSIONAL`, `LEADER`, `CONSULTANT`, `VENDOR`, `ORGANISATION`).
- **Granular Privacy Matrix**: Each member independently controls visibility settings:
  - `isPublic`: Enable/disable public profile page.
  - `searchableInDirectory`: Include/exclude profile from public directory search.
  - `showEmail` / `showPhone` / `showOrg` / `showLinkedIn` / `showWebsite`: Selectively toggle public contact fields.

### 4.2 Events & Ticketing Programme (`/events`, `/events/[slug]`)
- **Event Categories**: `WEBINAR`, `WORKSHOP`, `ROUNDTABLE`, `SUMMIT`, `NETWORKING`.
- **Ticketing & Seat Capacity**: Visual real-time capacity meters (green `<60%`, orange `60–90%`, red `>90%`). Supports free or paid ticket registrations.
- **CPD Hours**: Earn Continuing Professional Development (CPD) credits upon attending certified events.
- **Registration Code**: Generates a unique registration code for every attendee.

### 4.3 Regional Chapters & Interactive 3D Radar (`/chapters`, `/chapters/[slug]`)
- **Interactive 3D Globe Radar**: A WebGL/Canvas 3D globe plotting active regional chapters using real latitude and longitude coordinates.
- **Chapter Roster**: View chapter leads, chairs, meeting cadences (`Monthly`, `Bi-Monthly`, `Quarterly`), and local members.
- **Join Flow**: Members can join regional chapters with one click.

### 4.4 Business Opportunities & Applications (`/opportunities`, `/opportunities/[slug]`)
- **Listings Board**: Discover executive roles, consulting tenders, speaking slots, board seats, and corporate partnerships.
- **Direct Application**: Submit applications with attached resume links, cover notes, and experience summaries.

### 4.5 Knowledge Playbooks & Learning Modules (`/resources`, `/resources/[slug]`)
- **Executive Frameworks**: Structured playbooks covering converged physical/cyber risk management, AI surveillance compliance, and incident response.
- **Module Progress Tracker**: Track completed modules and earn completion certificates.

### 4.6 Published Thinking & Insights (Blog) (`/blog`, `/blog/[slug]`)
- **Industry Articles**: Searchable repository of articles written by BSA leaders and security executives.
- **Featured Article**: Prominent hero placement for primary featured insights.

### 4.7 Industry Partners & Sponsorships (`/sponsors`)
- **Sponsorship Tiers**: `DIAMOND`, `GOLD`, `SILVER`, `COMMUNITY`.
- **Partner Badges**: Custom perks, hiring indicators (`Is Hiring`), and direct website CTA links.

### 4.8 Real-Time Peer Messaging & Community Chat (`/community`)
- **Channels & DMs**: Public channel chat (`#general`) and private 1-on-1 direct messaging between members.
- **Read Receipts (`ChatRead`)**: Persistent high-water mark tracking showing when peers have read messages.
- **Rich Media**: Supports image attachments and emoji reactions.

### 4.9 Site Broadcasts & In-App Notifications
- **Targeted Notification Banners**: Display site-wide announcements, security advisories, and platform updates.
- **Targeting**: Route alerts to `ALL` users, `MEMBER` accounts, or specific individuals.

---

## 5. Admin Console Command Center (`/admin`)

The Admin Console is the central control system for managing the entire platform.

### 5.1 Single-Admin Governance Policy
To guarantee operational stability, the platform enforces a strict single-admin rule:
- Only **`admin@bsa.in`** holds administrative rights.
- Creation of additional admin accounts or demotion of `admin@bsa.in` is programmatically blocked in backend API routes.

### 5.2 Live Metrics Dashboard
Displays real-time KPIs:
- Total Members & 30-Day Growth Rate
- Total Active Events & Registrations
- Open CRM Leads / Form Inquiries
- Chapter Counts & Active Resources

### 5.3 Member Management & Access Control
- Review pending activation requests.
- Activate or revoke member access.
- Filter members by status (`ACTIVE`, `PENDING`, `REVOKED`) or role.

### 5.4 Event Management
- Create, edit, or delete events.
- Update prices or ticket details safely. When editing an event, the system uses a **selective patch diff engine** (`changedFields`) to update *only* changed fields, leaving untouched attributes intact.

### 5.5 Regional Chapter Radar Management
- Add new chapters with city, region, coordinates (latitude/longitude), meeting cadence, and accent theme.
- Toggle chapter status (`Active` / `Deactivate`).

### 5.6 Opportunities & Application Tracking
- Create new role/tender listings.
- Review submitted candidate applications.

### 5.7 Broadcast Notifications Panel
- Create, pin, or deactivate site-wide notifications (`ANNOUNCEMENT`, `ADVISORY`, `UPDATE`).

### 5.8 Enquiries & Leads Inbox (HubSpot CRM Sync)
- Review form submissions (Contact, Sponsorship, Chapter Inquiries).
- Tracks synchronization status with HubSpot CRM (`PENDING`, `SYNCED`, `FAILED`).
- One-click reply links (`mailto:`) and status toggle (`Mark Handled`).

### 5.9 Custom Scripts & Code Injector CMS (`ScriptsPanel`)
Inject custom third-party scripts dynamically from the UI without redeploying code:
- **Header Scripts (`<head>`)**: Google Analytics (GA4), Meta Pixel, Google Tag Manager.
- **Footer Scripts (`</body>`)**: Live chat widgets (Crisp, Intercom, Drift).
- **Page-Specific Body Injections**: Target scripts to specific pathnames (e.g. `/contact`, `/pricing`).
- **Templates**: One-click code insertion templates for popular integrations.

### 5.10 Media Asset Directory Manager
- Upload and manage global asset URLs, images, and brand files.

---

## 6. Security, Protection & Compliance Architecture

The BSA platform is engineered to defend against common web security threats:

```
+-----------------------------------------------------------------------+
|                        BSA SECURITY ARCHITECTURE                      |
+-----------------------------------------------------------------------+
|  [ Layer 1: Transport ]      - HTTPS / Enforced TLS (sslmode=require)  |
|  [ Layer 2: Network ]        - IP Rate Limiting (Token Bucket)        |
|  [ Layer 3: Authentication ] - HttpOnly Signed JWT Cookie + Bcrypt    |
|  [ Layer 4: Authorization ]  - Server-Side RBAC Guards (requireAdmin) |
|  [ Layer 5: Input Guard ]    - Strict Zod Schema Validation & Trimming |
|  [ Layer 6: Data Layer ]     - Prisma ORM Parameterized Queries (SQLi)|
|  [ Layer 7: Output Guard ]   - React Automatic JSX Escaping (XSS)     |
+-----------------------------------------------------------------------+
```

1. **SQL Injection (SQLi) Immunity**: All database operations use Prisma ORM parameterized queries. Inputs are treated strictly as literal values by PostgreSQL.
2. **Cross-Site Scripting (XSS) Protection**: React automatically escapes strings rendered in JSX templates.
3. **Session Hijacking Defense**: Session tokens (`bsa_session`) are stored in `HttpOnly`, `SameSite`, `Secure` cookies, preventing client-side script access.
4. **Brute-Force Protection**: Rate limiting middleware ([`src/lib/rate-limit.ts`](file:///Users/ansh/Desktop/BSA/src/lib/rate-limit.ts)) restricts authentication endpoints (5 attempts/min on login, 3 attempts/min on register).
5. **No-Index Admin Privacy**: All `/admin` routes include `<meta name="robots" content="noindex, nofollow">` to exclude administrative tools from search engine indexes.

---

## 7. Database Schema & Data Model

Defined in [`prisma/schema.prisma`](file:///Users/ansh/Desktop/BSA/prisma/schema.prisma):

- **`User`**: Account identity, email, password hash, role (`ADMIN`, `MEMBER`), status (`ACTIVE`, `PENDING`, `REVOKED`).
- **`MemberProfile`**: Full name, handle, job title, headline, org, field, member type, bio, experience, skills, specialties.
- **`MemberPrivacy`**: Granular visibility settings (`showEmail`, `showPhone`, `showOrg`, `showLinkedIn`, `searchableInDirectory`).
- **`Chapter`**: Name, slug, region, city, country, latitude, longitude, cadence, active flag.
- **`ChapterMembership`**: Connects users to chapters with roles (`CHAIR`, `MEMBER`).
- **`Event`**: Title, slug, category, status, dates, times, location, capacity, CPD hours, price.
- **`EventTicket`**: Ticket tiers, price, available/sold quantities.
- **`EventRegistration`**: Connects users/attendees to events with unique registration codes.
- **`Opportunity`**: Career/tender listings, org, requirements, deadline.
- **`Application`**: Candidate submissions attached to opportunities.
- **`BlogPost`**: Title, slug, content, category, tags, read time, featured status.
- **`Resource`**: Knowledge playbooks and modules.
- **`ResourceModule`**: Individual modules with sort order and content.
- **`UserModuleProgress`**: Tracks module completion per member.
- **`ChatMessage`**: Peer messaging content, channel, recipient, attachments.
- **`ChatRead`**: Read receipts per user per conversation (`ch:general` or `dm:<userId>`).
- **`FormSubmission`**: Contact and inquiry leads tracked for HubSpot CRM.
- **`SiteNotification`**: Broadcast banners with role targeting.
- **`CustomScript`**: CMS table storing header, footer, and page-body code injections.
- **`MediaAsset`**: Directory of uploaded files and images.

---

## 8. API Route Sitemap

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | POST | Public | Authenticates credentials and sets `bsa_session` cookie. |
| `/api/auth/register` | POST | Public | Registers a new member account. |
| `/api/auth/logout` | POST | Authenticated | Clears `bsa_session` cookie. |
| `/api/auth/forgot-password` | POST | Public | Generates password reset tokens. |
| `/api/auth/reset-password` | POST | Public | Consumes reset token and sets new password. |
| `/api/user/profile` | GET / PATCH | Member | Reads or updates current member's profile. |
| `/api/user/privacy` | PATCH | Member | Updates member directory visibility matrix. |
| `/api/events/[id]/register` | POST | Public / Member | Registers attendee for an event and returns registration code. |
| `/api/chapters/[slug]/join` | POST | Member | Joins a regional chapter. |
| `/api/opportunities/[slug]/apply` | POST | Public / Member | Submits an application for an opportunity. |
| `/api/forms` | POST | Public | Handles general contact, sponsorship, and chapter inquiries. |
| `/api/chat/messages` | GET / POST | Member | Fetches or sends channel/DM chat messages. |
| `/api/chat/conversations` | GET | Member | Lists active conversations and unread indicators. |
| `/api/notifications` | GET | Public / Member | Fetches active site notifications. |
| `/api/scripts` | GET | Public | Serves header/footer/body custom scripts for injection. |
| `/api/admin/members` | PATCH / DELETE | Admin | Activates, revokes, or deletes member accounts. |
| `/api/admin/events` | POST / PATCH / DELETE | Admin | Creates, edits, or deletes events and ticket prices. |
| `/api/admin/chapters` | POST / PATCH / DELETE | Admin | Manages regional chapters and 3D radar coordinates. |
| `/api/admin/opportunities` | POST / PATCH / DELETE | Admin | Manages career and business opportunity listings. |
| `/api/admin/notifications` | POST / PATCH / DELETE | Admin | Manages broadcast notifications and pinned advisories. |
| `/api/admin/leads` | PATCH / DELETE | Admin | Manages contact leads and HubSpot CRM status. |
| `/api/admin/scripts` | PATCH | Admin | Updates global custom scripts (Header/Footer/Body CMS). |

---

## 9. Local Development & Deployment Guide

### Prerequisites
- Node.js 18.x or 20.x
- npm 9.x or later
- Supabase PostgreSQL Database (or local PostgreSQL)

### Local Setup Instructions

1. **Clone & Install Dependencies**:
   ```bash
   git clone https://github.com/bsawebsitedesign-afk/bsa.git
   cd bsa
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in credentials:
   ```env
   DATABASE_URL="postgresql://postgres.ref:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=20"
   DIRECT_URL="postgresql://postgres.ref:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
   JWT_SECRET="your-strong-random-jwt-secret-key"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

3. **Initialize Database & Seed Data**:
   ```bash
   npx prisma db push
   npm run db:seed
   ```

4. **Run Local Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Test Build Verification**:
   ```bash
   npm run build
   ```

---

### Default Credentials (Seed Data)

- **Primary Admin**: `admin@bsa.in` / `Admin@1011`
- **Demo Member 1**: `member1@bsa.in` / `Member@1011` (*Marcus Vance*)
- **Demo Member 2**: `member2@bsa.in` / `Member@1011` (*Elena Rostova*)

---

© 2026 Business Security Alliance (BSA). All rights reserved.
