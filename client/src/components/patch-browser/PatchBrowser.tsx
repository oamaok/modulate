import { immutable, useEffect, useState } from 'kaiku'
import { closeOverlay, loadPatch, resetPatch } from '../../state'
import * as api from '../../api'
import * as styles from './PatchBrowser.css'
import Overlay from '../overlay/Overlay'
import { groupBy } from '@modulate/common/util'
import assert from '../../assert'
import Icon from '../icon/Icon'

const fetchAndLoadPatch = async (patchId: string) => {
  const patchData = await api.getLatestPatchVersion(patchId)
  await resetPatch()
  history.pushState({}, '', `/patch/${patchData.metadata.id}`)
  loadPatch(patchData.metadata, patchData.patch)
  closeOverlay()
}

const formatPatchDate = (time: number) => {
  const date = new Date(time)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`
}

const YourPatches = () => {
  const state = useState<{
    patches: {
      id: string
      name: string
      version: number
      createdAt: number
    }[]
    expandedPatches: string[]
  }>({
    patches: [],
    expandedPatches: [],
  })

  useEffect(() => {
    api.getMyPatches().then((patches) => {
      state.patches = immutable(patches)
    })
  })

  const togglePatchExpansion = (patchId: string) => {
    const isExpanded = state.expandedPatches.includes(patchId)
    if (isExpanded) {
      state.expandedPatches = state.expandedPatches.filter(
        (id) => patchId !== id
      )
    } else {
      state.expandedPatches.push(patchId)
    }
  }

  const groupedPatches = groupBy(state.patches, (patch) => patch.id)

  return (
    <div className={styles.ownPatches}>
      {groupedPatches.map(([patchId, patches]) => {
        const isExpanded = state.expandedPatches.includes(patchId)
        const [firstPatch, ...rest] = patches
        assert(firstPatch)

        return (
          <div>
            <div className={styles.patch}>
              {rest.length !== 0 ? (
                <button onClick={() => togglePatchExpansion(patchId)}>
                  <Icon name={isExpanded ? 'expand_more' : 'chevron_right'} />
                </button>
              ) : null}
              <div className={styles.name}>{firstPatch.name}</div>
              <div className={styles.version}>
                Version #{firstPatch.version}
              </div>
              <div className={styles.date}>
                {formatPatchDate(firstPatch.createdAt)}
              </div>
              <button
                className={styles.load}
                onClick={() => fetchAndLoadPatch(patchId)}
              >
                <span>Load</span>
                <Icon name="play_arrow" />
              </button>
            </div>
            {isExpanded
              ? rest.map((patch) => (
                  <div className={[styles.patch, styles.version]}>
                    <div className={styles.name}>{patch.name}</div>
                    <div className={styles.version}>
                      Version #{patch.version}
                    </div>
                    <div className={styles.date}>
                      {formatPatchDate(patch.createdAt)}
                    </div>
                    <button
                      className={styles.load}
                      onClick={() => fetchAndLoadPatch(patchId)}
                    >
                      <span>Load</span>
                      <Icon name="play_arrow" />
                    </button>
                  </div>
                ))
              : null}
          </div>
        )
      })}
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

  return (
    <div className={styles.patches}>
      {state.patches.map((patch) => (
        <button
          className={styles.patch}
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
    tab: 'yours',
  })

  const SelectedTab = {
    yours: YourPatches,
    public: PublicPatches,
  }[state.tab]

  return (
    <Overlay className={styles.patchBrowser}>
      <div className={styles.tabs}>
        <button
          className={[
            styles.tab,
            { [styles.selected]: state.tab === 'public' },
          ]}
          onClick={() => (state.tab = 'public')}
        >
          Public Patches
        </button>
        <button
          className={[styles.tab, { [styles.selected]: state.tab === 'yours' }]}
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
