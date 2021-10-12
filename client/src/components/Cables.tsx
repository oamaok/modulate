import { h } from 'kaiku'
import state from '../state'

import ActiveCable from './ActiveCable'
import Cable from './Cable'

const Cables = () => (
  <div className="cables">
    <svg viewBox={`0 0 ${state.viewport.width} ${state.viewport.height}`}>
      {state.cables.map(({ id, from, to }) => (
        <Cable key={id} from={from.socket} to={to.socket} />
      ))}
      <ActiveCable />
    </svg>
  </div>
)

export default Cables
