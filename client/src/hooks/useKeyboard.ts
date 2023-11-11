import { useEffect } from 'kaiku'

type Handler = Record<string, () => void>
const handlers: Handler[] = []

const useKeyboard = (handler: Handler) => {
  useEffect(() => {
    handlers.push(handler)
    return () => handlers.pop()
  })
}

document.addEventListener('keydown', (evt) => {
  const handler = handlers[handlers.length - 1]
  if (handler) {
    const keyHandler = handler[evt.key]
    keyHandler?.()
  }
})

export default useKeyboard
