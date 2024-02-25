import { useEffect, useState } from 'kaiku'
import state, { openOverlay } from '../../state'
import * as auth from '../../auth'
import * as engine from '../../engine'
import MenuBar, { VerticalDivider } from '../menu-bar/MenuBar'
import * as styles from './UserBar.css'
import ControlledKnob from '../module-parts/ControlledKnob'
import testAttributes from '../../test-attributes'
import * as icon from '../../icons'
import Icon from '../icon/Icon'

const getVolumeIcon = (level: number) => {
  if (level > 0.66) return icon.volumeUp
  if (level > 0.33) return icon.volumeDown
  if (level > 0.001) return icon.volumeMute
  return icon.volumeOff
}

const initialVolumeLevel = parseFloat(
  localStorage.getItem('volume-level') ?? '0.8'
)

const GlobalVolume = () => {
  const volumeState = useState({
    level: initialVolumeLevel,
  })

  useEffect(() => {
    if (state.initialized) {
      engine.setGlobalVolume(initialVolumeLevel)
    }
  })

  return (
    <div class={styles.globalVolume}>
      <Icon name={getVolumeIcon(volumeState.level)} />
      <ControlledKnob
        size="s"
        label="Global volume"
        hideLabel
        type="percentage"
        initial={initialVolumeLevel}
        value={volumeState.level}
        onChange={(value) => {
          volumeState.level = value
          engine.setGlobalVolume(value)
          localStorage.setItem('volume-level', value.toFixed(2))
        }}
      />
    </div>
  )
}

const UserBar = () => {
  return (
    <MenuBar className={styles.userBar} top right>
      <GlobalVolume />
      <VerticalDivider />
      {state.user ? (
        <>
          <button
            {...testAttributes({ id: 'logout' })}
            type="button"
            class={styles.loginButton}
            onClick={auth.reset}
          >
            Logout
          </button>
        </>
      ) : (
        <button
          {...testAttributes({ id: 'login' })}
          type="button"
          class={styles.loginButton}
          onClick={() => {
            openOverlay('login')
          }}
        >
          Login
        </button>
      )}
    </MenuBar>
  )
}

export default UserBar
