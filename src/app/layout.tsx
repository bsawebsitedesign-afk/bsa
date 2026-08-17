import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Caveat, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { Navbar, type NavSession } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Grain } from '@/components/grain';
import { ToastProvider } from '@/components/ui/toast';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { initials } from '@/lib/utils';

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const accent = Caveat({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-accent',
  display: 'swap',
});

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: 'Business Security Alliance - the professional network for the security industry',
    template: '%s · BSA',
  },
  description:
    'BSA is a professional association for the security industry. Find and connect with practitioners, leaders and consultants, attend industry events, join a regional chapter, and discover business opportunities.',
  keywords: [
    'security industry association',
    'security professionals network',
    'security member directory',
    'security industry events',
    'security consultants',
    'corporate security professionals',
  ],
  openGraph: {
    title: 'Business Security Alliance',
    description:
      'The professional network for the security industry - member directory, industry events, regional chapters and business opportunities.',
    url: env.appUrl,
    siteName: 'Business Security Alliance',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Business Security Alliance',
    description: 'The professional network for the security industry.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#F1F2F4',
  colorScheme: 'light dark',
};

/** Reads the signed-in member's nav summary. Null when signed out. */
async function loadNavSession(): Promise<NavSession | null> {
  const session = await getSession();
  if (!session) return null;

  const profile = await prisma.memberProfile.findUnique({
    where: { userId: session.userId },
    select: { handle: true, fullName: true },
  });

  if (!profile) return null;

  return {
    role: session.role,
    handle: profile.handle,
    name: profile.fullName,
    initials: initials(profile.fullName),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const navSession = await loadNavSession();

  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable} ${accent.variable}`}>
      <body className="flex min-h-[100dvh] flex-col bg-base font-sans text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-cyan focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-accent"
        >
          Skip to content
        </a>

        <ToastProvider>
          <Navbar session={navSession} />
          <main id="main" className="flex-grow">
            {children}
          </main>
          <Footer />
        </ToastProvider>

        <Grain />
      </body>
    </html>
  );
}
