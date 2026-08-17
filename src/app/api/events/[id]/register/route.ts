import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { eventRegisterSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';
import { createCheckoutSession, generateRegistrationCode } from '@/lib/payment';
import { sendLeadToHubSpot } from '@/lib/hubspot';
import { sendEmail, ticketEmail } from '@/lib/email';
import { formatDate } from '@/lib/utils';

export const POST = route(async (req, { params }: { params: { id: string } }) => {
  guard(req, 'event-register', LIMITS.form);

  const session = await getSession();
  const data = await readBody(req, eventRegisterSchema);

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { tickets: true },
  });
  if (!event) throw new ApiError('That event does not exist.', 404);

  if (event.status === 'COMPLETED') throw new ApiError('This one has already wrapped.', 409);
  if (event.status === 'DRAFT') throw new ApiError('This event is not open yet.', 409);

  const ticket = event.tickets.find((t) => t.id === data.ticketId);
  if (!ticket) throw new ApiError('Pick a valid ticket.', 400);
  if (!ticket.isAvailable) throw new ApiError('That ticket type is closed.', 409);
  if (ticket.quantitySold >= ticket.quantityAvailable) {
    throw new ApiError('That ticket just sold out.', 409);
  }

  const confirmedCount = await prisma.eventRegistration.count({
    where: { eventId: event.id, status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] } },
  });
  if (confirmedCount >= event.maxCapacity) {
    throw new ApiError('This event is at capacity.', 409);
  }

  const duplicate = await prisma.eventRegistration.findUnique({
    where: { eventId_attendeeEmail: { eventId: event.id, attendeeEmail: data.email } },
    select: { id: true, registrationCode: true, status: true },
  });
  if (duplicate) {
    throw new ApiError(
      duplicate.status === 'PENDING_PAYMENT'
        ? 'You already started a booking for this - finish the payment from your dashboard.'
        : `You're already registered. Your code is ${duplicate.registrationCode}.`,
      409,
    );
  }

  const registrationCode = generateRegistrationCode();

  /* ----------------------------- Paid ticket ----------------------------- */
  if (ticket.price > 0) {
    const checkout = await createCheckoutSession({
      ticketId: ticket.id,
      ticketName: ticket.name,
      price: ticket.price,
      currency: ticket.currency,
      attendeeName: data.name,
      attendeeEmail: data.email,
      eventId: event.id,
      eventTitle: event.title,
    });

    // The seat is held as PENDING_PAYMENT and only counts once settled.
    await prisma.$transaction(async (tx) => {
      const registration = await tx.eventRegistration.create({
        data: {
          eventId: event.id,
          userId: session?.userId ?? null,
          ticketId: ticket.id,
          registrationCode,
          status: 'PENDING_PAYMENT',
          attendeeName: data.name,
          attendeeEmail: data.email,
          attendeeCompany: data.company,
        },
      });

      await tx.payment.create({
        data: {
          userId: session?.userId ?? null,
          eventRegistrationId: registration.id,
          amount: ticket.price,
          currency: ticket.currency,
          status: 'PENDING',
          provider: checkout.provider,
          transactionId: checkout.transactionId,
        },
      });
    });

    return jsonOk({
      paid: true,
      checkoutUrl: checkout.checkoutUrl,
      transactionId: checkout.transactionId,
      registrationCode,
    });
  }

  /* ----------------------------- Free ticket ----------------------------- */
  const registration = await prisma.$transaction(async (tx) => {
    const created = await tx.eventRegistration.create({
      data: {
        eventId: event.id,
        userId: session?.userId ?? null,
        ticketId: ticket.id,
        registrationCode,
        status: 'CONFIRMED',
        attendeeName: data.name,
        attendeeEmail: data.email,
        attendeeCompany: data.company,
      },
    });

    await tx.eventTicket.update({
      where: { id: ticket.id },
      data: { quantitySold: { increment: 1 } },
    });

    return created;
  });

  const crm = await sendLeadToHubSpot({
    email: data.email,
    name: data.name,
    company: data.company,
    formType: 'EVENT_LEAD',
    message: `Registered for ${event.title} (${ticket.name})`,
    source: 'events',
  });

  await prisma.formSubmission.create({
    data: {
      userId: session?.userId ?? null,
      name: data.name,
      email: data.email,
      company: data.company,
      formType: 'EVENT_LEAD',
      source: 'events',
      message: `Registered for ${event.title} (${ticket.name})`,
      metadataJson: JSON.stringify({ eventId: event.id, registrationCode }),
      hubspotStatus: crm.status,
      hubspotContactId: crm.contactId,
    },
  });

  void sendEmail({
    to: data.email,
    subject: `You're in - ${event.title}`,
    html: ticketEmail(
      data.name,
      event.title,
      registrationCode,
      `${formatDate(event.eventDate)} · ${event.startTime}`,
      event.location,
    ),
  }).catch(() => undefined);

  return jsonOk({
    paid: false,
    registrationCode: registration.registrationCode,
    cpdHours: event.cpdHours,
  });
});
