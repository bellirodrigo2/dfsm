import type { UserInfo } from '../domain/user'
import type { PiWebApiUserInfo } from './types'
import { piWebApiRequest, type PiWebApiClientOptions } from './client'

/**
 * Fetch user info from PI Web API
 */
export async function getUserInfo(options?: PiWebApiClientOptions): Promise<UserInfo> {
  const raw = await piWebApiRequest<PiWebApiUserInfo>('system/userinfo', options)
  return normalizeUserInfo(raw)
}

function normalizeUserInfo(raw: PiWebApiUserInfo): UserInfo {
  return {
    identityType: raw.IdentityType,
    name: raw.Name,
    isAuthenticated: raw.IsAuthenticated,
    sid: raw.SID,
  }
}
