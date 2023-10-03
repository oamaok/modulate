import state, {
  canUserSavePatch,
  isOwnPatch,
  openOverlay,
  resetPatch,
} from '../../state'
import * as api from '../../api'
import MenuBar from '../menu-bar/MenuBar'
import css from './Header.css'
import { intersperse } from '@modulate/common/util'
import SaveDialog from '../save-dialog/SaveDialog'
import { createRoom } from '../../rooms'
import testAttributes from '../../test-attributes'

type MenuIconProps = {
  icon: string
  label: string
  enabled: boolean
  onClick: () => void
}

const noop = () => {}

const MenuIcon = ({ icon, label, onClick, enabled }: MenuIconProps) => (
  <button
    {...testAttributes({ icon, label })}
    className={css('menu-icon', { enabled })}
    onClick={enabled ? onClick : noop}
  >
    <span className="material-symbols-outlined">{icon}</span>
    <div className={css('label')}>{label}</div>
  </button>
)

const Header = () => {
  const patchAuthor =
    state.patchMetadata.author?.username ?? state.user?.username ?? 'anonymous'

  const isLoggedIn = state.user !== null
  const isSavedPatch = state.patchMetadata.id !== null

  const menuItems = [
    {
      icon: 'view_list',
      label: 'Browse patches',
      action: () => openOverlay('patch-browser'),
      enabled: true,
    },
    {
      icon: 'add',
      label: 'New patch',
      action: async () => {
        if (!canUserSavePatch() || (await SaveDialog.open())) {
          await resetPatch()
        }
      },
      enabled: true,
    },
    {
      icon: 'settings',
      label: 'Patch settings',
      action: () => openOverlay('patch-settings'),
      enabled: isOwnPatch(),
    },
    {
      icon: 'save',
      label: 'Save patch',
      action: async () => {
        const res = await api.savePatch(state.patchMetadata, state.patch)
        state.patchMetadata.id = res.id
        history.pushState({}, '', `/patch/${res.id}`)
      },
      enabled: isOwnPatch(),
    },
    /*
    {
      icon: 'publish',
      label: 'Publish patch',
      action: () => {},
      enabled: isOwnPatch,
    },
    */
    {
      icon: 'fork_right',
      label: 'Fork this patch',
      action: () => {},
      enabled: isLoggedIn && !isOwnPatch(),
    },
    {
      icon: 'group',
      label: 'Create multiplayer room',
      action: () => createRoom(state.patchMetadata.id!),
      enabled: isLoggedIn && isSavedPatch,
    },
  ]

  return (
    <MenuBar top left>
      <h2 className={css('brand')}>modulate</h2>
      <div className={css('patch-name')}>
        <span>
          <b>{state.patchMetadata.name}</b> by <b>{patchAuthor}</b>
        </span>
      </div>
      <div className={css('actions')}>
        <div className={css('separator')} />
        {intersperse(
          menuItems.map((item) => (
            <MenuIcon
              icon={item.icon}
              label={item.label}
              enabled={item.enabled}
              onClick={item.action}
            />
          )),
          <div className={css('separator')} />
        )}
      </div>
    </MenuBar>
  )
}

export default Header
