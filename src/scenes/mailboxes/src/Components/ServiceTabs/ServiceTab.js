import PropTypes from 'prop-types'
import React from 'react'
import shallowCompare from 'react-addons-shallow-compare'
import { accountStore } from 'stores/account'
import { settingsStore } from 'stores/settings'
import { userStore } from 'stores/user'
import { withStyles } from '@material-ui/core/styles'
import classNames from 'classnames'
import ACMailbox from 'shared/Models/ACAccounts/ACMailbox'
import ServiceTabTools from './ServiceTabTools'
import MailboxServiceBadge from 'wbui/MailboxServiceBadge'
import ACAvatarCircle2 from 'wbui/ACAvatarCircle2'
import Resolver from 'Runtime/Resolver'
import Color from 'color'
import ServiceTooltip from 'Components/ServiceTooltip'
import red from '@material-ui/core/colors/red'
import ThemeTools from 'wbui/Themes/ThemeTools'
import UISettings from 'shared/Models/Settings/UISettings'

const styles = (theme) => ({
  /**
  * Layout
  */
  tab: {
    cursor: 'pointer',
    position: 'relative',
    WebkitAppRegion: 'no-drag', // on win32 when the titlebar is hidden, drag regions gobble hover events and cause popups to close early

    '&.sidelist': {
      display: 'block',
      paddingTop: 1,
      paddingBottom: 1,
      paddingLeft: 0,
      paddingRight: 0
    },
    '&.toolbar': {
      display: 'inline-flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: 40,
      width: 40,
      padding: 0,
      borderBottomWidth: 2,
      borderBottomStyle: 'solid',
      borderBottomColor: ThemeTools.getStateValue(theme, 'wavebox.toolbar.serviceTab.borderBottomColor'),
      backgroundColor: ThemeTools.getStateValue(theme, 'wavebox.toolbar.serviceTab.backgroundColor'),
      '&.is-active': {
        borderBottomColor: ThemeTools.getStateValue(theme, 'wavebox.toolbar.serviceTab.borderBottomColor', 'active'),
        backgroundColor: ThemeTools.getStateValue(theme, 'wavebox.toolbar.serviceTab.backgroundColor', 'active')
      },
      '&:hover': {
        borderBottomColor: ThemeTools.getStateValue(theme, 'wavebox.toolbar.serviceTab.borderBottomColor', 'hover'),
        backgroundColor: ThemeTools.getStateValue(theme, 'wavebox.toolbar.serviceTab.backgroundColor', 'hover')
      }
    }
  },

  /**
  * Badge
  */
  badge: {
    position: 'absolute',
    fontWeight: process.platform === 'linux' ? 'normal' : '300',
    width: 'auto',
    backgroundColor: 'rgba(238, 54, 55, 0.95)',
    color: red[50],

    '&.sidelist': {
      '&.sidelist-regular': {
        fontSize: '11px',
        height: 20,
        minWidth: 20,
        lineHeight: '20px',
        borderRadius: 12,
        top: 0,
        right: 8,
        paddingLeft: 4,
        paddingRight: 4
      },
      '&.sidelist-compact': {
        fontSize: '11px',
        height: 16,
        minWidth: 16,
        lineHeight: '16px',
        borderRadius: 8,
        top: 0,
        right: 4,
        paddingLeft: 4,
        paddingRight: 4
      },
      '&.sidelist-tiny': {
        fontSize: '10px',
        height: 14,
        minWidth: 14,
        lineHeight: '14px',
        borderRadius: 5,
        top: 0,
        right: 1,
        paddingLeft: 3,
        paddingRight: 3
      }
    },
    '&.toolbar': {
      fontSize: '11px',
      height: 14,
      minWidth: 14,
      lineHeight: '14px',
      borderRadius: 3,
      top: 3,
      right: 0,
      paddingLeft: 2,
      paddingRight: 2
    }
  },
  badgeFAIcon: {
    color: 'white',
    '&.sidelist': {
      '&.sidelist-regular': {
        fontSize: 14
      },
      '&.sidelist-compact': {
        fontSize: 11
      },
      '&.sidelist-tiny': {
        fontSize: 10
      }
    },
    '&.toolbar': {
      fontSize: 10
    }
  },

  /**
  * Avatar
  */
  avatar: {
    display: 'block',
    cursor: 'pointer',
    WebkitAppRegion: 'no-drag',

    '&.sidelist': {
      margin: '4px auto'
    }
  }
})

@withStyles(styles, { withTheme: true })
class ServiceTab extends React.Component {
  /* **************************************************************************/
  // Class
  /* **************************************************************************/

  static propTypes = {
    mailboxId: PropTypes.string.isRequired,
    serviceId: PropTypes.string.isRequired,
    uiLocation: PropTypes.oneOf(Object.keys(ACMailbox.SERVICE_UI_LOCATIONS)).isRequired,
    sidebarSize: PropTypes.oneOf(Object.keys(UISettings.SIDEBAR_SIZES)),
    onOpenService: PropTypes.func.isRequired,
    onOpenServiceMenu: PropTypes.func.isRequired
  }

