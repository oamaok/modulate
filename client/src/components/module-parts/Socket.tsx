import { h, Fragment, useEffect, useRef } from 'kaiku'
import { plugActiveCable, setSocketPosition } from '../../state'
import {
  RegisteredSocket,
  registerSocket,
  unregisterSocket,
} from '../../sockets'
import { Vec2 } from '../../../../common/types'

import classNames from 'classnames/bind'
import styles from './Socket.css'
import UtilityBox from '../utility-box/UtilityBox'

const css = classNames.bind(styles)

const getSocketOffset = (
  element: HTMLElement,
  pos: Vec2 = { x: 0, y: 0 }
): Vec2 => {
  const x = element.offsetLeft
  const y = element.offsetTop

  if (!element.offsetParent) {
    throw new Error('Socket is not positioned within a Module component')
  }

  if (element.offsetParent.getAttribute('data-id')) {
    return { x: pos.x + x, y: pos.y + y }
  }

  return getSocketOffset(element.offsetParent as HTMLElement, {
    x: pos.x + x,
    y: pos.y + y,
  })
}

type Props = RegisteredSocket & {
  label?: string
}

const Socket = (props: Props) => {
  const { label, moduleId, type, name, node } = props
  const ref = useRef<HTMLDivElement>()

  useEffect(() => {
    registerSocket(props)
    return () => {
      unregisterSocket(moduleId, name)
    }
  })

  const onMouseDown = (evt: MouseEvent) => {
    evt.preventDefault()
    plugActiveCable({ moduleId, name, type })
  }

  useEffect(() => {
    if (ref.current) {
      const offset = getSocketOffset(ref.current)
      const { width, height } = ref.current.getBoundingClientRect()

      setSocketPosition(moduleId, name, {
        x: offset.x + width / 2,
        y: offset.y + height / 2,
      })
    }
  })

  return (
    <div className={css(['socket-wrapper', `socket-${type}`])}>
      <div
        ref={ref}
        className={css('socket')}
        onMouseDown={onMouseDown}
        onMouseOver={() => {
          if (type === 'output') node.connect(UtilityBox.node, props.output)
        }}
        onMouseOut={() => {
          if (type === 'output') node.disconnect(UtilityBox.node, props.output)
        }}
      />
      <div className={css('socket-name')}>{label ?? name}</div>
    </div>
  )
}

export default Socket
