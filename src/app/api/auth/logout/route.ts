import { clearSessionCookie } from '@/lib/auth';
import { route, jsonOk } from '@/lib/api';

export const POST = route(async () => {
  clearSessionCookie();
  return jsonOk();
});
