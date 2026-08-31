import { env } from './env';

/**
 * HubSpot CRM adapter for inbound leads.
 *
 * With no API key configured the lead is still persisted locally and marked
 * SKIPPED - we never claim a sync that did not happen.
 */

export interface LeadPayload {
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  country?: string;
  formType: string;
  message?: string;
  source?: string;
  campaign?: string;
}

export interface LeadResult {
  success: boolean;
  contactId?: string;
  status: 'SYNCED' | 'FAILED' | 'SKIPPED';
}

export async function sendLeadToHubSpot(payload: LeadPayload): Promise<LeadResult> {
  const portalId = '244660178';
  const formId = '2e72517f-e6e9-4f4e-a980-6bd95168fc04';

  try {
    const rawName = payload.name || `${payload.firstName || ''} ${payload.lastName || ''}`.trim();
    const [firstName, ...rest] = rawName.trim().split(/\s+/);

    const formattedMessage = `[Inquiry Topic: ${payload.formType}]\n\n${payload.message || ''}`.trim();

    if (env.hubspotApiKey) {
      const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.hubspotApiKey}`,
        },
        body: JSON.stringify({
          properties: {
            email: payload.email,
            firstname: firstName || payload.firstName || '',
            lastname: rest.join(' ') || payload.lastName || '',
            company: payload.company || '',
            jobtitle: payload.jobTitle || '',
            phone: payload.phone || '',
            country: payload.country || '',
            hs_lead_status: 'NEW',
            message: formattedMessage,
            utm_source: payload.source || 'website',
            utm_campaign: payload.campaign || payload.formType,
          },
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = (await res.json()) as { id?: string };
        return { success: true, contactId: data.id, status: 'SYNCED' };
      }
    }

    // Submit via HubSpot Forms V3 Integration API (No API Key Required)
    const formsRes = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: [
            { name: 'email', value: payload.email },
            { name: 'firstname', value: firstName || payload.firstName || '' },
            { name: 'lastname', value: rest.join(' ') || payload.lastName || '' },
            { name: 'company', value: payload.company || '' },
            { name: 'jobtitle', value: payload.jobTitle || '' },
            { name: 'phone', value: payload.phone || '' },
            { name: 'country', value: payload.country || '' },
            { name: 'message', value: formattedMessage },
            { name: 'subject', value: payload.formType },
          ],
          context: {
            pageUri: 'https://businesssecurityalliance.com/contact',
            pageName: 'BSA Contact',
          },
        }),
        signal: AbortSignal.timeout(8000),
      },
    );

    if (formsRes.ok) {
      return { success: true, status: 'SYNCED' };
    }

    return { success: false, status: 'FAILED' };
  } catch (err) {
    console.error('[hubspot] transport failure', err);
    return { success: false, status: 'FAILED' };
  }
}
