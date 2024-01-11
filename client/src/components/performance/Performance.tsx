import { useRef, useEffect } from 'kaiku'
import * as engine from '../../engine'
import * as styles from './Performance.css'
import assert from '../../assert'

const Performance = () => {
  const canvasRef = useRef<HTMLCanvasElement>()

  useEffect(() => {
    const interval = setInterval(() => {
      const canvas = canvasRef.current

      if (!canvas) return
      const width = canvas.width
      const height = canvas.height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      assert(context)

      const timers = engine.getWorkerTimers()
      let total = 0

      for (const sample of timers) {
        total += sample
      }

      total /= timers.length
      total /= 128 / engine.getAudioContext().sampleRate
      total /= 1000
      const imageData = context.getImageData(0, 0, width, height)
      context.clearRect(width - 1, 0, 1, height)
      context.putImageData(imageData, -1, 0)
      context.fillStyle = `hsl(${120 - total * 120}deg 80% 50%)`
      context.fillRect(width - 1, (1 - total) * height, 1, total * height)
    }, 50)

    return () => clearInterval(interval)
  })

  return (
    <canvas
      className={styles.performance}
      ref={canvasRef}
      width="200"
      height="100"
    />
  )
}

export default Performance
