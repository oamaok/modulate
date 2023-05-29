import { Route } from './types'

export const parseRoute = (location: Location): Route => {
  {
    // Patch
    const [, patchId] =
      location.pathname.match(
        /^\/patch\/(\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b)$/i
      ) || []

    if (patchId) {
      return { name: 'patch', patchId }
    }
  }

  {
    // Room
    const [, roomId] =
      location.pathname.match(
        /^\/room\/(\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b)$/i
      ) || []

    if (roomId) {
      return { name: 'room', roomId }
    }
  }

  return { name: 'index' }
}
