import { useEffect, useState } from 'kaiku'
import state, { openOverlay } from '../../state'
import * as auth from '../../auth'
import * as engine from '../../engine'
import MenuBar, { VerticalDivider } from '../menu-bar/MenuBar'
import css from './UserBar.css'
import ControlledKnob from '../module-parts/ControlledKnob'
import testAttributes from '../../test-attributes'
import Icon from '../icon/Icon'

const getVolumeIcon = (level: number) => {
  if (level > 0.66) return 'volume_up'
  if (level > 0.33) return 'volume_down'
  if (level > 0.001) return 'volume_mute'
  return 'no_sound'
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
    <div className={css('global-volume')}>
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
    <MenuBar className={css('user-bar')} top right>
      <GlobalVolume />
      <VerticalDivider />
      {state.user ? (
        <>
          <button
            {...testAttributes({ id: 'logout' })}
            type="button"
            className={css('login-button')}
            onClick={auth.reset}
          >
            Logout
          </button>
        </>
      ) : (
        <button
          {...testAttributes({ id: 'login' })}
          type="button"
          className={css('login-button')}
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
