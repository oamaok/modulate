import { h, useState, useRef, useEffect } from 'kaiku'
import * as engine from '../../engine'
import css from './Performance.css'

const Performance = () => {
  const canvasRef = useRef<HTMLCanvasElement>()

  useEffect(() => {
    const interval = setInterval(() => {
      const canvas = canvasRef.current

      if (!canvas) return
      const context = canvas.getContext('2d')!

      const timers = engine.getWorkerTimers()
      let total = 0

      for (const sample of timers) {
        total += sample
      }

      total /= timers.length
      total /= 128 / 44100
      total /= 1000
      const imageData = context.getImageData(0, 0, 200, 100)
      context.fillStyle = '#000'
      context.fillRect(199, 0, 1, 100)
      context.putImageData(imageData, -1, 0)
      context.fillStyle = `hsl(${120 - total * 120}deg 80% 50%)`
      context.fillRect(199, (1 - total) * 100, 1, total * 100)
    }, 100)

    return () => clearInterval(interval)
  })

  return (
    <canvas
      className={css('performance')}
      ref={canvasRef}
      width="200px"
      height="100px"
    />
  )
}

export default Performance
