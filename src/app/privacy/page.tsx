import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Business Security Alliance',
  description: 'Privacy Policy, Data Protection Governance, and Member Visibility Rights for the Business Security Alliance.',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'August 17, 2026';

  return (
    <div className="min-h-screen bg-[#070A12] text-white">
      {/* Hero Header */}
      <section className="relative border-b border-white/10 bg-[#0B0F19] py-16 lg:py-20 overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-cyan/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-violet/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-cyan hover:underline"
            >
              ← Home
            </Link>
            <span className="text-white/30">/</span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-white/60">Legal</span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-lime/40 bg-lime/15 px-3 py-1 font-mono text-[11px] font-black uppercase tracking-widest text-lime mb-4">
            DATA PROTECTION & TRUST
          </span>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Privacy Policy & Data Protection Governance
          </h1>
          <p className="mt-4 font-mono text-xs sm:text-sm text-white/60">
            Effective Date: {lastUpdated} · GDPR, CCPA & Global Standard Compliant
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Section 1 */}
          <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-6 sm:p-8 shadow-xl">
            <h2 className="font-display text-xl font-bold text-cyan flex items-center gap-2">
              <span>01.</span> Commitment to Executive Privacy
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                The <strong className="text-white">Business Security Alliance (BSA)</strong> is committed to the highest standards of data stewardship. We recognize that our members oversee critical physical and cybersecurity infrastructure for global enterprises, and confidentiality is fundamental to our mission.
              </p>
              <p>
                <strong className="text-white">Our No-Sell Guarantee:</strong> We do not sell, rent, monetize, or broker personal data, member directory information, or attendance rosters to third-party advertisers or data brokers under any circumstances.
              </p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-6 sm:p-8 shadow-xl">
            <h2 className="font-display text-xl font-bold text-cyan flex items-center gap-2">
              <span>02.</span> Information We Collect
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>We only collect data necessary to provide verified Alliance memberships and digital services:</p>
              <ul className="list-disc pl-5 space-y-2 text-white/85">
                <li>
                  <strong>Account Identification:</strong> Full name, verified corporate email address, encrypted password hash, and member handle.
                </li>
                <li>
                  <strong>Professional Profile (Optional & Member-Controlled):</strong> Job title, employer organization, security discipline/field, years of experience, regional chapter affiliations, professional bio, telephone number, and social links.
                </li>
                <li>
                  <strong>Platform Telemetry & Engagement:</strong> Event registrations, CPD hours earned, completed knowledge resource modules, and community discussion contributions.
                </li>
              </ul>
            </div>
          </div>

          {/* Section 3 */}
          <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-6 sm:p-8 shadow-xl">
            <h2 className="font-display text-xl font-bold text-cyan flex items-center gap-2">
              <span>03.</span> Granular Directory Privacy Controls
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                Every member maintains real-time, toggleable control over their public exposure via their Member Privacy Dashboard (<code className="text-cyan font-mono text-xs">/dashboard?tab=privacy</code>):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="rounded-xl border border-lime/40 bg-[#070A12] p-3.5">
                  <span className="font-mono text-xs font-bold text-lime block">LISTED</span>
                  <p className="mt-1 text-xs text-white/70">Discoverable in the directory search, filters, and chapter rosters.</p>
                </div>
                <div className="rounded-xl border border-amber/40 bg-[#070A12] p-3.5">
                  <span className="font-mono text-xs font-bold text-amber block">UNLISTED</span>
                  <p className="mt-1 text-xs text-white/70">Profile page accessible via direct link only; hidden from public search.</p>
                </div>
                <div className="rounded-xl border border-rose/40 bg-[#070A12] p-3.5">
                  <span className="font-mono text-xs font-bold text-rose block">HIDDEN</span>
                  <p className="mt-1 text-xs text-white/70">Profile returns Not Found; completely private and anonymous across the site.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-6 sm:p-8 shadow-xl">
            <h2 className="font-display text-xl font-bold text-cyan flex items-center gap-2">
              <span>04.</span> Data Security & Encryption
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                All data in transit is protected by strict TLS 1.3 encryption with Perfect Forward Secrecy and HSTS preload enforcement. Passwords are cryptographically salted and hashed using multi-round bcrypt. Sensitive database records and session tokens are strictly scoped and guarded against unauthorized escalation.
              </p>
            </div>
          </div>

          {/* Section 5 */}
          <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-6 sm:p-8 shadow-xl">
            <h2 className="font-display text-xl font-bold text-cyan flex items-center gap-2">
              <span>05.</span> Your Global Rights (GDPR / CCPA)
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>Regardless of your geographic jurisdiction, you have the right to:</p>
              <ul className="list-disc pl-5 space-y-2 text-white/85">
                <li><strong>Access & Portability:</strong> Export a machine-readable copy of your full member record and activity log.</li>
                <li><strong>Rectification:</strong> Edit or correct your profile, email, or privacy preferences at any time.</li>
                <li><strong>Erasure (Right to be Forgotten):</strong> Request the permanent deletion of your account and associated database records.</li>
              </ul>
            </div>
          </div>

          {/* Section 6 */}
          <div className="rounded-2xl border border-cyan/40 bg-[#0B0F19] p-6 sm:p-8 shadow-xl">
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <span>06.</span> Data Protection Officer (DPO) Contact
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              For formal privacy inquiries, data subject access requests (DSAR), or compliance audits, contact our Data Protection Officer:
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-xs">
              <a
                href="mailto:privacy@businesssecurityalliance.com"
                className="rounded-lg border border-cyan/50 bg-cyan/15 px-3 py-2 text-cyan hover:bg-cyan hover:text-black font-bold transition-all"
              >
                ✉️ privacy@businesssecurityalliance.com
              </a>
              <Link
                href="/contact"
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white hover:border-cyan/40 hover:text-cyan font-bold transition-all"
              >
                Executive Office Inquiry →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
