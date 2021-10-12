import { h, useEffect } from 'kaiku'
import state, {
  getCableConnectionCandidate,
  getSocketPosition,
  releaseActiveCable,
} from '../state'
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

  const a = getSocketPosition(state.activeCable.from.socket)
  const b = candidateSocket ? getSocketPosition(candidateSocket) : state.cursor

  const from = state.activeCable.from.socket.type === 'output' ? a : b
  const to = state.activeCable.from.socket.type === 'output' ? b : a

  return <CablePath from={from} to={to} />
}

export default ActiveCable
