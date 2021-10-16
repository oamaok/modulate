import { h } from 'kaiku'
import { viewport, patch } from '../../state'

import ActiveCable from './ActiveCable'
import Cable from './Cable'
import classNames from 'classnames/bind'
import styles from './Cables.css'

const css = classNames.bind(styles)

const Cables = () => (
  <div className={css('cables')}>
    <svg viewBox={`0 0 ${viewport.width} ${viewport.height}`}>
      {patch.cables.map(({ id, from, to }) => (
        <Cable key={id} from={from} to={to} />
      ))}
      <ActiveCable />
    </svg>
  </div>
)

export default Cables
