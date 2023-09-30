import { immutable, useEffect, useState } from 'kaiku'
import { loadPatch } from '../../state'
import * as api from '../../api'
import css from './PatchBrowser.css'
import Overlay from '../overlay/Overlay'

const YourPatches = () => {
  const state = useState<{
    patches: {
      id: string
      name: string
      version: number
      createdAt: string
    }[]
  }>({
    patches: [],
  })

  useEffect(() => {
    api.getMyPatches().then((patches) => {
      state.patches = immutable(patches)
    })
  })

  return (
    <div>
      {state.patches.map((patch) => (
        <div>
          name: {patch.name}
          id: {patch.id}
        </div>
      ))}
    </div>
  )
}

const PublicPatches = () => {
  const state = useState<{
    patches: {
      id: string
      authorName: string
      authorId: string
      name: string
      createdAt: number
    }[]
  }>({
    patches: [],
  })

  useEffect(() => {
    api.getPublicPatches().then((patches) => {
      state.patches = immutable(patches)
    })
  })

  const fetchAndLoadPatch = async (patchId: string) => {
    const patchData = await api.getLatestPatchVersion(patchId)

    loadPatch(patchData.metadata, patchData.patch)
  }

  return (
    <div className={css('patches')}>
      {state.patches.map((patch) => (
        <button
          id={patch.id}
          className={css('patch')}
          onClick={() => fetchAndLoadPatch(patch.id)}
        >
          <div>{patch.name}</div>
          <div>{patch.authorName}</div>
        </button>
      ))}
    </div>
  )
}

const PatchBrowser = () => {
  const state = useState<{
    tab: 'yours' | 'public'
  }>({
    tab: 'public',
  })

  const SelectedTab = {
    yours: YourPatches,
    public: PublicPatches,
  }[state.tab]

  return (
    <Overlay className={css('patch-browser')}>
      <div className={css('tabs')}>
        <button
          className={css('tab', { selected: state.tab === 'public' })}
          onClick={() => (state.tab = 'public')}
        >
          Public Patches
        </button>
        <button
          className={css('tab', { selected: state.tab === 'yours' })}
          onClick={() => (state.tab = 'yours')}
        >
          Your Patches
        </button>
      </div>
      <hr />
      <SelectedTab />
    </Overlay>
  )
}

export default PatchBrowser
