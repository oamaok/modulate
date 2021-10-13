import { h } from 'kaiku'
import { viewport, patch } from '../state'

import ActiveCable from './ActiveCable'
import Cable from './Cable'

const Cables = () => (
  <div className="cables">
    <svg viewBox={`0 0 ${viewport.width} ${viewport.height}`}>
      {patch.cables.map(({ id, from, to }) => (
        <Cable key={id} from={from} to={to} />
      ))}
      <ActiveCable />
    </svg>
  </div>
)

export default Cables
