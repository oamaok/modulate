import { useEffect, useRef, useState } from 'kaiku'
import Header from '../header/Header'
import * as styles from './App.css'
import UserBar from '../user-bar/UserBar'
import Patch from '../patch/Patch'
import Hint from '../hint/Hint'
import { initializeEngine } from '../../engine'
import state, {
  closeOverlay,
  deleteModule,
  loadPatch,
  patch,
  resetPatch,
} from '../../state'
import * as api from '../../api'
import { joinRoom } from '../../rooms'
import Performance from '../performance/Performance'
import ContextMenu from '../context-menu/ContextMenu'
import LoginForm from '../login-form/LoginForm'
import PatchBrowser from '../patch-browser/PatchBrowser'
import PatchSettings from '../patch-settings/PatchSettings'
import SaveDialog from '../save-dialog/SaveDialog'
import Overlay from '../overlay/Overlay'
import testAttributes from '../../test-attributes'
import MiniMap from '../mini-map/MiniMap'
import PianoRollEditor from '../piano-roll-editor/PianoRollEditor'
import useKeyboard from '../../hooks/useKeyboard'
import { PianoRollEditorPortal } from '../../portals'

const loadSaveState = async () => {
  const rawSaveState = localStorage.getItem('savestate')
  if (rawSaveState) {
    try {
      const savedPatch = JSON.parse(rawSaveState)
      await loadPatch(savedPatch.metadata, savedPatch.patch)
    } catch (err) {
      localStorage.removeItem('savestate')
      await resetPatch()
      state.initialized = true
    }
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
        try {
          await loadPatch(patchVersion.metadata, patchVersion.patch)
        } catch (err) {
          history.replaceState({}, '', '/')
          resetPatch()
        }
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
    <Overlay className={styles.initModal} showCloseButton={false}>
      Please adjust your audio levels before continuing. This application is
      capable of producing ear-busting sonic experiences.
      <button onClick={initialize} {...testAttributes({ id: 'initialize' })}>
        I'm ready!
      </button>
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

  document.addEventListener('keydown', (evt) => {
    switch (evt.code) {
    }
  })

  useKeyboard({
    Delete: () => {
      if (state.activeModule) {
        deleteModule(state.activeModule)
        state.activeModule = null
      }
    },
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
      {...testAttributes({
        initialized: state.initialized.toString(),
        'is-room': (state.room !== null).toString(),
      })}
      className={styles.app}
      style={{
        backgroundPosition: () =>
          `${Math.round(state.viewOffset.x / 1.5)}px ${Math.round(
            state.viewOffset.y / 1.5
          )}px`,
      }}
    >
      <Header />
      {state.initialized ? <Performance /> : null}
      {state.initialized ? <MiniMap /> : null}
      <Patch />
      <UserBar />
      <Hint />
      <ContextMenu />
      {OverlayComponent ? <OverlayComponent /> : null}
      <SaveDialog />
      <PianoRollEditorPortal.Exit />
    </div>
  )
}

export default App
