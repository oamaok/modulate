import * as auth from './auth'
import {
  Patch,
  PatchMetadata,
  UserLogin,
  UserRegistration,
} from '../../common/types'

type Method = 'GET' | 'POST'
type Options = {
  body?: any
  params?: Record<string, any>
}

const request = (
  method: Method,
  endpoint: string,
  { body, params }: Options
) => {
  const token = auth.get()

  const queryParams = params
    ? '?' +
      Object.keys(params)
        .map((key) => `${key}=${encodeURIComponent(params[key])}`)
        .join('&')
    : ''

  return fetch(endpoint + queryParams, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
  }).then((res) => res.json())
}

const get = (endpoint: string, options?: Options) => {
  return request('GET', endpoint, { ...options })
}

const post = (endpoint: string, options?: Options) => {
  return request('POST', endpoint, { ...options })
}

export const getIdentity = () => {
  return get('/api/identity')
}

export const savePatch = (metadata: PatchMetadata, patch: Patch) => {
  return post('/api/patch', { body: { metadata, patch } })
}

export const getCredentialsAvailability = ({
  username,
  email,
}: {
  username: string
  email: string
}): Promise<{ username: boolean; email: boolean }> => {
  return get('/api/user/availability', { params: { username, email } })
}

export const register = (registration: UserRegistration) => {
  return post('/api/user', {
    body: registration,
  })
}

export const login = (userLogin: UserLogin) => {
  return post('/api/user/login', {
    body: userLogin,
  })
}

export const getLatestPatchVersion = (patchId: string) => {
  return get(`/api/patch/${patchId}/latest`)
}
