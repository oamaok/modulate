import { useEffect, useRef, useShallowState } from 'kaiku'
import * as engine from '../engine'

const useModulePointers = (moduleId: string) => {
  const ref = useRef<Uint32Array | null>(null)

  useEffect(() => {
    engine.getModulePointers(moduleId).then((pointers) => {
      ref.current = pointers
    })
  })

  return ref
}

export default useModulePointers
