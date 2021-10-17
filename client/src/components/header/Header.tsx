import { h, useState, Fragment } from 'kaiku'
import state, { patch } from '../../state'
import MenuBar, { VerticalDivider } from '../menu-bar/MenuBar'
import classNames from 'classnames/bind'
import styles from './header.css'
import * as api from '../../api'

const css = classNames.bind(styles)

const Menu = () => {
  const savePatch = async () => {
    const res = await api.savePatch(patch)

    history.pushState({}, '', `/patch/${res.id}`)
  }

  const isOwnPatch =
    state.route.name === 'index' ||
    (state.user && state.user.id === patch.metadata.author?.id)

  return (
    <div className={css('menu')}>
      {isOwnPatch && (
        <div className={css('patch-settings')}>
          <div className={css('name')}>
            Patch name
            <input
              type="text"
              value={patch.metadata.name}
              onInput={(evt) => {
                patch.metadata.name = evt.target.value
              }}
            />
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
    patch.metadata.author?.username ?? state.user?.username ?? 'anonymous'

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
          <b>{patch.metadata.name}</b> by <b>{patchAuthor}</b>
        </i>
      </div>

      {headerState.isMenuOpen && <Menu />}
    </MenuBar>
  )
}

export default Header