  /* **************************************************************************/
  // Component Lifecycle
  /* **************************************************************************/

  componentDidMount () {
    accountStore.listen(this.accountChanged)
    settingsStore.listen(this.settingsChanged)
    userStore.listen(this.userChanged)
  }

  componentWillUnmount () {
    accountStore.unlisten(this.accountChanged)
    settingsStore.unlisten(this.settingsChanged)
    userStore.unlisten(this.userChanged)
  }

  componentWillReceiveProps (nextProps) {
    const changedKey = [
      'mailboxId',
      'serviceId',
      'uiLocation'
    ].find((k) => this.props[k] !== nextProps[k])

    if (changedKey) {
      const { mailboxId, serviceId, uiLocation } = nextProps
      this.setState({
        ...this.deriveAccountState(mailboxId, serviceId, accountStore.getState()),
        ...this.deriveSettingsState(uiLocation, settingsStore.getState())
      })
    }
  }

  /* **************************************************************************/
  // Component Lifecycle
  /* **************************************************************************/

  state = (() => {
    const { mailboxId, serviceId, uiLocation } = this.props
    return {
      isHovering: false,
      ...this.deriveAccountState(mailboxId, serviceId, accountStore.getState()),
      ...this.deriveSettingsState(uiLocation, settingsStore.getState())
    }
  })()

  accountChanged = (accountState) => {
    const { mailboxId, serviceId } = this.props
    this.setState(this.deriveAccountState(mailboxId, serviceId, accountState))
  }

  settingsChanged = (settingsState) => {
    const { uiLocation } = this.props
    this.setState(this.deriveSettingsState(uiLocation, settingsState))
  }

  userChanged = (userState) => {
    const { mailboxId, serviceId } = this.props
    this.setState(this.deriveAccountState(mailboxId, serviceId, accountStore.getState()))
  }

  /**
  * Generates the account state
  * @param mailboxId: the id of the mailbox to use
  * @param serviceId: the id of the service
  * @param accountState: the current account state
  * @return the changeset
  */
  deriveAccountState (mailboxId, serviceId, accountState) {
    const mailbox = accountState.getMailbox(mailboxId)
    const service = accountState.getService(serviceId)
    const serviceData = accountState.getServiceData(serviceId)

    return mailbox && service && serviceData ? {
      membersAvailable: true,
      supportsUnreadCount: service.supportsUnreadCount,
      showBadgeCount: service.showBadgeCount,
      supportsUnreadActivity: service.supportsUnreadActivity,
      showBadgeActivity: service.showBadgeActivity,
      badgeColor: service.badgeColor,
      mailboxShowSleepableServiceIndicator: mailbox.showSleepableServiceIndicator,
      isAuthInvalid: accountState.isMailboxAuthInvalidForServiceId(serviceId),
      isServiceSleeping: accountState.isServiceSleeping(serviceId),
      isServiceActive: accountState.isServiceActive(serviceId),
      avatar: accountState.getServiceAvatarConfig(serviceId),
      unreadCount: serviceData.getUnreadCount(service),
      hasUnreadActivity: serviceData.getHasUnreadActivity(service),
      isServiceRestricted: accountState.isServiceRestricted(serviceId)
    } : {
      membersAvailable: false
    }
  }

  /**
  * Generates the settings state
  * @param uiLocation: the ui location
  * @param settingsState: the current settings state
  * @return the changeset
  */
  deriveSettingsState (uiLocation, settingsState) {
    return {
      globalShowSleepableServiceIndicator: settingsState.ui.showSleepableServiceIndicator,
      tooltipsEnabled: ServiceTabTools.uiLocationTooltipsEnabled(uiLocation, settingsState.ui.accountTooltipMode),
      tooltipSimpleMode: !settingsState.ui.accountTooltipInteractive
    }
  }

  /* **************************************************************************/
  // UI Events
  /* **************************************************************************/

  /**
  * Handles the click event
  * @param evt: the event that fired
  */
  handleClick = (evt) => {
    const { serviceId, onOpenService, onClick } = this.props
    onOpenService(evt, serviceId)
    if (onClick) { onClick(evt) }
  }

  /**
  * Handles the context menu event
  * @param evt: the event that fired
  */
  handleContextMenu = (evt) => {
    const { serviceId, onOpenServiceMenu, onContextMenu } = this.props
    onOpenServiceMenu(evt, serviceId)
    if (onContextMenu) { onContextMenu(evt) }
  }

  /**
  * Handles the mouse entering
  * @param evt: the event that fired
  */
  handleMouseEnter = (evt) => {
    const { onMouseEnter } = this.props
    this.setState({ isHovering: true })
    if (onMouseEnter) { onMouseEnter(evt) }
  }

