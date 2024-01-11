import { useEffect, useState } from 'kaiku'

const useComputed = <T>(fn: () => T): T => {
  const state = useState({ value: undefined as T })

  useEffect(() => {
    state.value = fn()
  })

  return state.value
}

export default useComputed
