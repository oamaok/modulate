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
import Icon from '../icon/Icon'

type MenuIconProps = {
  id: string
  icon: string
  label: string
  enabled: boolean
  onClick: () => void
}

const noop = () => {}

const MenuIcon = ({ id, icon, label, onClick, enabled }: MenuIconProps) => (
  <button
    {...testAttributes({ id: 'menu-item', 'item-id': id, icon, label })}
    className={css('menu-icon', { enabled })}
    onClick={enabled ? onClick : noop}
  >
    <Icon name={icon} />
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
      id: 'patch-browser',
      icon: 'view_list',
      label: 'Browse patches',
      action: () => openOverlay('patch-browser'),
      enabled: true,
    },
    {
      id: 'new-patch',
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
      id: 'settings',
      icon: 'settings',
      label: 'Patch settings',
      action: () => openOverlay('patch-settings'),
      enabled: isOwnPatch(),
    },
    {
      id: 'save-patch',
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
      id: 'fork-patch',
      icon: 'fork_right',
      label: 'Fork this patch',
      action: () => {},
      enabled: isLoggedIn && !isOwnPatch(),
    },
    {
      id: 'create-room',
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
              id={item.id}
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
