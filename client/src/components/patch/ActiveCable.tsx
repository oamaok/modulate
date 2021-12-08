import { h, useEffect } from 'kaiku'
import state, {
  getCableConnectionCandidate,
  getSocketPosition,
  releaseActiveCable,
} from '../../state'
import CablePath from './CablePath'

const ActiveCable = () => {
  useEffect(() => {
    if (state.activeCable) {
      document.addEventListener('mouseup', releaseActiveCable)

      return () => {
        document.removeEventListener('mouseup', releaseActiveCable)
      }
    }
  })

  if (!state.activeCable) return null

  const candidateSocket = getCableConnectionCandidate()

  const a = getSocketPosition(state.activeCable.from)
  const b = candidateSocket
    ? getSocketPosition(candidateSocket)
    : {
        x: state.cursor.x - state.viewOffset.x,
        y: state.cursor.y - state.viewOffset.y,
      }

  const from = state.activeCable.from.type === 'output' ? a : b
  const to = state.activeCable.from.type === 'output' ? b : a

  return <CablePath from={from!} to={to!} />
}

export default ActiveCable
