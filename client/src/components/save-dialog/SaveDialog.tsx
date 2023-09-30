import { useEffect, useState } from 'kaiku'
import { default as globalState } from '../../state'
import css from './SaveDialog.css'
import assert from '../../assert'
import * as api from '../../api'
import { JSX } from 'kaiku/jsx-runtime'
import Overlay from '../overlay/Overlay'

type SaveDialog = {
  (): JSX.Element<any> | null
  state: null | {
    open: boolean
    continue: (ok: boolean) => void
  }
  open: () => Promise<boolean>
}

const SaveDialog: SaveDialog = () => {
  const state = useState<{
    open: boolean
    continue: (ok: boolean) => void
  }>({
    open: false,
    continue: () => {},
  })

  useEffect(() => {
    assert(
      SaveDialog.state === null,
      'More than one SaveDialog instances present'
    )
    SaveDialog.state = state
  })

  const onCancel = () => {
    state.open = false
    state.continue(false)
  }

  const onDiscardChanges = () => {
    state.open = false
    state.continue(true)
  }

  const onSave = async () => {
    await api.savePatch(globalState.patchMetadata, globalState.patch)
    state.open = false
    state.continue(true)
  }

  if (!state.open) {
    return null
  }

  return (
    <Overlay className={css('save-dialog')} showCloseButton={false}>
      <h2>You have unsaved changes</h2>
      <hr />
      <div>Do you wish to save before continuing?</div>
      <div className={css('options')}>
        <button className={css('discard')} onClick={onDiscardChanges}>
          Discard changes
        </button>
        <button className={css('cancel')} onClick={onCancel}>
          Cancel
        </button>
        <button className={css('save')} onSave={onSave}>
          Save
        </button>
      </div>
    </Overlay>
  )
}

SaveDialog.state = null

SaveDialog.open = () =>
  new Promise((resolve) => {
    assert(SaveDialog.state, 'SaveDialog.open called before initialization')
    SaveDialog.state.open = true
    SaveDialog.state.continue = resolve
  })

export default SaveDialog
