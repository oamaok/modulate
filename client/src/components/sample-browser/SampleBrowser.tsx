import { useEffect, useRef, useState } from 'kaiku'
import state from '../../state'
import * as api from '../../api'
import * as engine from '../../engine'
import * as styles from './SampleBrowser.css'

type Props = {
  onSelect: (id: string) => void
  selected: null | string
}

const SampleBrowser = ({ onSelect, selected }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>()
  const browserState = useState<{
    samples: {
      id: string
      name: string
      ownerId: string
    }[]
  }>({
    samples: [],
  })

  const fetchSamples = () => {
    api.getSamples().then((samples) => {
      browserState.samples = samples
    })
  }

  useEffect(() => {
    // Reload samples if user logs in or out
    if (state.user) {
      fetchSamples()
    } else {
      fetchSamples()
    }
  })

  const onFileChange = async (evt: InputEvent) => {
    const fileElement = evt.target! as HTMLInputElement
    const file = fileElement.files?.[0]
    if (file) {
      const buffer = (
        await engine.getAudioContext().decodeAudioData(await file.arrayBuffer())
      ).getChannelData(0)

      if (buffer.length > 44100 * 20) {
        // TODO: Tell user that the sample is too long
        return
      }

      const { id } = await api.saveSample(file.name, buffer)
      onSelect(id)
      fetchSamples()
    }
  }

  const addSample = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className={styles.sampleBrowser}>
      <input
        type="file"
        accept=".wav,.ogg,.mp3"
        className={styles.fileInput}
        ref={fileInputRef}
        onChange={onFileChange}
      />
      <div className={styles.samples}>
        {browserState.samples.map((sample) => (
          <button
            onClick={() => onSelect(sample.id)}
            className={{ [styles.selected]: selected === sample.id }}
          >
            {sample.name}
          </button>
        ))}
      </div>
      <div className={styles.controls}>
        {state.user ? (
          <button onClick={addSample}>add</button>
        ) : (
          <span>log in to add samples</span>
        )}
      </div>
    </div>
  )
}

export default SampleBrowser
