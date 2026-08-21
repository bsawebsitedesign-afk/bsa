import { prisma } from '@/lib/prisma';

export function parseDeviceSignature(userAgent: string | null): string {
  if (!userAgent) return 'Unknown Device';

  let browser = 'Browser';
  if (userAgent.includes('Firefox/')) browser = 'Firefox';
  else if (userAgent.includes('Edg/')) browser = 'Microsoft Edge';
  else if (userAgent.includes('Chrome/')) browser = 'Chrome';
  else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) browser = 'Safari';
  else if (userAgent.includes('OPR/') || userAgent.includes('Opera/')) browser = 'Opera';

  let os = 'Device';
  if (userAgent.includes('iPhone')) os = 'iPhone (iOS)';
  else if (userAgent.includes('iPad')) os = 'iPad (iPadOS)';
  else if (userAgent.includes('Android')) os = 'Android Device';
  else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS X')) os = 'macOS';
  else if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Linux')) os = 'Linux';

  return `${browser} on ${os}`;
}

export async function detectAndNotifyNewDevice(userId: string, req: Request): Promise<void> {
  try {
    const userAgent = req.headers.get('user-agent');
    const deviceName = parseDeviceSignature(userAgent);

    const profile = await prisma.memberProfile.findUnique({
      where: { userId },
      select: { id: true, knownDevices: true },
    });

    if (!profile) return;

    let known: string[] = [];
    try {
      known = JSON.parse(profile.knownDevices || '[]');
    } catch {
      known = [];
    }

    const isFirstDeviceEver = known.length === 0;
    const isNewDevice = !known.includes(deviceName);

    if (isNewDevice) {
      const updatedDevices = [...known, deviceName];
      await prisma.memberProfile.update({
        where: { userId },
        data: { knownDevices: JSON.stringify(updatedDevices) },
      });

      // Send Security Sign-in Notification if it's a new device (not first-time registration)
      if (!isFirstDeviceEver) {
        await prisma.siteNotification.create({
          data: {
            title: '🔐 Security Alert: New Device Sign-In',
            message: `Your BSA account was just accessed from a new device: ${deviceName}. If this was not you, please change your password immediately.`,
            type: 'SECURITY',
            targetRole: 'ALL',
            createdById: userId,
          },
        });
      }
    }
  } catch {
    // Non-blocking background log
  }
}
