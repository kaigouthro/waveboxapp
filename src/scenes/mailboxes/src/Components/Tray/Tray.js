import PropTypes from 'prop-types'
import React from 'react'
import { BLANK_PNG } from 'shared/b64Assets'
import { accountStore } from 'stores/account'
import { settingsStore } from 'stores/settings'
import { emblinkActions } from 'stores/emblink'
import TrayRenderer from './TrayRenderer'
import uuid from 'uuid'
import {
  IS_GTK_PLATFORM,
  GTK_UPDATE_MODES,
  IS_SOMETIMES_CTX_MENU_ONLY_PLATFORM,
  CLICK_ACTIONS,
  SUPPORTS_ADDITIONAL_CLICK_EVENTS
} from 'shared/Models/Settings/TraySettings'
import { ipcRenderer, remote } from 'electron'
import Resolver from 'Runtime/Resolver'
import {
  WB_TOGGLE_TRAY_POPOUT,
  WB_HIDE_TRAY,
  WB_SHOW_TRAY,
  WB_SHOW_TRAY_WINDOWED,
  WB_TOGGLE_MAILBOX_WINDOW_FROM_TRAY,
  WB_SHOW_MAILBOX_WINDOW_FROM_TRAY,
  WB_HIDE_MAILBOX_WINDOW_FROM_TRAY,
  WB_FOCUS_MAILBOXES_WINDOW,
  WB_FOCUS_APP,
  WB_QUIT_APP,
  WB_TOGGLE_TRAY_WITH_BOUNDS,
  WB_TRAY_ICON_CREATED,
  WB_TRAY_ICON_DESTROYED
} from 'shared/ipcEvents'
import TrayContextMenuUnreadRenderer from './TrayContextMenuUnreadRenderer'
import pluralize from 'pluralize'

export default class Tray extends React.Component {
  /* **************************************************************************/
  // Class
  /* **************************************************************************/

  static propTypes = { // Careful we're strict in shouldComponentUpdate
    unreadCount: PropTypes.number.isRequired,
    hasUnreadActivity: PropTypes.bool.isRequired
  }

  /* **************************************************************************/
  // Lifecycle
  /* **************************************************************************/

  constructor (props) {
    super(props)

    const settingsState = settingsStore.getState()

    // Class vars
    this.trayIconInitialized = false
    this.deferredClickTO = null
    this.contextMenu = null

    // Build the tray
    if (IS_GTK_PLATFORM && settingsState.launched.tray.gtkUpdateMode === GTK_UPDATE_MODES.STATIC) {
      const image = remote.nativeImage.createFromPath(Resolver.icon('app_64.png', Resolver.API_TYPES.NODE))
      const resizedImage = image.resize({ width: settingsState.launched.tray.iconSize, height: settingsState.launched.tray.iconSize })
      this.appTray = this.createTray(resizedImage)
    } else {
      this.appTray = this.createTray(remote.nativeImage.createFromDataURL(BLANK_PNG))
    }

    // Prep context menu renderer
    this.unreadCtxRenderer = new TrayContextMenuUnreadRenderer()
    if (IS_SOMETIMES_CTX_MENU_ONLY_PLATFORM) {
      this.unreadCtxRenderer.build(accountStore.getState())
    }

    // Generate state
    this.state = { // Careful we're strict in shouldComponentUpdate
      ctxMenuSig: this.unreadCtxRenderer.signature,
      tray: settingsState.tray,
      launchTray: settingsState.launched.tray,
      unreadImage: settingsState.getTrayUnreadImage(),
      readImage: settingsState.getTrayReadImage()
    }
  }

  /* **************************************************************************/
  // Component Lifecycle
  /* **************************************************************************/

  componentDidMount () {
    if (IS_SOMETIMES_CTX_MENU_ONLY_PLATFORM) {
      accountStore.listen(this.accountUpdated)
    }
    settingsStore.listen(this.settingsUpdated)

    ipcRenderer.on(WB_TOGGLE_TRAY_WITH_BOUNDS, this.handleIpcToggleTrayWithBounds)
  }

  componentWillUnmount () {
    this.appTray = this.destroyTray(this.appTray)

    if (IS_SOMETIMES_CTX_MENU_ONLY_PLATFORM) {
      accountStore.unlisten(this.accountUpdated)
    }
    settingsStore.unlisten(this.settingsUpdated)

    ipcRenderer.removeListener(WB_TOGGLE_TRAY_WITH_BOUNDS, this.handleIpcToggleTrayWithBounds)
    ipcRenderer.send(WB_TRAY_ICON_DESTROYED)
  }

  /* **************************************************************************/
  // Data lifecycle
  /* **************************************************************************/

  accountUpdated = (accountState) => {
    if (IS_SOMETIMES_CTX_MENU_ONLY_PLATFORM) {
      this.unreadCtxRenderer.build(accountState)
      this.setState({
        ctxMenuSig: this.unreadCtxRenderer.signature
      })
    }
  }

