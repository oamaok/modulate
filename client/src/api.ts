import * as auth from './auth'
import {
  Patch,
  PatchMetadata,
  UserLogin,
  UserRegistration,
} from '@modulate/common/types'

type Method = 'GET' | 'POST'
type Options = {
  body?: any
  params?: Record<string, any>
  headers?: Record<string, string>
}

const request = (
  method: Method,
  endpoint: string,
  { body, params, headers }: Options
) => {
  const token = auth.get()

  const queryParams = params
    ? '?' +
      Object.keys(params)
        .map((key) => `${key}=${encodeURIComponent(params[key])}`)
        .join('&')
    : ''

  const isFormData = body instanceof FormData

  return fetch(endpoint + queryParams, {
    method,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(isFormData && typeof body !== undefined
        ? {}
        : {
            'Content-Type': 'application/json',
          }),
      ...headers,
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

export const getRoomUsingPatch = (patchId: string) => {
  return get(`/api/room/${patchId}`)
}

export const saveSample = (
  name: string,
  buffer: Float32Array
): Promise<{ id: string; name: string }> => {
  const formData = new FormData()
  formData.append('name', name)
  formData.append('buffer', new Blob([buffer], { type: 'octet/stream' }))
  return post(`/api/sample`, { body: formData })
}

export const getSamples = () => get('/api/samples')
