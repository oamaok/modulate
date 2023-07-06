import { h, Fragment, useState } from 'kaiku'
import { Vec2 } from '@modulate/common/types'

type Props = {
  from: Vec2
  to: Vec2
  isActive?: boolean
  onHover?: () => void
  onBlur?: () => void
}

const CablePath = ({ from, to, onHover, onBlur, isActive = false }: Props) => {
  const state = useState({ hover: false })
  const controlPointOffsetY =
    Math.sqrt(Math.max(100 - Math.abs(from.y - to.y), 0)) *
    10 *
    Math.min(Math.sqrt(Math.abs(Math.max(from.x - to.x, 0))) * 0.05, 1)
  const controlPointOffsetX =
    Math.floor(Math.sqrt(Math.abs(from.y - to.y)) * 10) +
    controlPointOffsetY * 1.5

  return (
    <>
      <path
        d={`
        M ${from.x} ${from.y}
        C ${from.x + controlPointOffsetX} ${from.y + controlPointOffsetY}
          ${to.x - controlPointOffsetX} ${to.y + controlPointOffsetY}
          ${to.x} ${to.y}
      `}
        stroke-width={isActive || state.hover ? 5 : 3}
        stroke-linecap="round"
        stroke={
          isActive || state.hover
            ? 'rgba(255,255,255,0.8)'
            : 'rgba(255,255,255,0.4)'
        }
        fill="transparent"
        pointer-events="none"
      />
      <path
        d={`
        M ${from.x} ${from.y}
        C ${from.x + controlPointOffsetX} ${from.y + controlPointOffsetY}
          ${to.x - controlPointOffsetX} ${to.y + controlPointOffsetY}
          ${to.x} ${to.y}
        C ${to.x - controlPointOffsetX} ${to.y + controlPointOffsetY}
          ${from.x + controlPointOffsetX} ${from.y + controlPointOffsetY}
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
