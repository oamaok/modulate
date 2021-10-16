import { h } from 'kaiku'
import { Vec2 } from '../../../../common/types'

type Props = {
  from: Vec2
  to: Vec2
}

const CablePath = ({ from, to }: Props) => {
  const controlPointOffset = Math.floor(Math.sqrt(Math.abs(from.y - to.y)) * 10)

  return (
    <path
      d={`
        M ${from.x} ${from.y}
        C ${from.x + controlPointOffset} ${from.y}
          ${to.x - controlPointOffset} ${to.y}
          ${to.x} ${to.y}
      `}
      stroke-width="3"
      stroke-linecap="round"
      stroke="rgba(0,0,0,0.5)"
      fill="transparent"
    />
  )
}

export default CablePath
