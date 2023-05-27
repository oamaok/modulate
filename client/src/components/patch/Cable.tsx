import { h, useEffect } from 'kaiku'
import { getRegisteredSocket, getSockets } from '../../sockets'
import { getSocketPosition } from '../../state'
import { ConnectedSocket } from '@modulate/common/types'
import CablePath from './CablePath'
import UtilityBox from '../utility-box/UtilityBox'

type Props = {
  from: ConnectedSocket
  to: ConnectedSocket
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
        console.log(from, to)
        const outputSocket = getRegisteredSocket(from.moduleId, from.name)
        if (outputSocket.type === 'output')
          outputSocket.node.connect(UtilityBox.node, outputSocket.output)
      }}
      onBlur={() => {
        const outputSocket = getRegisteredSocket(from.moduleId, from.name)
        if (outputSocket.type === 'output')
          outputSocket.node.disconnect(
            UtilityBox.node as AudioNode,
            outputSocket.output as number
          )
      }}
    />
  )
}

export default Cable
