import { h, useState, Fragment } from 'kaiku'
import state, { patch } from '../../state'
import MenuBar, { VerticalDivider } from '../menu-bar/MenuBar'
import css from './Header.css'
import * as api from '../../api'


const Menu = () => {
  const savePatch = async () => {
    const res = await api.savePatch(state.patchMetadata, patch)

    history.pushState({}, '', `/patch/${res.id}`)
  }

  const isOwnPatch =
    state.route.name === 'index' ||
    (state.user && state.user.id === state.patchMetadata.author?.id)

  return (
    <div className={css('menu')}>
      {isOwnPatch && (
        <div className={css('patch-settings')}>
          <h3>Patch details</h3>
          <div className={css('name')}>
            <label for="patch-name">Name</label>
            <input
              id="patch-name"
              type="text"
              value={state.patchMetadata.name}
              onInput={(evt: any) => {
                state.patchMetadata.name = evt.target.value
              }}
            />
          </div>
          <div className={css('description')}>
            <label for="patch-description">Description</label>
            <textarea id="patch-description" />
          </div>
          <div className={css('is-public')}>
            <label for="patch-is-public">Public</label>
            <input id="patch-is-public" type="checkbox" />
          </div>
          <button className={css('item')} onClick={savePatch}>
            Save patch
          </button>
        </div>
      )}
      {/*
      <div className={css('item')}>New patch</div>
      <div className={css('item')}>My patches</div>
      <div className={css('item')}>Browse all patches</div>
      */}
    </div>
  )
}

const Header = () => {
  const headerState = useState({ isMenuOpen: false })
  const openMenu = () => {}

  const patchAuthor =
    state.patchMetadata.author?.username ?? state.user?.username ?? 'anonymous'

  return (
    <MenuBar top left>
      <h2 className={css('brand')}>modulate</h2>
      <button
        onClick={() => {
          headerState.isMenuOpen = !headerState.isMenuOpen
        }}
        className={css('menu-button')}
      >
        Patch
      </button>
      <VerticalDivider />
      <div className={css('patch-name')}>
        <i>
          <b>{state.patchMetadata.name}</b> by <b>{patchAuthor}</b>
        </i>
      </div>

      {headerState.isMenuOpen && <Menu />}
    </MenuBar>
  )
}

export default Header
