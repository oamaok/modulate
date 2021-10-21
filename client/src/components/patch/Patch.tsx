import { h, Fragment, useState, useEffect, useRef, unwrap } from 'kaiku'
import state, { patch } from '../../state'
import { moduleMap } from '../../moduleMap'
import Cables from './Cables'
import { Vec2 } from '../../../../common/types'

import classNames from 'classnames/bind'
import styles from './Patch.css'

const css = classNames.bind(styles)

const Patch = () => {
  const patchState = useState<{
    dragPosition: null | Vec2
  }>({
    dragPosition: null,
  })

  const ref = useRef<HTMLDivElement>()

  const onDragStart = (evt: any) => {
    if (ref.current && evt.target === unwrap(ref.current as any)) {
      patchState.dragPosition = { x: state.cursor.x, y: state.cursor.y }
    }
  }

  const onDragEnd = () => {
    patchState.dragPosition = null
  }

  useEffect(() => {
    document.addEventListener('mouseup', onDragEnd)
    document.addEventListener('blur', onDragEnd)

    return () => {
      document.removeEventListener('mouseup', onDragEnd)
      document.removeEventListener('blur', onDragEnd)
    }
  })

  useEffect(() => {
    if (patchState.dragPosition) {
      state.viewOffset.x += state.cursor.x - patchState.dragPosition.x
      state.viewOffset.y += state.cursor.y - patchState.dragPosition.y
      patchState.dragPosition.x = state.cursor.x
      patchState.dragPosition.y = state.cursor.y
    }
  })
  return (
    <div className={css('patch')} onMouseDown={onDragStart} ref={ref}>
      <Cables />
      {Object.keys(patch.modules).map((id: string) => {
        const Component: any =
          moduleMap[patch.modules[id].name as keyof typeof moduleMap]
        return <Component key={id} id={id} />
      })}
    </div>
  )
}

export default Patch
