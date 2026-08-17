import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { LIMITS } from '@/lib/rate-limit';
import { verifyPaymentTransaction } from '@/lib/payment';
import { sendEmail, ticketEmail } from '@/lib/email';
import { formatDate } from '@/lib/utils';

const confirmSchema = z.object({
  transactionId: z.string().trim().min(6).max(80),
  outcome: z.enum(['SUCCESS', 'CANCEL']).default('SUCCESS'),
});

/**
 * Settles a checkout. With a real provider this is the webhook target - the
 * transaction is re-verified against the provider before anything is marked
 * paid, so a client cannot confirm its own payment by calling this directly.
 */
export const POST = route(async (req) => {
  guard(req, 'payment-confirm', LIMITS.write);

  const { transactionId, outcome } = await readBody(req, confirmSchema);

  const payment = await prisma.payment.findUnique({
    where: { transactionId },
    include: {
      eventRegistration: {
        include: { event: true, ticket: true },
      },
    },
  });

  if (!payment) throw new ApiError('We could not find that transaction.', 404);

  if (payment.status === 'COMPLETED') {
    return jsonOk({
      alreadySettled: true,
      registrationCode: payment.eventRegistration?.registrationCode,
    });
  }

  if (outcome === 'CANCEL') {
    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } }),
      ...(payment.eventRegistrationId
        ? [
            prisma.eventRegistration.update({
              where: { id: payment.eventRegistrationId },
              data: { status: 'CANCELLED' },
            }),
          ]
        : []),
    ]);
    return jsonOk({ cancelled: true });
  }

  const verification = await verifyPaymentTransaction(transactionId);
  if (!verification.verified) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    throw new ApiError('That payment could not be verified.', 402);
  }

  const registration = payment.eventRegistration;
  const session = await getSession();

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: 'COMPLETED' } });

    if (registration) {
      await tx.eventRegistration.update({
        where: { id: registration.id },
        data: { status: 'CONFIRMED' },
      });

      if (registration.ticketId) {
        await tx.eventTicket.update({
          where: { id: registration.ticketId },
          data: { quantitySold: { increment: 1 } },
        });
      }
    }
  });

  if (registration) {
    void sendEmail({
      to: registration.attendeeEmail,
      subject: `Ticket confirmed - ${registration.event.title}`,
      html: ticketEmail(
        registration.attendeeName,
        registration.event.title,
        registration.registrationCode,
        `${formatDate(registration.event.eventDate)} · ${registration.event.startTime}`,
        registration.event.location,
      ),
    }).catch(() => undefined);
  }

  return jsonOk({
    settled: true,
    registrationCode: registration?.registrationCode,
    eventId: registration?.eventId,
  });
});
