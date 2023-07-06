import { h, useEffect } from 'kaiku'
import state, {
  getCableConnectionCandidate,
  getSocketPosition,
  releaseActiveCable,
} from '../../state'
import CablePath from './CablePath'
import assert from '../../assert'

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

  const a = getSocketPosition(state.activeCable.draggingFrom)
  const b = candidateSocket
    ? getSocketPosition(candidateSocket)
    : {
        x: state.cursor.x - state.viewOffset.x,
        y: state.cursor.y - state.viewOffset.y,
      }

  assert(a, 'state.activeCable.from is not a valid socket')
  assert(b, 'candidateSocket is not a valid socket')

  const [from, to] =
    state.activeCable.draggingFrom.type === 'output' ? [a, b] : [b, a]

  return <CablePath isActive from={from} to={to} />
}

export default ActiveCable
