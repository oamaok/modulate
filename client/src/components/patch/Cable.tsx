import { h, useEffect } from 'kaiku'
import { getSocketPosition } from '../../state'
import { Socket } from '@modulate/common/types'
import CablePath from './CablePath'

type Props = {
  key: any
  from: Socket
  to: Socket
}

const Cable = ({ from, to }: Props) => {
  const fromPos = getSocketPosition(from)
  const toPos = getSocketPosition(to)

  if (!fromPos || !toPos) return null

  return (
    <CablePath
      from={fromPos}
      to={toPos}
      onHover={() => {
        // TODO: Utility box
      }}
      onBlur={() => {
        // TODO: Utility box
      }}
    />
  )
}

export default Cable
