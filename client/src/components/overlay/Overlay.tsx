import * as styles from './Overlay.css'
import { closeOverlay } from '../../state'
import { FC } from 'kaiku'
import testAttributes from '../../test-attributes'
import Icon from '../icon/Icon'

type OverlayProps = {
  className?: string
  showCloseButton?: boolean
}

const Overlay: FC<OverlayProps> = ({
  className = '',
  showCloseButton = true,
  children,
}) => {
  return (
    <div class={styles.overlay} {...testAttributes({ id: 'overlay' })}>
      <div class={[styles.modal, className]}>
        {showCloseButton ? (
          <button
            class={styles.closeButton}
            onClick={closeOverlay}
            {...testAttributes({ id: 'close-modal' })}
          >
            <Icon name="close" />
          </button>
        ) : null}
        {children}
      </div>
    </div>
  )
}

export default Overlay
