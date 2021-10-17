import { h, useState } from 'kaiku'
import state, { patchDetails, patch } from '../../state'
import MenuBar, { VerticalDivider } from '../menu-bar/MenuBar'
import classNames from 'classnames/bind'
import styles from './header.css'
import * as api from '../../api'

const css = classNames.bind(styles)

const Menu = () => {
  return (
    <div className={css('menu')}>
      <div className={css('item')}>Save patch</div>
      <div className={css('item')}>New patch</div>
      <div className={css('item')}>My patches</div>
      <div className={css('item')}>Browse all patches</div>
    </div>
  )
}

const Header = () => {
  const headerState = useState({ isMenuOpen: false })

  const savePatch = async () => {
    const res = await api.saveNewPatch(patch)

    history.pushState({}, '', `/patch/${res.id}`)
  }

  const openMenu = () => {}

  const patchAuthor =
    patchDetails.author?.username ?? state.user?.username ?? 'anonymous'

  return (
    <MenuBar top left>
      <h2 className={css('brand')}>modulate</h2>
      <button
        onClick={() => {
          headerState.isMenuOpen = !headerState.isMenuOpen
        }}
        className={css('menu-button')}
      >
        ☰
      </button>
      <VerticalDivider />
      <div className={css('patch-name')}>
        Patch:
        <i>
          {patchDetails.name} — {patchAuthor}
        </i>
      </div>

      {headerState.isMenuOpen && <Menu />}
    </MenuBar>
  )
}

export default Header