  settingsUpdated = (settingsState) => {
    this.setState({
      unreadImage: settingsState.getTrayUnreadImage(),
      readImage: settingsState.getTrayReadImage(),
      tray: settingsState.tray
      // No need to update launchTray
    })
  }

  /* **************************************************************************/
  // Tray utils
  /* **************************************************************************/

  /**
  * Creates a new tray and ensures all callbacks are bound
  * @param image: the initial image to use
  * @return the new tray
  */
  createTray (image) {
    const tray = new remote.Tray(image)
    if (IS_SOMETIMES_CTX_MENU_ONLY_PLATFORM) {
      // On platforms that have app indicator support - i.e. ubuntu clicking on the
      // icon will launch the context menu and click will be ignored.
      // On platforms that use GtkStatusIcon the menu appears on right click and the
      // click action is propogated
      tray.on('click', this.handleClick)
    } else {
      tray.on('click', this.handleClick)
      if (SUPPORTS_ADDITIONAL_CLICK_EVENTS) {
        tray.on('right-click', this.handleRightClick)
        tray.on('double-click', this.handleDoubleClick)
      }
    }
    return tray
  }

  /**
  * Destroys a tray
  * @param tray: the tray to destroy
  * @return null
  */
  destroyTray (tray) {
    if (tray) {
      tray.destroy()
    }
    return null
  }

  /* **************************************************************************/
  // UI Events
  /* **************************************************************************/

  /**
  * Handles a click event on the tray
  * @param evt: the event that fired
  * @param bounds: the bounds of the tray icon
  */
  handleClick = (evt, bounds) => {
    const { clickAction, doubleClickAction, altClickAction } = this.state.tray
    if (SUPPORTS_ADDITIONAL_CLICK_EVENTS) {
      // Click and double-click both fire on macOS and win32. To make sure we don't double trigger,
      // delay the click slightly to wait and see if double click comes in waveboxapp#707
      const action = evt.altKey || evt.ctrlKey || evt.shiftKey || evt.metaKey ? (
        altClickAction
      ) : (
        clickAction
      )
      const boundsCpy = { ...bounds } // Copy to retain
      clearTimeout(this.deferredClickTO)
      this.deferredClickTO = setTimeout(() => {
        this.dispatchClickAction(action, boundsCpy)
      }, doubleClickAction === CLICK_ACTIONS.NONE ? 0 : 300)
    } else {
      this.dispatchClickAction(clickAction, bounds)
    }
  }

  /**
  * Handles a click event on the tray
  * @param evt: the event that fired
  * @param bounds: the bounds of the tray icon
  */
  handleRightClick = (evt, bounds) => {
    const { rightClickAction } = this.state.tray
    this.dispatchClickAction(rightClickAction, bounds)
  }

  /**
  * Handles a click event on the tray
  * @param evt: the event that fired
  * @param bounds: the bounds of the tray icon
  */
  handleDoubleClick = (evt, bounds) => {
    clearTimeout(this.deferredClickTO)
    const { doubleClickAction } = this.state.tray
    this.dispatchClickAction(doubleClickAction, bounds)
  }

  /**
  * Handles compose being clicked
  * @param evt: the event that fired
  */
  handleCompose = (evt) => {
    ipcRenderer.send(WB_FOCUS_MAILBOXES_WINDOW, {})
    emblinkActions.composeNewMessage()
  }

  /**
  * Shows the popout
  * @param evt: the event that fired
  */
  handleShowPopoutWindowMode = (evt) => {
    ipcRenderer.send(WB_SHOW_TRAY_WINDOWED)
  }

  /**
  * Handles the toggle call
  * @param evt: the event that fired
  */
  handleToggleApp = () => {
    ipcRenderer.send(WB_FOCUS_APP)
  }

  /**
  * Handles quitting the app
  * @param evt: the event that fired
  */
  handleQuit = () => {
    ipcRenderer.send(WB_QUIT_APP)
  }

  /**
  * Dispatches a click action
  * @param action: the action to dispatch
  * @param bounds: the current tray bounds
  */
  dispatchClickAction (action, bounds) {
    switch (action) {
      case CLICK_ACTIONS.TOGGLE_POPOUT:
        ipcRenderer.send(WB_TOGGLE_TRAY_POPOUT, bounds)
        break
      case CLICK_ACTIONS.HIDE_POPOUT:
        ipcRenderer.send(WB_HIDE_TRAY)
        break
      case CLICK_ACTIONS.SHOW_POPOUT:
        ipcRenderer.send(WB_SHOW_TRAY, bounds)
        break
      case CLICK_ACTIONS.TOGGLE_APP:
        ipcRenderer.send(WB_TOGGLE_MAILBOX_WINDOW_FROM_TRAY)
        break
      case CLICK_ACTIONS.HIDE_APP:
        ipcRenderer.send(WB_HIDE_MAILBOX_WINDOW_FROM_TRAY)
        break
      case CLICK_ACTIONS.SHOW_APP:
        ipcRenderer.send(WB_SHOW_MAILBOX_WINDOW_FROM_TRAY)
        break
    }
  }