  /**
  * Handles the mouse leaving
  * @param evt: the event that fired
  */
  handleMouseLeave = (evt) => {
    const { onMouseLeave } = this.props
    this.setState({ isHovering: false })
    if (onMouseLeave) { onMouseLeave(evt) }
  }

  /* **************************************************************************/
  // Rendering
  /* **************************************************************************/

  shouldComponentUpdate (nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState)
  }

  /**
  * Renders the width for a ui location
  * @param uiLocation: the ui location to render for
  * @return the width
  */
  renderWidthForUiLocation (uiLocation) {
    switch (uiLocation) {
      case ACMailbox.SERVICE_UI_LOCATIONS.SIDEBAR:
        return 3
      case ACMailbox.SERVICE_UI_LOCATIONS.TOOLBAR_START:
      case ACMailbox.SERVICE_UI_LOCATIONS.TOOLBAR_END:
        return 1
    }
    return 3
  }

  /**
  * @param avatar: the avatar
  * @param isServiceActive :true if active
  * @param isHovering: true if hovering
  * @return the avatar border color
  */
  renderBorderColor (avatar, isServiceActive, isHovering) {
    if (!isServiceActive && !isHovering) {
      try {
        const avatarCol = Color(avatar.color)
        if (avatarCol.isLight()) {
          return avatarCol.fade(0.5).rgb().string()
        } else {
          return avatarCol.lighten(0.4).rgb().string()
        }
      } catch (ex) {
        return avatar.color
      }
    } else {
      return avatar.color
    }
  }

  render () {
    const {
      mailboxId,
      serviceId,
      uiLocation,
      sidebarSize,
      onOpenService,
      onOpenServiceMenu,
      onClick,
      onContextMenu,
      onMouseEnter,
      onMouseLeave,
      classes,
      className,
      theme,
      ...passProps
    } = this.props
    const {
      membersAvailable,
      isHovering,
      supportsUnreadCount,
      showBadgeCount,
      supportsUnreadActivity,
      showBadgeActivity,
      badgeColor,
      mailboxShowSleepableServiceIndicator,
      unreadCount,
      hasUnreadActivity,
      isAuthInvalid,
      globalShowSleepableServiceIndicator,
      isServiceSleeping,
      isServiceActive,
      tooltipsEnabled,
      isServiceRestricted,
      avatar,
      tooltipSimpleMode
    } = this.state
    if (!membersAvailable) { return false }

    const classNameUiLoc = ServiceTabTools.uiLocationClassName(uiLocation)
    const classNameSBSize = ServiceTabTools.sidebarSizeClassName(sidebarSize)

    return (
      <ServiceTooltip
        mailboxId={mailboxId}
        serviceId={serviceId}
        simpleMode={tooltipSimpleMode}
        disabled={!tooltipsEnabled}
        {...ServiceTabTools.uiLocationTooltipPositioning(uiLocation)}>
        <MailboxServiceBadge
          className={classNames(
            className,
            classes.tab,
            classNameUiLoc,
            isServiceActive ? 'is-active' : undefined,
            `WB-${classNameUiLoc[0].toUpperCase()}${classNameUiLoc.substr(1)}TabItemServiceAvatar`,
            `WB-Id-${mailboxId}-${serviceId}`,
            isServiceActive ? 'WB-Active' : undefined,
            isServiceSleeping ? 'WB-Sleeping' : undefined
          )}
          badgeClassName={classNames(classes.badge, classNameUiLoc, classNameSBSize)}
          iconClassName={classNames(classes.badgeFAIcon, classNameUiLoc, classNameSBSize)}
          supportsUnreadCount={supportsUnreadCount}
          showUnreadBadge={showBadgeCount}
          unreadCount={unreadCount}
          supportsUnreadActivity={supportsUnreadActivity}
          showUnreadActivityBadge={showBadgeActivity}
          hasUnreadActivity={hasUnreadActivity}
          color={badgeColor}
          isAuthInvalid={isAuthInvalid}
          onMouseEnter={this.handleMouseEnter}
          onMouseLeave={this.handleMouseLeave}
          onClick={this.handleClick}
          onContextMenu={this.handleContextMenu}
          {...passProps}>
          <ACAvatarCircle2
            avatar={avatar}
            size={24}
            preferredImageSize={96}
            resolver={(i) => Resolver.image(i)}
            showSleeping={globalShowSleepableServiceIndicator && mailboxShowSleepableServiceIndicator && isServiceSleeping}
            showRestricted={isServiceRestricted}
            className={classNames(
              classes.avatar,
              classNameUiLoc,
              'WB-ServiceIcon',
              `WB-ServiceIcon-${mailboxId}_${serviceId}`
            )}
            circleProps={{
              width: this.renderWidthForUiLocation(uiLocation),
              color: this.renderBorderColor(avatar, isServiceActive, isHovering)
            }} />
        </MailboxServiceBadge>
      </ServiceTooltip>
    )
  }
}

export default ServiceTab
