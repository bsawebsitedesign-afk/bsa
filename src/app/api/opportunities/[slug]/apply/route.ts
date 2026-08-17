import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { applicationSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';
import { sendLeadToHubSpot } from '@/lib/hubspot';

export const POST = route(async (req, { params }: { params: { slug: string } }) => {
  guard(req, 'apply', LIMITS.form);

  const session = await getSession();
  const data = await readBody(req, applicationSchema);

  const opportunity = await prisma.opportunity.findUnique({
    where: { slug: params.slug },
    select: { id: true, title: true, org: true, isPublished: true, deadline: true },
  });

  if (!opportunity || !opportunity.isPublished) {
    throw new ApiError('That opening is no longer listed.', 404);
  }

  if (opportunity.deadline && opportunity.deadline < new Date()) {
    throw new ApiError('Applications for this one have closed.', 409);
  }

  const duplicate = await prisma.application.findUnique({
    where: { opportunityId_email: { opportunityId: opportunity.id, email: data.email } },
    select: { id: true },
  });
  if (duplicate) {
    throw new ApiError('You have already applied to this one.', 409);
  }

  const application = await prisma.application.create({
    data: {
      opportunityId: opportunity.id,
      userId: session?.userId ?? null,
      name: data.name,
      email: data.email,
      org: data.org,
      profileUrl: data.profileUrl,
      note: data.note,
    },
    select: { id: true },
  });

  // Mirror into the lead inbox so admins see applications alongside enquiries.
  const crm = await sendLeadToHubSpot({
    email: data.email,
    name: data.name,
    company: opportunity.org,
    formType: 'EVENT_LEAD',
    message: `Applied to ${opportunity.title} at ${opportunity.org}`,
    source: 'opportunities',
  });

  await prisma.formSubmission.create({
    data: {
      userId: session?.userId ?? null,
      name: data.name,
      email: data.email,
      company: data.org || opportunity.org,
      formType: 'EVENT_LEAD',
      source: 'opportunities',
      message: `Applied to ${opportunity.title}${data.note ? ` - ${data.note}` : ''}`,
      metadataJson: JSON.stringify({ opportunityId: opportunity.id, applicationId: application.id }),
      hubspotStatus: crm.status,
      hubspotContactId: crm.contactId,
    },
  });

  return jsonOk({
    applicationId: application.id,
    message: 'Application received. The listing owner has been notified.',
  });
});
