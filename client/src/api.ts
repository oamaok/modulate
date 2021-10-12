type Method = 'GET' | 'POST'
type Options = {
  body?: any
  params?: any
}

const request = (method: Method, endpoint: string, { body }: Options) => {
  const token = localStorage.getItem('token')

  return fetch(endpoint, {
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
