import { disconnectCable, getSocketPosition } from '../../state'
import { Cable } from '@modulate/common/types'
import CablePath from './CablePath'

type Props = {
  key: any
  cable: Cable
}

const Cable = ({ cable }: Props) => {
  const fromPos = getSocketPosition(cable.from)
  const toPos = getSocketPosition(cable.to)

  if (!fromPos || !toPos) return null

  return (
    <CablePath
      from={fromPos}
      to={toPos}
      onDoubleClick={(evt: MouseEvent) => {
        // Prevent context menu from popping up by stopping propagation
        evt.stopPropagation()
        disconnectCable(cable)
      }}
      onHover={() => {
        // TODO: Utility box
      }}
      onBlur={() => {
        // TODO: Utility box
      }}
      {...(__DEBUG__ ? { cable } : undefined)}
    />
  )
}

export default Cable
