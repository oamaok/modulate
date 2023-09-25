import { useEffect } from 'kaiku'
import state, { getModuleKnobs } from '../../state'
import * as api from '../../api'
import * as auth from '../../auth'
import * as engine from '../../engine'
import MenuBar, { VerticalDivider } from '../menu-bar/MenuBar'
import css from './UserBar.css'
import Knob from '../module-parts/Knob'

const GlobalVolume = () => {
  useEffect(() => {
    if (!state.initialized) return

    const knobs = getModuleKnobs('global-volume')
    const knobValue = knobs?.gain

    if (typeof knobValue !== 'undefined') {
      const audioContext = engine.getAudioContext()
      const gain = engine.getGain().gain
      gain.setTargetAtTime(knobValue, audioContext.currentTime, 0.01)
    }
  })

  return (
    <div className={css('global-volume')}>
      Volume
      <Knob
        moduleId="global-volume"
        id="gain"
        label="Global volume"
        hideLabel
        type="percentage"
        initial={0.8}
      />
    </div>
  )
}

const UserBar = () => {
  return (
    <MenuBar top right>
      <GlobalVolume />
      <VerticalDivider />
      {state.user ? (
        <>
          <div>
            Logged in as <b>{state.user.username}</b>
          </div>
          <button
            type="button"
            className={css('login-button')}
            onClick={auth.reset}
          >
            Logout
          </button>
        </>
      ) : (
        <button
          type="button"
          className={css('login-button')}
          onClick={() => {
            state.overlay = 'login'
          }}
        >
          Login
        </button>
      )}
    </MenuBar>
  )
}

export default UserBar
