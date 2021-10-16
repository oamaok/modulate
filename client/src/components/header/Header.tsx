import { h } from 'kaiku'
import { patch } from '../../state'
import MenuBar, { VerticalDivider } from '../menu-bar/MenuBar'
import classNames from 'classnames/bind'
import styles from './header.css'
import * as api from '../../api'

const css = classNames.bind(styles)

const Header = () => {
  const savePatch = async () => {
    const res = await api.saveNewPatch(patch)

    history.pushState({}, '', `/patch/${res.id}`)
  }

  return (
    <MenuBar top left>
      <h2 className={css('brand')}>modulate</h2>
      <div className={css('patch-details')}>
        <div className="">Patch name</div>
        <input type="text" value="untitled" />
      </div>

      <VerticalDivider />
      <button onClick={savePatch}>save patch</button>

      <VerticalDivider />
      <button onClick={savePatch}>new patch</button>
      <VerticalDivider />
      <button onClick={savePatch}>my patches</button>
      <VerticalDivider />
      <button onClick={savePatch}>browse all patches</button>
    </MenuBar>
  )
}

export default Header
