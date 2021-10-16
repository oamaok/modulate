import { Route } from './types'

export const parseRoute = (location: Location): Route => {
  const [, patchId] =
    location.pathname.match(
      /\/patch\/(\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b)/i
    ) || []

  if (patchId) {
    return { name: 'patch', patchId }
  }

  return { name: 'index' }
}
