import PropTypes from 'prop-types'
import React from 'react'
import { settingsActions } from 'stores/settings'
import { updaterActions } from 'stores/updater'
import AppSettings from 'shared/Models/Settings/AppSettings'
import modelCompare from 'wbui/react-addons-model-compare'
import partialShallowCompare from 'wbui/react-addons-partial-shallow-compare'
import SettingsListSection from 'wbui/SettingsListSection'
import SettingsListItemSwitch from 'wbui/SettingsListItemSwitch'
import SettingsListItemSelectInline from 'wbui/SettingsListItemSelectInline'
import SettingsListItemButton from 'wbui/SettingsListItemButton'
import SystemUpdateIcon from '@material-ui/icons/SystemUpdate'
import { withStyles } from '@material-ui/core/styles'
import WBRPCRenderer from 'shared/WBRPCRenderer'
import SettingsListItemText from 'wbui/SettingsListItemText'
import blue from '@material-ui/core/colors/blue'
import {
  GITHUB_RELEASES_URL,
  KB_BETA_CHANNEL_URL
} from 'shared/constants'

const styles = {
  link: {
    color: blue[600],
    textDecoration: 'underline',
    cursor: 'pointer'
  }
}

@withStyles(styles)
class UpdateSettingsSection extends React.Component {
  /* **************************************************************************/
  // Class
  /* **************************************************************************/

  static propTypes = {
    showRestart: PropTypes.func.isRequired,
    app: PropTypes.object.isRequired
  }

  /* **************************************************************************/
  // Rendering
  /* **************************************************************************/

  shouldComponentUpdate (nextProps, nextState) {
    return (
      modelCompare(this.props.app, nextProps.app, ['checkForUpdates', 'updateChannel']) ||
      partialShallowCompare(
        { showRestart: this.props.showRestart },
        this.state,
        { showRestart: nextProps.showRestart },
        nextState
      )
    )
  }

  render () {
    const { showRestart, app, classes, ...passProps } = this.props

    return (
      <SettingsListSection title='Updates' icon={<SystemUpdateIcon />} {...passProps}>
        <SettingsListItemSwitch
          label='Check for updates'
          onChange={(evt, toggled) => {
            showRestart()
            settingsActions.sub.app.checkForUpdates(toggled)
          }}
          checked={app.checkForUpdates} />
        <SettingsListItemSelectInline
          label='Update channel'
          secondary={process.platform === 'linux' ? (
            <React.Fragment>
              <span>Remember to&nbsp;</span>
              <span
                className={classes.link}
                onClick={() => WBRPCRenderer.wavebox.openExternal(KB_BETA_CHANNEL_URL)}>
                change your update repository
              </span>
            </React.Fragment>
          ) : undefined}
          value={app.updateChannel}
          options={[
            { value: AppSettings.UPDATE_CHANNELS.STABLE, label: 'Stable' },
            { value: AppSettings.UPDATE_CHANNELS.BETA, label: 'Beta' }
          ]}
          onChange={(evt, value) => {
            settingsActions.sub.app.setUpdateChannel(value)
            updaterActions.checkForUpdates()
          }} />
        <SettingsListItemButton
          label='Check for update now'
          icon={<SystemUpdateIcon />}
          onClick={() => { updaterActions.userCheckForUpdates() }} />
        <SettingsListItemText
          divider={false}
          primary={(
            <span
              className={classes.link}
              onClick={() => WBRPCRenderer.wavebox.openExternal(GITHUB_RELEASES_URL)}>
              Wavebox changelog
            </span>
          )} />
      </SettingsListSection>
    )
  }
}

export default UpdateSettingsSection
