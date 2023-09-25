import { useEffect, useRef, useState } from 'kaiku'
import {
  getSocket,
  plugActiveCable,
  registerSocket,
  setSocketPosition,
} from '../../state'
import { IndexOf, Vec2 } from '@modulate/common/types'
import css from './Socket.css'
import assert from '../../assert'
import { Module } from '@modulate/worklets/src/modules'

const getSocketOffset = (
  element: HTMLElement,
  pos: Vec2 = { x: 0, y: 0 }
): Vec2 => {
  const x = element.offsetLeft
  const y = element.offsetTop

  assert(
    element.offsetParent,
    'getSocketOffset: socket is not positioned within a Module component'
  )

  if (element.offsetParent.getAttribute('data-id')) {
    return { x: pos.x + x, y: pos.y + y }
  }

  return getSocketOffset(element.offsetParent as HTMLElement, {
    x: pos.x + x,
    y: pos.y + y,
  })
}

type Props<
  M extends Module,
  T extends 'input' | 'output' | 'parameter',
  N extends M[`${T}s`][number]
> = {
  type: T
  index: IndexOf<M[`${T}s`], N>
  label: string
  moduleId: string
}

const Socket = <
  M extends Module,
  T extends 'input' | 'output' | 'parameter',
  N extends M[`${T}s`][number]
>(
  props: Props<M, T, N>
) => {
  const { label, moduleId, index, type } = props
  const ref = useRef<HTMLDivElement>()
  const socketState = useState<{ positionSet: boolean }>({ positionSet: false })

  const onMouseDown = (evt: MouseEvent) => {
    evt.preventDefault()
    plugActiveCable({ moduleId, index, type })
  }

  useEffect(() => {
    if (!getSocket({ moduleId, type, index }))
      registerSocket({ moduleId, type, index })
  })

  useEffect(() => {
    if (ref.current && !socketState.positionSet) {
      socketState.positionSet = true
      const offset = getSocketOffset(ref.current)
      const { width, height } = ref.current.getBoundingClientRect()

      setSocketPosition(
        { moduleId, type, index },
        {
          x: offset.x + width / 2,
          y: offset.y + height / 2,
        }
      )
    }
  })

  return (
    <div className={css(['socket-wrapper', `socket-${type}`])}>
      <div ref={ref} className={css('socket')} onMouseDown={onMouseDown} />
      <div className={css('socket-name')}>{label}</div>
    </div>
  )
}

export default Socket
