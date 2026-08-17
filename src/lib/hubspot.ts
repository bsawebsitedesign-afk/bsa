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
  company?: string;
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
  if (!env.hubspotApiKey) {
    return { success: false, status: 'SKIPPED' };
  }

  try {
    const [firstName, ...rest] = (payload.name || '').trim().split(/\s+/);

    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.hubspotApiKey}`,
      },
      body: JSON.stringify({
        properties: {
          email: payload.email,
          firstname: firstName || '',
          lastname: rest.join(' '),
          company: payload.company || '',
          hs_lead_status: 'NEW',
          message: payload.message || '',
          utm_source: payload.source || 'website',
          utm_campaign: payload.campaign || 'bsa_platform',
        },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error('[hubspot] rejected lead', res.status, await res.text());
      return { success: false, status: 'FAILED' };
    }

    const data = (await res.json()) as { id?: string };
    return { success: true, contactId: data.id, status: 'SYNCED' };
  } catch (err) {
    console.error('[hubspot] transport failure', err);
    return { success: false, status: 'FAILED' };
  }
}
