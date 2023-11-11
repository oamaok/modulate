import { Child, FC, createState, useEffect, immutable } from 'kaiku'

const portals = createState<Record<number, Child>>({})

let nextId = 0
const createPortal = () => {
  const id = nextId++
  const Entry: FC<{}> = ({ children }) => {
    portals[id] = immutable(children as any)
    useEffect(() => () => {
      portals[id] = null
      delete portals[id]
    })

    return null
  }

  const Exit: FC<{}> = () => {
    const children = portals[id]
    return <>{children}</>
  }

  return { Entry, Exit }
}

export const PianoRollEditorPortal = createPortal()
