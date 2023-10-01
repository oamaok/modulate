import { useEffect } from 'kaiku'
import Header from '../header/Header'
import css from './App.css'
import UserBar from '../user-bar/UserBar'
import Patch from '../patch/Patch'
import Hint from '../hint/Hint'
import { initializeEngine } from '../../engine'
import state, { closeOverlay, loadPatch, patch } from '../../state'
import * as api from '../../api'
import { joinRoom } from '../../rooms'
import Performance from '../performance/Performance'
import ContextMenu from '../context-menu/ContextMenu'
import LoginForm from '../login-form/LoginForm'
import PatchBrowser from '../patch-browser/PatchBrowser'
import PatchSettings from '../patch-settings/PatchSettings'
import SaveDialog from '../save-dialog/SaveDialog'
import Overlay from '../overlay/Overlay'

const loadSaveState = async () => {
  const rawSaveState = localStorage.getItem('savestate')
  if (rawSaveState) {
    const savedPatch = JSON.parse(rawSaveState)
    loadPatch(savedPatch.metadata, savedPatch.patch)
  } else {
    state.initialized = true
  }
}

const initialize = async () => {
  closeOverlay()
  await initializeEngine()

  switch (state.route.name) {
    case 'index': {
      await loadSaveState()
      break
    }

    case 'patch': {
      const patchVersion = await api.getLatestPatchVersion(state.route.patchId)

      if (!patchVersion) {
        history.replaceState({}, '', '/')
        loadSaveState()
      } else {
        loadPatch(patchVersion.metadata, patchVersion.patch)
      }

      break
    }

    case 'room': {
      joinRoom(state.route.roomId)
    }
  }
}

const initOnEnter = (evt: KeyboardEvent) => {
  if (evt.key === 'Enter') {
    initialize()
    document.removeEventListener('keydown', initOnEnter)
  }
}

document.addEventListener('keydown', initOnEnter)

const InitModal = () => {
  return (
    <Overlay className={css('init-modal')} showCloseButton={false}>
      Please adjust your audio levels before continuing. This application is
      capable of producing ear-busting sonic experiences.
      <button onClick={initialize}>I'm ready!</button>
    </Overlay>
  )
}

const App = () => {
  useEffect(() => {
    if (!state.initialized) return
    if (state.route.name !== 'index') return
    localStorage.setItem(
      'savestate',
      JSON.stringify({
        metadata: state.patchMetadata,
        patch,
      })
    )
  })

  const OverlayComponent = {
    none: null,
    init: InitModal,
    login: LoginForm,
    'patch-browser': PatchBrowser,
    'patch-settings': PatchSettings,
  }[state.overlay]

  return (
    <div
      className={css('app')}
      style={{
        backgroundPosition: () =>
          `${Math.round(state.viewOffset.x / 1.5)}px ${Math.round(
            state.viewOffset.y / 1.5
          )}px`,
      }}
    >
      <Header />
      {state.initialized ? <Performance /> : null}
      <Patch />
      <Header />
      <UserBar />
      <Hint />
      <ContextMenu />
      {OverlayComponent ? <OverlayComponent /> : null}
      <SaveDialog />
    </div>
  )
}

export default App
