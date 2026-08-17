import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | Business Security Alliance',
  description: 'Terms of Service, Membership Governance, and Professional Code of Conduct for the Business Security Alliance.',
};

export default function TermsPage() {
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

          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan/40 bg-cyan/15 px-3 py-1 font-mono text-[11px] font-black uppercase tracking-widest text-cyan mb-4">
            GOVERNANCE & COMPLIANCE
          </span>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Terms of Service & Membership Governance
          </h1>
          <p className="mt-4 font-mono text-xs sm:text-sm text-white/60">
            Effective Date: {lastUpdated} · Version 2.4.0
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Section 1 */}
          <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-6 sm:p-8 shadow-xl">
            <h2 className="font-display text-xl font-bold text-cyan flex items-center gap-2">
              <span>01.</span> Acceptance of Terms
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                By accessing, browsing, registering for, or utilizing any services provided by the{' '}
                <strong className="text-white">Business Security Alliance (BSA)</strong>, including but not limited to our digital
                portal, chapter networks, executive summits, knowledge resources, and community forums, you agree to be legally bound
                by these Terms of Service.
              </p>
              <p>
                If you are registering on behalf of an enterprise, agency, or corporation, you represent and warrant that you possess
                the full authority to bind that entity to these Terms.
              </p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-6 sm:p-8 shadow-xl">
            <h2 className="font-display text-xl font-bold text-cyan flex items-center gap-2">
              <span>02.</span> Membership Eligibility & Code of Conduct
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                Membership in the Alliance is granted to practicing security professionals, corporate executives, risk officers, and accredited industry partners. All members agree to uphold the following standards:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-white/85">
                <li>
                  <strong>Professional Integrity:</strong> Provide accurate credentials, organizational affiliations, and contact details during registration and profile management.
                </li>
                <li>
                  <strong>Confidentiality (Chatham House Rule):</strong> Discussions conducted during closed-door chapter sessions, executive roundtables, and private briefings must remain strictly confidential unless explicit permission is granted.
                </li>
                <li>
                  <strong>No Unauthorized Solicitation:</strong> Member directory feeds, contact databases, and community channels may not be harvested for unsolicited commercial spam or bulk cold outreach.
                </li>
              </ul>
            </div>
          </div>

          {/* Section 3 */}
          <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-6 sm:p-8 shadow-xl">
            <h2 className="font-display text-xl font-bold text-cyan flex items-center gap-2">
              <span>03.</span> Intellectual Property & Insights
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                All editorial articles, whitepapers, framework modules, telemetry visualizers, podcasts, and digital assets published on the BSA platform are the intellectual property of the Business Security Alliance or its contributing partner organizations.
              </p>
              <p>
                Members are granted a personal, non-transferable license to access knowledge resources for professional development and Continuing Professional Development (CPD) accreditation. Unauthorized reproduction, public distribution, or resale is strictly prohibited.
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-6 sm:p-8 shadow-xl">
            <h2 className="font-display text-xl font-bold text-cyan flex items-center gap-2">
              <span>04.</span> Summit, Event & Ticket Terms
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                Registrations for in-person summits, chapter networking evenings, and webinars are subject to venue capacity limits and executive confirmation.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-white/85">
                <li>
                  <strong>Verification on Arrival:</strong> Attendees must present their official registration QR code or valid corporate identification at the reception desk.
                </li>
                <li>
                  <strong>Cancellations:</strong> Paid summit passes may be cancelled or transferred up to 14 business days prior to the scheduled start time.
                </li>
              </ul>
            </div>
          </div>

          {/* Section 5 */}
          <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-6 sm:p-8 shadow-xl">
            <h2 className="font-display text-xl font-bold text-cyan flex items-center gap-2">
              <span>05.</span> Limitation of Liability & Disclaimers
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                BSA resources, threat analyses, and advisory frameworks are provided for general educational and strategic benchmarking purposes only. While curated by seasoned industry executives, content should not replace dedicated legal, physical security engineering, or regulatory audits tailored to your specific enterprise architecture.
              </p>
            </div>
          </div>

          {/* Section 6 */}
          <div className="rounded-2xl border border-cyan/40 bg-[#0B0F19] p-6 sm:p-8 shadow-xl">
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <span>06.</span> Executive Contact Desk
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              For questions regarding membership compliance, corporate governance, or these terms, please contact our legal and governance secretariat:
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-xs">
              <a
                href="mailto:governance@businesssecurityalliance.com"
                className="rounded-lg border border-cyan/50 bg-cyan/15 px-3 py-2 text-cyan hover:bg-cyan hover:text-black font-bold transition-all"
              >
                ✉️ governance@businesssecurityalliance.com
              </a>
              <Link
                href="/contact"
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white hover:border-cyan/40 hover:text-cyan font-bold transition-all"
              >
                Contact Executive Office →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
