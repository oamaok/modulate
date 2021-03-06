import { h, useEffect } from 'kaiku'
import { getRegisteredSocket, getSockets } from '../../sockets'
import { getSocketPosition } from '../../state'
import { ConnectedSocket } from '../../../../common/types'
import CablePath from './CablePath'
import UtilityBox from '../utility-box/UtilityBox'

type Props = {
  from: ConnectedSocket
  to: ConnectedSocket
}

const Cable = ({ from, to }: Props) => {
  useEffect(() => {
    const outputSocket = getRegisteredSocket(from.moduleId, from.name)
    const inputSocket = getRegisteredSocket(to.moduleId, to.name)

    if (outputSocket.type === 'input') {
      throw new Error('invalid outputSocket type')
    }

    if (inputSocket.type === 'output') {
      throw new Error('invalid inputSocket type')
    }

    if (inputSocket.node instanceof AudioNode) {
      outputSocket.node.connect(
        inputSocket.node,
        outputSocket.output,
        inputSocket.input
      )
    } else {
      outputSocket.node.connect(inputSocket.node, outputSocket.output)
    }

    return () => {
      const outputSocket = getRegisteredSocket(from.moduleId, from.name)
      const inputSocket = getRegisteredSocket(to.moduleId, to.name)

      if (outputSocket.type === 'input') {
        throw new Error('invalid outputSocket type')
      }

      if (inputSocket.type === 'output') {
        throw new Error('invalid inputSocket type')
      }

      if (inputSocket.node instanceof AudioNode) {
        outputSocket.node.disconnect(
          inputSocket.node,
          outputSocket.output,
          inputSocket.input
        )
      } else {
        outputSocket.node.disconnect(inputSocket.node, outputSocket.output)
      }
    }
  })

  const fromPos = getSocketPosition(from)
  const toPos = getSocketPosition(to)

  if (!fromPos || !toPos) return null

  return (
    <CablePath
      from={fromPos}
      to={toPos}
      onHover={() => {
        const outputSocket = getRegisteredSocket(from.moduleId, from.name)
        outputSocket.node.connect(UtilityBox.node, outputSocket.output)
      }}
      onBlur={() => {
        const outputSocket = getRegisteredSocket(from.moduleId, from.name)
        outputSocket.node.disconnect(UtilityBox.node, outputSocket.output)
      }}
    />
  )
}

export default Cable
