import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CommunityClient } from './community-client';

export const metadata: Metadata = {
  title: 'Community Hub & Member Chat | BSA',
  description: 'Connect and chat live with physical and cybersecurity executive leaders across the Business Security Alliance.',
};

export default async function CommunityPage() {
  const session = await getSession();

  // Compulsory login requirement for Community feature
  if (!session) {
    redirect('/login?redirect=/community');
  }

  let profile: any = null;
  try {
    profile = await prisma.memberProfile.findUnique({
      where: { userId: session.userId },
      select: { fullName: true },
    });
  } catch (err) {
    console.error('Community Page DB Error:', err);
  }

  return (
    <CommunityClient
      initialUser={{
        userId: session.userId,
        fullName: profile?.fullName || session.email,
        role: session.role,
      }}
    />
  );
}