  /* **************************************************************************/
  // Ipc events
  /* **************************************************************************/

  /**
  * Handles a request to toggle the tray by getting the bounds and then firing
  * to the main thread
  * @param evt: the event that fired
  */
  handleIpcToggleTrayWithBounds = (evt) => {
    if (!this.appTray) { return }
    ipcRenderer.send(WB_TOGGLE_TRAY_POPOUT, this.appTray.getBounds())
  }

  /* **************************************************************************/
  // Rendering
  /* **************************************************************************/

  /**
  * Be really careful here. The tray icon on linux flickers if you update it too
  * freqently
  */
  shouldComponentUpdate (nextProps, nextState) {
    const propsDiff = [
      'unreadCount',
      'hasUnreadActivity'
    ].findIndex((k) => this.props[k] !== nextProps[k]) !== -1
    if (propsDiff) { return true }

    const trayDiff = [
      'unreadColor',
      'unreadBackgroundColor',
      'readColor',
      'readBackgroundColor',
      'showUnreadCount',
      'dpiMultiplier',
      'iconSize',
      'useCustomImages'
    ].findIndex((k) => this.state.tray[k] !== nextState.tray[k]) !== -1
    if (trayDiff) { return true }
    if (this.state.ctxMenuSig !== nextState.ctxMenuSig) { return true }
    if (this.state.readImage !== nextState.readImage) { return true }
    if (this.state.unreadImage !== nextState.unreadImage) { return true }

    return false
  }

  /**
  * @return the tooltip string for the tray icon
  */
  renderTooltip () {
    const { unreadCount, hasUnreadActivity } = this.props
    if (unreadCount > 0) {
      return `${unreadCount} unread ${pluralize('item', unreadCount)}`
    } else if (hasUnreadActivity) {
      return `Unread activity`
    } else {
      return `No unread items`
    }
  }

  /**
  * Renders the context menu
  * @return the menu object
  */
  renderContextMenu () {
    const unread = this.unreadCtxRenderer.template

    const template = [].concat(
      [
        { label: 'Toggle App', click: this.handleToggleApp },
        { label: 'Show Wavebox Mini', click: this.handleShowPopoutWindowMode },
        { type: 'separator' },
        { label: 'Compose New Message', click: this.handleCompose },
        { type: 'separator' }
      ],
      unread,
      unread.length ? ([{ type: 'separator' }]) : [],
      [
        { label: 'Quit', click: this.handleQuit }
      ]
    )
    return remote.Menu.buildFromTemplate(template)
  }

  render () {
    const {
      unreadCount,
      hasUnreadActivity
    } = this.props
    const {
      tray,
      launchTray,
      unreadImage,
      readImage
    } = this.state

    // Making subsequent calls to the promise can cause the return order to change
    // Guard against this using the renderId
    const renderId = uuid.v4()
    this.renderId = renderId

    Promise.resolve()
      .then(() => {
        return tray.useCustomImages
          ? TrayRenderer.renderNativeUserImage(tray.iconSize, unreadImage, readImage, Resolver.icon('app_64.png', Resolver.API_TYPES.NODE), unreadCount, hasUnreadActivity)
          : TrayRenderer.renderNativeImage(tray.iconSize, tray, unreadCount, hasUnreadActivity)
      })
      .then((image) => {
        if (this.renderId !== renderId) { return } // Someone got in before us

        // Update the icon
        if (IS_GTK_PLATFORM) {
          if (launchTray.gtkUpdateMode === GTK_UPDATE_MODES.RECREATE) {
            this.appTray = this.destroyTray(this.appTray)
            this.appTray = this.createTray(image)
          } else if (launchTray.gtkUpdateMode === GTK_UPDATE_MODES.UPDATE) {
            this.appTray.setImage(image)
          } else {
            // We don't update the image on static
          }
        } else {
          this.appTray.setImage(image)
        }
        this.appTray.setToolTip(this.renderTooltip())

        // Add a context menu to fallback for libappindicator
        if (IS_SOMETIMES_CTX_MENU_ONLY_PLATFORM) {
          const lastContextMenu = this.contextMenu
          this.contextMenu = this.renderContextMenu()
          this.appTray.setContextMenu(this.contextMenu)
          if (lastContextMenu) {
            // Wait some time for the linux dbus-menu to catch up. Not waiting appears to be the
            // root cause of #790. Shouldn't do any harm on other platforms either
            setTimeout(() => { lastContextMenu.destroy() }, 1000)
          }
        }

        // Tell our main thread
        if (!this.trayIconInitialized) {
          this.trayIconInitialized = true
          ipcRenderer.send(WB_TRAY_ICON_CREATED)
        }
      })

    return null
  }
}
