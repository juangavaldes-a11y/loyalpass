import 'server-only';

import { env } from '@/config/env';
import { backendRequestWithBaseUrl } from './backendCore';

export async function backendRequest(path, config = {}) {
  return backendRequestWithBaseUrl(env.apiBaseUrl, path, config);
}
