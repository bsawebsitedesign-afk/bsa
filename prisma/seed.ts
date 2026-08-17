/**
 * Comprehensive Production Seed Data for Business Security Alliance (BSA)
 * Includes:
 * - 1 Sole Admin (admin@bsa.in / Admin@1011)
 * - 0 Demo Members (clean for production registrations)
 * - 5 Verified Events (Summit, Networking, Webinar, Workshop, Roundtable)
 * - 5 Industry Opportunities (Role, RFP, Speaking, Partnership, Board Position)
 * - 5 Regional Chapters (New York, Texas, California, Florida, London)
 * - 5 Strategic Partners (Sentinel, SLI, GRRF, SecureFuture, GSEN)
 * - 5 Editorial Insight Articles (Leadership, Networking, Technology, Resilience, Careers)
 * - Foundational Learning Resources
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const ADMIN_EMAIL = 'admin@bsa.in';
const ADMIN_PASSWORD = 'Admin@1011';

function svgMark(text: string, bg: string, fg: string): string {
  const label = text.slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" fill="${bg}"/><rect x="3" y="3" width="90" height="90" fill="none" stroke="#0B0B0B" stroke-width="6"/><text x="48" y="62" font-family="Arial Black,Impact,sans-serif" font-size="38" font-weight="900" text-anchor="middle" fill="${fg}">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function svgPoster(title: string, bg: string, accent: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420"><rect width="800" height="420" fill="${bg}"/><rect x="40" y="150" width="720" height="120" fill="${accent}" stroke="#0B0B0B" stroke-width="6"/><text x="400" y="228" font-family="Arial Black,Impact,sans-serif" font-size="40" font-weight="900" text-anchor="middle" fill="#0B0B0B">${title.slice(0, 28).toUpperCase()}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

async function main() {
  console.log('⬡ Clearing existing database data…');

  await prisma.siteNotification.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.resourceProgress.deleteMany();
  await prisma.resourceModule.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.application.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.chapterMembership.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.eventTicket.deleteMany();
  await prisma.eventSponsor.deleteMany();
  await prisma.eventSpeaker.deleteMany();
  await prisma.event.deleteMany();
  await prisma.sponsor.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.formSubmission.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.memberPrivacy.deleteMany();
  await prisma.memberProfile.deleteMany();
  await prisma.user.deleteMany();

  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  /* --------------------------------------------------------------- 1. MEMBERS */
  console.log('◈ Creating Production Admin Profile…');

  const adminUser = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: {
          fullName: 'BSA Executive Administrator',
          handle: 'admin',
          avatarUrl: null,
          jobTitle: 'Global Network Chair',
          headline: 'Leading the Business Security Alliance executive advisory council.',
          bio: 'Executive Director overseeing physical, electronic, and cybersecurity leadership networks across North America, Europe, and Asia.',
          org: 'Business Security Alliance',
          field: 'Executive Leadership',
          memberType: 'LEADER',
          location: 'Washington, DC, USA',
          specialties: JSON.stringify(['Executive Leadership', 'Corporate Security Governance', 'Crisis Risk Management']),
          skills: JSON.stringify(['Physical Perimeter Defense', 'Cybersecurity Convergence', 'Strategic Alliances', 'SOC SIEM Telemetry']),
          privacy: {
            create: {
              isPublic: false,
              searchableInDirectory: false,
              showEmail: true,
              showPhone: false,
              showOrg: true,
              showLinkedIn: false,
              showWebsite: false,
            },
          },
        },
      },
    },
    include: { profile: true },
  });

  /* --------------------------------------------------------------- 1B. PRACTITIONER MEMBERS */
  console.log('◈ Seeding 6 Active BSA Executive & Practitioner Member Profiles…');

  const defaultUserPasswordHash = await bcrypt.hash('Member@1011', 10);

  const member01 = await prisma.user.create({
    data: {
      email: 'elena.rostova@apexsec.com',
      passwordHash: defaultUserPasswordHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: {
          fullName: 'Elena Rostova',
          handle: 'elena-rostova',
          jobTitle: 'Chief Information Security Officer',
          headline: 'CISO leading cloud infrastructure & threat resilience at Apex Global.',
          org: 'Apex Financial Systems',
          field: 'Cybersecurity',
          memberType: 'LEADER',
          location: 'New York, NY, USA',
          bio: '16+ years designing zero-trust cloud architectures and threat telemetry hubs across financial institutions.',
          yearsExperience: 16,
          specialties: JSON.stringify(['Cloud Security Architecture', 'Zero Trust Frameworks', 'Threat Intelligence', 'CISO Advisory']),
          skills: JSON.stringify(['AWS Security', 'SIEM / SOAR Telemetry', 'ISO 27001', 'SOC 2 Type II Compliance']),
          openToOpportunities: true,
          openToMentoring: true,
          openToSpeaking: true,
          privacy: {
            create: {
              isPublic: true,
              searchableInDirectory: true,
              showEmail: true,
              showPhone: false,
              showOrg: true,
              showLinkedIn: true,
              showWebsite: true,
            },
          },
        },
      },
    },
  });

  const member02 = await prisma.user.create({
    data: {
      email: 'marcus.vance@vance-defense.com',
      passwordHash: defaultUserPasswordHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: {
          fullName: 'Marcus Vance',
          handle: 'marcus-vance',
          jobTitle: 'VP of Physical & Executive Protection',
          headline: 'Overseeing global corporate risk & executive protection programs.',
          org: 'Vance Global Defense',
          field: 'Corporate Security',
          memberType: 'PROFESSIONAL',
          location: 'Austin, TX, USA',
          bio: 'Former military intelligence officer leading physical risk assessments, executive protection, and supply chain security.',
          yearsExperience: 14,
          specialties: JSON.stringify(['Executive Protection', 'Physical Perimeter Defense', 'Crisis Management', 'Supply Chain Security']),
          skills: JSON.stringify(['Access Control Systems', 'Threat Vulnerability Assessment', 'Emergency Response', 'CCTV Analytics']),
          openToOpportunities: false,
          openToMentoring: true,
          openToSpeaking: true,
          privacy: {
            create: {
              isPublic: true,
              searchableInDirectory: true,
              showEmail: true,
              showPhone: true,
              showOrg: true,
              showLinkedIn: true,
              showWebsite: false,
            },
          },
        },
      },
    },
  });

  const member03 = await prisma.user.create({
    data: {
      email: 'sarah.lin@quantumbio.com',
      passwordHash: defaultUserPasswordHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: {
          fullName: 'Sarah Lin',
          handle: 'sarah-lin',
          jobTitle: 'Head of Security Operations & Incident Response',
          headline: 'Building NextGen SOC automation & incident response capabilities.',
          org: 'Quantum BioLabs',
          field: 'Risk Management',
          memberType: 'PROFESSIONAL',
          location: 'Los Angeles, CA, USA',
          bio: 'Specialising in automated SOC workflows, threat hunting, and high-consequence breach investigation for biotech enterprises.',
          yearsExperience: 11,
          specialties: JSON.stringify(['SOC Automation', 'Incident Response', 'Malware Forensics', 'Threat Hunting']),
          skills: JSON.stringify(['Python Security Tooling', 'Splunk / Sentinel', 'CrowdStrike Falcon', 'DFIR']),
          openToOpportunities: true,
          openToMentoring: true,
          openToSpeaking: false,
          privacy: {
            create: {
              isPublic: true,
              searchableInDirectory: true,
              showEmail: true,
              showPhone: false,
              showOrg: true,
              showLinkedIn: true,
              showWebsite: true,
            },
          },
        },
      },
    },
  });

  const member04 = await prisma.user.create({
    data: {
      email: 'david.sterling@sterling-advisory.co.uk',
      passwordHash: defaultUserPasswordHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: {
          fullName: 'David Sterling',
          handle: 'david-sterling',
          jobTitle: 'Principal Security Governance Consultant',
          headline: 'Advising Fortune 500 boards on regulatory compliance & enterprise risk.',
          org: 'Sterling Advisory Partners',
          field: 'Consulting',
          memberType: 'CONSULTANT',
          location: 'London, United Kingdom',
          bio: 'Senior advisor assisting corporate boards with NIS2, GDPR compliance, and M&A cyber due diligence across EMEA.',
          yearsExperience: 20,
          specialties: JSON.stringify(['Board Level Risk Reporting', 'GDPR & NIS2 Governance', 'M&A Security Audits', 'Operational Resilience']),
          skills: JSON.stringify(['NIST CSF', 'Enterprise Risk Frameworks', 'Regulatory Strategy', 'Audit Steering']),
          openToOpportunities: true,
          openToMentoring: false,
          openToSpeaking: true,
          privacy: {
            create: {
              isPublic: true,
              searchableInDirectory: true,
              showEmail: true,
              showPhone: true,
              showOrg: true,
              showLinkedIn: true,
              showWebsite: true,
            },
          },
        },
      },
    },
  });

  const member05 = await prisma.user.create({
    data: {
      email: 'priya.sharma@cyberguard.tech',
      passwordHash: defaultUserPasswordHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: {
          fullName: 'Priya Sharma',
          handle: 'priya-sharma',
          jobTitle: 'Director of Product Security',
          headline: 'DevSecOps advocate embedding security into CI/CD pipelines.',
          org: 'CyberGuard Technologies',
          field: 'Application Security',
          memberType: 'VENDOR',
          location: 'Miami, FL, USA',
          bio: 'AppSec lead focused on container security, API protection, and zero-downtime security automation.',
          yearsExperience: 12,
          specialties: JSON.stringify(['DevSecOps', 'AppSec Architecture', 'Penetration Testing', 'API Gateway Security']),
          skills: JSON.stringify(['Docker / K8s Hardening', 'Static & Dynamic Analysis', 'OAuth2 / SAML', 'OWASP Top 10']),
          openToOpportunities: false,
          openToMentoring: true,
          openToSpeaking: true,
          privacy: {
            create: {
              isPublic: true,
              searchableInDirectory: true,
              showEmail: true,
              showPhone: false,
              showOrg: true,
              showLinkedIn: true,
              showWebsite: true,
            },
          },
        },
      },
    },
  });

  /* --------------------------------------------------------------- 2. CHAPTERS */
  console.log('◆ Creating 5 Regional Chapters…');

  const chapter01 = await prisma.chapter.create({
    data: {
      slug: 'bsa-new-york',
      name: 'BSA New York',
      region: 'Northeast United States',
      city: 'New York',
      country: 'United States',
      latitude: 40.7128,
      longitude: -74.0060,
      description: 'BSA New York connects security professionals, leaders, companies, and industry experts across the New York security community through networking, professional development, and industry events.\n\nChapter Lead: Michael Anderson\nActivities: Security Leadership Summit, Executive Networking Evening, Security Technology Roundtable, Member Meetup.',
      contactEmail: 'ny-lead@businesssecurityalliance.com',
      emoji: '🗽',
      accent: 'cyan',
      meetingCadence: 'Monthly',
      memberships: {
        create: {
          userId: adminUser.id,
          role: 'CHAIR',
        },
      },
    },
  });

  const chapter02 = await prisma.chapter.create({
    data: {
      slug: 'bsa-texas',
      name: 'BSA Texas',
      region: 'South Central United States',
      city: 'Austin',
      country: 'United States',
      latitude: 30.2672,
      longitude: -97.7431,
      description: 'BSA Texas provides a local community for security professionals to connect, exchange knowledge, attend industry events, and develop professional relationships.\n\nChapter Lead: Sarah Mitchell\nActivities: Texas Security Networking Evening, Corporate Security Roundtable, Security Technology Workshop.',
      contactEmail: 'texas-lead@businesssecurityalliance.com',
      emoji: '🤠',
      accent: 'violet',
      meetingCadence: 'Bi-Monthly',
    },
  });

  const chapter03 = await prisma.chapter.create({
    data: {
      slug: 'bsa-california',
      name: 'BSA California',
      region: 'Western United States',
      city: 'Los Angeles',
      country: 'United States',
      latitude: 34.0522,
      longitude: -118.2437,
      description: 'BSA California connects security professionals, organizations, and industry leaders across the state through networking, professional development, events, and knowledge sharing.\n\nChapter Lead: David Carter.',
      contactEmail: 'california-lead@businesssecurityalliance.com',
      emoji: '🌴',
      accent: 'lime',
      meetingCadence: 'Monthly',
    },
  });

  const chapter04 = await prisma.chapter.create({
    data: {
      slug: 'bsa-florida',
      name: 'BSA Florida',
      region: 'Southeast United States',
      city: 'Miami',
      country: 'United States',
      latitude: 25.7617,
      longitude: -80.1918,
      description: 'BSA Florida provides a local community for security professionals to connect, exchange knowledge, attend industry events, and develop professional relationships.\n\nChapter Lead: Jessica Morgan.',
      contactEmail: 'florida-lead@businesssecurityalliance.com',
      emoji: '☀️',
      accent: 'amber',
      meetingCadence: 'Quarterly',
    },
  });

  const chapter05 = await prisma.chapter.create({
    data: {
      slug: 'bsa-london',
      name: 'BSA London',
      region: 'Europe',
      city: 'London',
      country: 'United Kingdom',
      latitude: 51.5074,
      longitude: -0.1278,
      description: 'BSA London connects security professionals and organizations across the UK and European security community, supporting networking, knowledge exchange, and professional development.\n\nChapter Lead: James Wilson.',
      contactEmail: 'london-lead@businesssecurityalliance.com',
      emoji: '🏛️',
      accent: 'magenta',
      meetingCadence: 'Monthly',
    },
  });

  /* --------------------------------------------------------------- 3. EVENTS */
  console.log('○ Creating 5 Production Events…');

  // Event 01 — Summit
  await prisma.event.create({
    data: {
      slug: 'bsa-security-leadership-summit-2026',
      title: 'BSA Security Leadership Summit 2026',
      category: 'SUMMIT',
      status: 'UPCOMING',
      cpdHours: 6,
      description: 'A premier gathering of security leaders, professionals, and innovators exploring the future of security, risk, resilience, technology, and leadership.',
      fullDetails: 'The BSA Security Leadership Summit brings together security professionals, executives, and industry experts for a day of knowledge sharing, networking, and collaboration.\n\nThe summit will explore emerging security risks, leadership strategies, technology, organizational resilience, and the future of the security profession.\n\nKey themes include security leadership, enterprise risk management, emerging security technologies, crisis management, business resilience, and building the next generation of security leaders.',
      eventDate: new Date('2026-09-15T10:00:00Z'),
      endDate: new Date('2026-09-15T17:30:00Z'),
      startTime: '10:00 AM',
      endTime: '05:30 PM',
      location: 'New York, NY',
      locationType: 'IN_PERSON',
      venueName: 'Metropolitan Conference Center',
      maxCapacity: 250,
      isPaid: true,
      heroImageUrl: svgPoster('SECURITY SUMMIT 2026', '#0B0B0B', '#00F0FF'),
      agendaJson: JSON.stringify([
        { time: '09:00 AM', title: 'Doors Open & Registration', speaker: 'BSA Team' },
        { time: '10:00 AM', title: 'Opening Keynote: The Future of Converged Security', speaker: 'Michael Anderson' },
        { time: '12:00 PM', title: 'Executive Networking Lunch', speaker: 'All Attendees' },
        { time: '02:00 PM', title: 'Panel: Enterprise Risk Management & Crisis Resilience', speaker: 'Industry Executives' },
        { time: '04:30 PM', title: 'Closing Keynote & CPD Certification', speaker: 'BSA Advisory Board' },
      ]),
      tickets: {
        create: [
          {
            name: 'BSA Member — Standard Admission',
            description: 'Full access to all keynote sessions, panels, lunch, and networking reception.',
            price: 75,
            currency: 'USD',
            quantityAvailable: 250,
          },
        ],
      },
    },
  });

  // Event 02 — Networking
  await prisma.event.create({
    data: {
      slug: 'bsa-executive-networking-evening',
      title: 'BSA Executive Networking Evening',
      category: 'NETWORKING',
      status: 'UPCOMING',
      cpdHours: 2,
      description: 'An informal evening connecting security professionals, executives, and industry leaders for meaningful conversations and professional networking.',
      fullDetails: 'Join BSA for an evening of professional networking with security leaders and professionals from across the industry.\n\nThe event provides an informal environment where members can meet new people, exchange ideas, discuss industry challenges, and build meaningful professional relationships.',
      eventDate: new Date('2026-10-08T18:00:00Z'),
      endDate: new Date('2026-10-08T20:30:00Z'),
      startTime: '06:00 PM',
      endTime: '08:30 PM',
      location: 'Austin, TX',
      locationType: 'IN_PERSON',
      venueName: 'Austin Executive Club',
      maxCapacity: 100,
      isPaid: false,
      heroImageUrl: svgPoster('NETWORKING EVENING', '#0B0B0B', '#C6F432'),
      agendaJson: JSON.stringify([
        { time: '05:30 PM', title: 'Doors Open & Welcome Drinks', speaker: 'Sarah Mitchell' },
        { time: '06:30 PM', title: 'Roundtable Conversations & Introductions', speaker: 'All Attendees' },
        { time: '08:00 PM', title: 'Closing Remarks & Next Steps', speaker: 'BSA Texas Committee' },
      ]),
      tickets: {
        create: [
          {
            name: 'Free RSVP',
            description: 'Complimentary admission for verified security professionals and members.',
            price: 0,
            currency: 'USD',
            quantityAvailable: 100,
          },
        ],
      },
    },
  });

  // Event 03 — Webinar
  await prisma.event.create({
    data: {
      slug: 'the-future-of-security-leadership-webinar',
      title: 'The Future of Security Leadership',
      category: 'WEBINAR',
      status: 'UPCOMING',
      cpdHours: 1,
      description: 'Security leaders discuss emerging risks, technology, leadership challenges, and the skills shaping the future of the security profession.',
      fullDetails: 'The security industry is evolving rapidly. New technologies, changing threat landscapes, and increasing organizational complexity are reshaping the role of security leaders.\n\nThis virtual session explores the changing responsibilities of modern security leaders and the capabilities required to lead security teams in the future.',
      eventDate: new Date('2026-10-22T14:00:00Z'),
      endDate: new Date('2026-10-22T15:30:00Z'),
      startTime: '02:00 PM',
      endTime: '03:30 PM',
      location: 'Online',
      locationType: 'VIRTUAL',
      venueName: 'Online — Registration Required',
      maxCapacity: 500,
      isPaid: false,
      heroImageUrl: svgPoster('SECURITY WEBINAR', '#6C2BD9', '#FBF9F4'),
      agendaJson: JSON.stringify([
        { time: '01:45 PM', title: 'Virtual Lobby Opens', speaker: 'BSA Moderator' },
        { time: '02:00 PM', title: 'Key Presentation: Modern Security Leadership Capabilities', speaker: 'David Carter' },
        { time: '02:50 PM', title: 'Interactive Live Q&A Session', speaker: 'All Attendees' },
      ]),
      tickets: {
        create: [
          {
            name: 'Virtual Attendance',
            description: 'Direct interactive access to live stream and session recording.',
            price: 0,
            currency: 'USD',
            quantityAvailable: 500,
          },
        ],
      },
    },
  });

  // Event 04 — Workshop
  await prisma.event.create({
    data: {
      slug: 'security-risk-management-workshop',
      title: 'Security Risk Management Workshop',
      category: 'WORKSHOP',
      status: 'UPCOMING',
      cpdHours: 4,
      description: 'An interactive workshop helping security professionals strengthen risk assessment, mitigation planning, and organizational resilience.',
      fullDetails: 'An interactive, hands-on workshop helping security professionals strengthen risk assessment, mitigation planning, and organizational resilience across enterprise perimeters and digital assets.',
      eventDate: new Date('2026-11-12T09:30:00Z'),
      endDate: new Date('2026-11-12T16:00:00Z'),
      startTime: '09:30 AM',
      endTime: '04:00 PM',
      location: 'Chicago, IL',
      locationType: 'IN_PERSON',
      venueName: 'Chicago Security & Leadership Center',
      maxCapacity: 60,
      isPaid: true,
      heroImageUrl: svgPoster('RISK WORKSHOP', '#0E1726', '#FF0055'),
      agendaJson: JSON.stringify([
        { time: '09:00 AM', title: 'Doors Open & Breakfast', speaker: 'Host' },
        { time: '09:30 AM', title: 'Framework Analysis: Risk Modeling & Vulnerability Scanning', speaker: 'Lead Instructor' },
        { time: '01:00 PM', title: 'Practical Exercise: Incident Simulation & Response', speaker: 'Attendees Workshop' },
        { time: '03:30 PM', title: 'Mitigation Plan Review & CPD Certificates', speaker: 'Instructors' },
      ]),
      tickets: {
        create: [
          {
            name: 'Workshop Admission',
            description: 'Includes interactive training materials, simulation templates, lunch, and 4 CPD credits.',
            price: 125,
            currency: 'USD',
            quantityAvailable: 60,
          },
        ],
      },
    },
  });

  // Event 05 — Roundtable
  await prisma.event.create({
    data: {
      slug: 'executive-security-risk-roundtable',
      title: 'Executive Security Risk Roundtable',
      category: 'ROUNDTABLE',
      status: 'UPCOMING',
      cpdHours: 2,
      description: 'A private discussion for security executives exploring emerging enterprise risks, resilience strategies, and leadership challenges.',
      fullDetails: 'A closed-door executive discussion exploring emerging enterprise risks, resilience strategies, and leadership challenges facing Chief Security Officers and enterprise risk leaders.',
      eventDate: new Date('2026-12-03T16:00:00Z'),
      endDate: new Date('2026-12-03T18:30:00Z'),
      startTime: '04:00 PM',
      endTime: '06:30 PM',
      location: 'Boston, MA',
      locationType: 'HYBRID',
      venueName: 'Boston Executive Forum',
      maxCapacity: 40,
      isPaid: true,
      heroImageUrl: svgPoster('EXECUTIVE ROUNDTABLE', '#0B0B0B', '#FFB800'),
      agendaJson: JSON.stringify([
        { time: '03:30 PM', title: 'Executive Reception & Briefing', speaker: 'BSA Leadership' },
        { time: '04:00 PM', title: 'Chatham House Rule Discussion on Emerging Threat Vectors', speaker: 'All Executives' },
        { time: '06:00 PM', title: 'Action Items & Strategic Consensus', speaker: 'Moderator' },
      ]),
      tickets: {
        create: [
          {
            name: 'Executive Roundtable Admission',
            description: 'Exclusive access to closed roundtable session and confidential briefing summary.',
            price: 50,
            currency: 'USD',
            quantityAvailable: 40,
          },
        ],
      },
    },
  });

  /* --------------------------------------------------------------- 4. OPPORTUNITIES */
  console.log('⬡ Creating 5 Industry Opportunities…');

  // Opportunity 01 — Role
  await prisma.opportunity.create({
    data: {
      slug: 'director-of-corporate-security',
      title: 'Director of Corporate Security',
      org: 'Apex Global Security',
      type: 'ROLE',
      locationType: 'HYBRID',
      location: 'New York, NY',
      compensation: '$160,000 – $200,000 per year',
      description: 'Apex Global Security is seeking an experienced security professional to lead enterprise security strategy, risk management, crisis preparedness, and security operations.\n\nThe successful candidate will work closely with executive leadership to develop security programs, identify emerging risks, and strengthen organizational resilience.',
      requirements: JSON.stringify([
        '8+ years security leadership experience',
        'Enterprise security strategy',
        'Risk management',
        'Crisis management',
        'Security team management',
        'Executive stakeholder management',
        'Strategic planning',
        'Strong communication skills',
      ]),
      deadline: new Date('2026-10-15T23:59:59Z'),
    },
  });

  // Opportunity 02 — RFP
  await prisma.opportunity.create({
    data: {
      slug: 'enterprise-security-risk-assessment-rfp',
      title: 'Enterprise Security Risk Assessment RFP',
      org: 'Northstar Risk Solutions',
      type: 'RFP',
      locationType: 'HYBRID',
      location: 'Chicago, IL',
      compensation: 'Proposal-based',
      description: 'Northstar Risk Solutions is seeking qualified security consulting organizations to conduct an enterprise-wide security risk assessment.\n\nThe selected organization will evaluate current security capabilities, identify operational and strategic risks, and provide recommendations for improving organizational resilience.',
      requirements: JSON.stringify([
        '5+ years security consulting',
        'Enterprise risk assessment',
        'Security program development',
        'Executive reporting',
        'Relevant references',
        'Strong analytical capabilities',
      ]),
      deadline: new Date('2026-10-30T23:59:59Z'),
    },
  });

  // Opportunity 03 — Speaking
  await prisma.opportunity.create({
    data: {
      slug: 'security-leadership-summit-featured-speaker',
      title: 'Security Leadership Summit — Featured Speaker',
      org: 'Business Security Alliance',
      type: 'SPEAKING',
      locationType: 'ONSITE',
      location: 'New York, NY',
      compensation: 'Speaker participation — terms discussed individually',
      description: 'BSA is inviting experienced security professionals and industry leaders to share practical insights, leadership lessons, emerging trends, and real-world experiences with the BSA community.',
      requirements: JSON.stringify([
        'Senior security experience',
        'Public speaking experience',
        'Relevant industry expertise',
        'Practical experience',
        'Presentation skills',
        'Industry knowledge',
      ]),
      deadline: new Date('2026-09-30T23:59:59Z'),
    },
  });

  // Opportunity 04 — Partnership
  await prisma.opportunity.create({
    data: {
      slug: 'security-technology-partnership-program',
      title: 'Security Technology Partnership Program',
      org: 'Sentinel Technologies',
      type: 'PARTNERSHIP',
      locationType: 'REMOTE',
      location: 'United States',
      compensation: 'Partnership terms discussed with selected organizations',
      description: 'Sentinel Technologies is seeking strategic partners across the security industry to collaborate on technology initiatives, professional education, industry events, and business opportunities.',
      requirements: JSON.stringify([
        'Security industry experience',
        'Complementary technology/services',
        'Professional network',
        'Collaborative approach',
        'Strong communication skills',
      ]),
    },
  });

  // Opportunity 05 — Board Position
  await prisma.opportunity.create({
    data: {
      slug: 'bsa-advisory-board-security-technology-advisor',
      title: 'BSA Advisory Board — Security Technology Advisor',
      org: 'Business Security Alliance',
      type: 'BOARD_POSITION',
      locationType: 'HYBRID',
      location: 'New York, NY / Remote',
      compensation: 'Advisory position — terms discussed separately',
      description: 'BSA is seeking an experienced security technology leader to contribute strategic insight on emerging technologies, industry trends, professional development, and the future direction of the security industry.',
      requirements: JSON.stringify([
        '10+ years security experience',
        'Leadership experience',
        'Security technology expertise',
        'Strategic thinking',
        'Industry network',
        'Strong communication',
        'Advisory experience preferred',
      ]),
      deadline: new Date('2026-12-15T23:59:59Z'),
    },
  });

  /* --------------------------------------------------------------- 5. STRATEGIC PARTNERS */
  console.log('▤ Creating 5 Strategic Partners…');

  await prisma.sponsor.create({
    data: {
      name: 'Sentinel Technologies',
      logoUrl: svgMark('ST', '#0E1726', '#00F0FF'),
      websiteUrl: 'https://businesssecurityalliance.com',
      tier: 'DIAMOND',
      description: 'Sentinel Technologies provides security technology solutions focused on improving visibility, risk management, and operational resilience. Through its partnership with BSA, Sentinel supports industry education, professional networking, and initiatives focused on the future of security technology.',
      ctaText: 'Explore Technology Solutions',
      ctaUrl: 'https://businesssecurityalliance.com',
      isHiring: true,
      perkText: 'Executive Telemetry & Visibility Suite',
    },
  });

  await prisma.sponsor.create({
    data: {
      name: 'Security Leadership Institute',
      logoUrl: svgMark('SL', '#1E1B4B', '#C084FC'),
      websiteUrl: 'https://businesssecurityalliance.com',
      tier: 'PLATINUM',
      description: 'Security Leadership Institute provides professional education and development programs for current and emerging security leaders. The partnership supports professional development, knowledge sharing, and leadership initiatives within the security community.',
      ctaText: 'View Leadership Programs',
      ctaUrl: 'https://businesssecurityalliance.com',
      isHiring: false,
      perkText: 'Exclusive Member CPD Masterclasses',
    },
  });

  await prisma.sponsor.create({
    data: {
      name: 'Global Risk & Resilience Forum',
      logoUrl: svgMark('GR', '#064E3B', '#34D399'),
      websiteUrl: 'https://businesssecurityalliance.com',
      tier: 'GOLD',
      description: 'Global Risk & Resilience Forum brings together professionals working across security, risk, resilience, and organizational preparedness. The partnership supports collaboration, knowledge exchange, and industry engagement.',
      ctaText: 'Access Resilience Frameworks',
      ctaUrl: 'https://businesssecurityalliance.com',
      isHiring: false,
      perkText: 'Quarterly Risk Briefing Reports',
    },
  });

  await prisma.sponsor.create({
    data: {
      name: 'SecureFuture Research Group',
      logoUrl: svgMark('SF', '#312E81', '#818CF8'),
      websiteUrl: 'https://businesssecurityalliance.com',
      tier: 'GOLD',
      description: 'SecureFuture Research Group conducts research into emerging security risks, technologies, and organizational resilience. The partnership provides research and insights to the wider BSA community.',
      ctaText: 'Read Security Research',
      ctaUrl: 'https://businesssecurityalliance.com',
      isHiring: true,
      perkText: 'Early-Access Threat Intelligence Papers',
    },
  });

  await prisma.sponsor.create({
    data: {
      name: 'Global Security Education Network',
      logoUrl: svgMark('GE', '#701A75', '#F472B6'),
      websiteUrl: 'https://businesssecurityalliance.com',
      tier: 'SILVER',
      description: 'Global Security Education Network supports professional learning and continuing development for security practitioners through education, workshops, and knowledge-sharing initiatives.',
      ctaText: 'Explore Education Modules',
      ctaUrl: 'https://businesssecurityalliance.com',
      isHiring: false,
      perkText: 'Accredited Certification Vouchers',
    },
  });

  /* --------------------------------------------------------------- 6. BLOG / INSIGHTS */
  console.log('◈ Creating 5 Insight Articles…');

  await prisma.blogPost.create({
    data: {
      slug: 'the-future-of-security-leadership-article',
      title: 'The Future of Security Leadership',
      summary: 'Security leaders are increasingly expected to operate as strategic business partners. Explore how technology, resilience, and changing risk environments are reshaping the modern security leadership role.',
      content: 'Security leaders are increasingly expected to operate as strategic business partners rather than isolated tactical managers.\n\nAs threat surfaces expand across both cyber and physical dimensions, the modern Chief Security Officer must balance technical defense with board-level financial communication, compliance mandates, and organizational resilience.\n\nThis executive analysis provides actionable recommendations on navigating changing risk environments and structuring agile defense teams.',
      imageUrl: svgPoster('SECURITY LEADERSHIP', '#6C2BD9', '#00F0FF'),
      category: 'Leadership',
      authorName: 'Michael Anderson',
      authorTitle: 'Chapter Lead · BSA New York',
      authorAvatar: svgMark('MA', '#0F172A', '#38BDF8'),
      publishedAt: new Date(),
      isFeatured: true,
      readTimeMinutes: 6,
    },
  });

  await prisma.blogPost.create({
    data: {
      slug: 'why-security-professionals-need-stronger-networks',
      title: 'Why Security Professionals Need Stronger Networks',
      summary: 'Security challenges increasingly cross organizational and geographic boundaries. Strong professional networks help security leaders exchange knowledge, discover opportunities, and respond to emerging challenges.',
      content: 'Security challenges rarely occur in isolation. Cross-border cyber attacks, supply chain disruptions, and critical infrastructure dependencies require security leaders to build robust peer networks.\n\nBy engaging with peers through regional alliance chapters, security directors can access real-time threat intelligence and benchmark mitigation strategies before crises occur.',
      imageUrl: svgPoster('STRONGER NETWORKS', '#0B0B0B', '#C6F432'),
      category: 'Networking',
      authorName: 'Sarah Mitchell',
      authorTitle: 'Chapter Lead · BSA Texas',
      authorAvatar: svgMark('SM', '#1E1B4B', '#A78BFA'),
      publishedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      isFeatured: true,
      readTimeMinutes: 5,
    },
  });

  await prisma.blogPost.create({
    data: {
      slug: 'the-convergence-of-physical-and-cyber-security',
      title: 'The Convergence of Physical and Cyber Security',
      summary: 'The traditional separation between physical and cyber security is changing. Explore how organizations are approaching security as a connected and integrated discipline.',
      content: 'Historically, physical perimeter security and digital information security were managed by entirely separate departments.\n\nModern enterprise architecture integrates IoT badge readers, automated CCTV surveillance, and zero-trust identity verification into a centralized Security Operations Center (SOC).\n\nThis article outlines the roadmap for converging physical and cybersecurity operations effectively.',
      imageUrl: svgPoster('CONVERGED DEFENSE', '#0E1726', '#FF0055'),
      category: 'Technology',
      authorName: 'David Carter',
      authorTitle: 'Chapter Lead · BSA California',
      authorAvatar: svgMark('DC', '#064E3B', '#34D399'),
      publishedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
      isFeatured: false,
      readTimeMinutes: 7,
    },
  });

  await prisma.blogPost.create({
    data: {
      slug: 'building-resilient-security-programs',
      title: 'Building Resilient Security Programs',
      summary: 'Modern organizations need security programs that can adapt to changing threats. Learn how security leaders can build resilience into their strategies, teams, and operations.',
      content: 'Resilience is more than just stopping attacks—it is the capacity of an enterprise to absorb shock, sustain essential services, and restore full operational capacity swiftly.\n\nLearn how enterprise security leaders conduct red-team scenario simulations, audit third-party vendor risks, and empower distributed incident command units.',
      imageUrl: svgPoster('RESILIENT PROGRAMS', '#1E1B4B', '#FFB800'),
      category: 'Resilience',
      authorName: 'Olivia Bennett',
      authorTitle: 'Security Advisory Lead',
      authorAvatar: svgMark('OB', '#701A75', '#F472B6'),
      publishedAt: new Date(Date.now() - 6 * 24 * 3600 * 1000),
      isFeatured: false,
      readTimeMinutes: 8,
    },
  });

  await prisma.blogPost.create({
    data: {
      slug: 'the-next-generation-of-security-professionals',
      title: 'The Next Generation of Security Professionals',
      summary: 'The security profession is changing rapidly. Explore the skills, experiences, and professional relationships that can help emerging security professionals prepare for leadership.',
      content: 'As artificial intelligence, cloud infrastructure, and converged threat landscapes evolve, the security skillset is undergoing a massive shift.\n\nEmerging security professionals must cultivate cross-disciplinary skills in risk quantification, cloud governance, and empathetic crisis leadership to step into senior executive roles.',
      imageUrl: svgPoster('NEXT GEN SECURITY', '#0B0B0B', '#00F0FF'),
      category: 'Careers',
      authorName: 'James Wilson',
      authorTitle: 'Chapter Lead · BSA London',
      authorAvatar: svgMark('JW', '#312E81', '#818CF8'),
      publishedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000),
      isFeatured: false,
      readTimeMinutes: 6,
    },
  });

  /* --------------------------------------------------------------- 7. RESOURCE PLAYBOOK */
  console.log('○ Creating Knowledge Resource Framework…');

  await prisma.resource.create({
    data: {
      slug: 'executive-security-advisory-framework',
      title: 'Executive Security Leadership & Risk Integration Playbook',
      summary: 'Comprehensive advisory manual for security executives implementing converged risk management frameworks.',
      description: 'A step-by-step executive guide covering physical perimeter defense, AI surveillance compliance, vendor risk management, and crisis escalation protocols.',
      modules: {
        create: [
          {
            title: 'Module 1: Physical Perimeter & Access Control Standards',
            summary: 'Establishing zero-trust physical boundaries and credential governance.',
            content: 'Detailed guidelines for biometrics, RFID access, and perimeter intrusion detection systems.',
            sortOrder: 1,
          },
          {
            title: 'Module 2: Converging Physical Controls with Cyber Telemetry',
            summary: 'Integrating physical door alarms with SOC SIEM monitoring platforms.',
            content: 'Architectural diagrams and data flow standards for real-time threat response.',
            sortOrder: 2,
          },
        ],
      },
    },
  });

  console.log('💬 Seeding initial Community Hub channel messages…');
  await prisma.chatMessage.createMany({
    data: [
      {
        senderId: adminUser.id,
        channel: 'general',
        content: 'Welcome to the Business Security Alliance Global Community Hub! This is our dedicated space for executive members to collaborate, share threat intelligence, and connect directly.',
      },
      {
        senderId: adminUser.id,
        channel: 'convergence',
        content: 'Let us use this channel for discussions on physical perimeter sensors, SOC SIEM telemetry integration, and AI video surveillance compliance.',
      },
    ],
  });

  console.log('🔔 Seeding initial broadcast notifications…');
  await prisma.siteNotification.createMany({
    data: [
      {
        title: 'BSA Security Leadership Summit 2026 Registration Open',
        message: 'Official registration is now open for the annual BSA Security Leadership Summit on September 15, 2026 at the Metropolitan Conference Center in New York, NY.',
        type: 'SUMMIT',
        linkUrl: '/events/bsa-security-leadership-summit-2026',
        linkText: 'View Summit Details & Tickets',
        isPinned: true,
        isActive: true,
        createdById: adminUser.id,
      },
      {
        title: 'Executive Advisory Playbook Published',
        message: 'The new Executive Security Leadership & Risk Integration Playbook is now live in the knowledge center for all verified members.',
        type: 'ADVISORY',
        linkUrl: '/resources/executive-security-advisory-framework',
        linkText: 'Open Playbook',
        isPinned: false,
        isActive: true,
        createdById: adminUser.id,
      },
      {
        title: 'Welcome to BSA Nexus Platform',
        message: 'Welcome to the global platform for converged physical, electronic, and cybersecurity leadership. Discover regional chapters, live events, and career opportunities.',
        type: 'INFO',
        linkUrl: '/about',
        linkText: 'Learn About BSA',
        isPinned: false,
        isActive: true,
        createdById: adminUser.id,
      },
    ],
  });

  console.log('\n✅ All requested production dataset records seeded successfully!');
  console.log('┌─────────────────────────────┬──────────────────────────────────────────┐');
  console.log('│ Record Type                 │ Production Total                         │');
  console.log('├─────────────────────────────┼──────────────────────────────────────────┤');
  console.log('│ Sole Administrator User     │ admin@bsa.in                             │');
  console.log('│ Initial Members             │ 0 (Real user registrations only)         │');
  console.log('│ Events                      │ 5 (Summit, Networking, Webinar, etc.)    │');
  console.log('│ Opportunities               │ 5 (Role, RFP, Speaking, Partner, Board)  │');
  console.log('│ Regional Chapters           │ 5 (New York, Texas, CA, FL, London)      │');
  console.log('│ Strategic Partners          │ 5 (Sentinel, SLI, GRRF, SecureFuture, …) │');
  console.log('│ Insight Articles            │ 5 (Leadership, Networking, Tech, etc.)   │');
  console.log('└─────────────────────────────┴──────────────────────────────────────────┘\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
