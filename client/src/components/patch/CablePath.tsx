import { h, Fragment, useState } from 'kaiku'
import { Vec2 } from '@modulate/common/types'

type Props = {
  from: Vec2
  to: Vec2
  onHover?: () => void
  onBlur?: () => void
}

const CablePath = ({ from, to, onHover, onBlur }: Props) => {
  const state = useState({ hover: false })

  const controlPointOffset = Math.floor(Math.sqrt(Math.abs(from.y - to.y)) * 10)

  return (
    <>
      <path
        d={`
        M ${from.x} ${from.y}
        C ${from.x + controlPointOffset} ${from.y}
          ${to.x - controlPointOffset} ${to.y}
          ${to.x} ${to.y}
      `}
        stroke-width={state.hover ? 5 : 3}
        stroke-linecap="round"
        stroke={state.hover ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)'}
        fill="transparent"
        pointer-events="none"
      />
      <path
        d={`
        M ${from.x} ${from.y}
        C ${from.x + controlPointOffset} ${from.y}
          ${to.x - controlPointOffset} ${to.y}
          ${to.x} ${to.y}
        C ${to.x - controlPointOffset} ${to.y}
          ${from.x + controlPointOffset} ${from.y}
          ${from.x} ${from.y}
      `}
        onMouseOver={() => {
          state.hover = true
          onHover?.()
        }}
        onMouseOut={() => {
          state.hover = false
          onBlur?.()
        }}
        stroke-width="24"
        stroke-linecap="round"
        stroke="transparent"
        fill="transparent"
      />
    </>
  )
}

export default CablePath
