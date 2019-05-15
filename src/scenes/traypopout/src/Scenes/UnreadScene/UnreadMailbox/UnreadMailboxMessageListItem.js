import React from 'react'
import PropTypes from 'prop-types'
import shallowCompare from 'react-addons-shallow-compare'
import { accountStore } from 'stores/account'
import { Avatar, ListItem, ListItemText } from '@material-ui/core'
import red from '@material-ui/core/colors/red'
import pink from '@material-ui/core/colors/pink'
import purple from '@material-ui/core/colors/purple'
import deepPurple from '@material-ui/core/colors/deepPurple'
import indigo from '@material-ui/core/colors/indigo'
import blue from '@material-ui/core/colors/blue'
import lightBlue from '@material-ui/core/colors/lightBlue'
import cyan from '@material-ui/core/colors/cyan'
import teal from '@material-ui/core/colors/teal'
import green from '@material-ui/core/colors/green'
import lightGreen from '@material-ui/core/colors/lightGreen'
import lime from '@material-ui/core/colors/lime'
import yellow from '@material-ui/core/colors/yellow'
import amber from '@material-ui/core/colors/amber'
import orange from '@material-ui/core/colors/orange'
import deepOrange from '@material-ui/core/colors/deepOrange'
import brown from '@material-ui/core/colors/brown'
import grey from '@material-ui/core/colors/grey'
import blueGrey from '@material-ui/core/colors/blueGrey'
import { withStyles } from '@material-ui/core/styles'
import ACAvatarCircle2 from 'wbui/ACAvatarCircle2'
import Resolver from 'Runtime/Resolver'
import classNames from 'classnames'

const avatarColorPalette = [
  [red[800], red[100]],
  [pink[800], pink[100]],
  [purple[800], purple[100]],
  [deepPurple[800], deepPurple[100]],
  [indigo[800], indigo[100]],
  [blue[800], blue[100]],
  [lightBlue[800], lightBlue[100]],
  [cyan[800], cyan[100]],
  [teal[800], teal[100]],
  [green[800], green[100]],
  [lightGreen[800], lightGreen[100]],
  [lime[800], lime[100]],
  [yellow[800], yellow[100]],
  [amber[800], amber[100]],
  [orange[800], orange[100]],
  [deepOrange[800], deepOrange[100]],
  [brown[800], brown[100]],
  [grey[800], grey[100]],
  [blueGrey[800], blueGrey[100]]
]

const styles = {
  avatarContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    minWidth: 60,
    height: 60,
    minHeight: 60,
    marginLeft: -15
  },
  serviceAvatar: {

  },
  extendedAvatar: {
    width: 40,
    height: 40
  },
  listItem: {
    paddingTop: 8,
    paddingBottom: 8,
    display: 'flex',
    alignItems: 'center',
    borderBottom: `1px solid ${grey[100]}`
  },
  messageText: {
    marginLeft: 75
  }
}

@withStyles(styles)
class UnreadMailboxMessageListItem extends React.Component {
  /* **************************************************************************/
  // Class
  /* **************************************************************************/

  static propTypes = {
    message: PropTypes.object.isRequired
  }

  /* **************************************************************************/
  // Component lifecycle
  /* **************************************************************************/

  componentDidMount () {
    accountStore.listen(this.accountChanged)
  }

  componentWillUnmount () {
    accountStore.unlisten(this.accountChanged)
  }

  componentWillReceiveProps (nextProps) {
    const prevServiceId = ((this.props.message || {}).data || {}).serviceId
    const nextServiceId = ((nextProps.message || {}).data || {}).serviceId
    if (prevServiceId !== nextServiceId) {
      const accountState = accountStore.getState()
      this.setState({
        avatar: accountState.getServiceAvatarConfig(nextServiceId)
      })
    }
  }

  /* **************************************************************************/
  // Data lifecycle
  /* **************************************************************************/

  state = (() => {
    const accountState = accountStore.getState()
    const serviceId = ((this.props.message || {}).data || {}).serviceId
    return {
      avatar: accountState.getServiceAvatarConfig(serviceId)
    }
  })()

  accountChanged = (accountState) => {
    const serviceId = ((this.props.message || {}).data || {}).serviceId
    this.setState({
      avatar: accountState.getServiceAvatarConfig(serviceId)
    })
  }

  /* **************************************************************************/
  // Rendering
  /* **************************************************************************/

  shouldComponentUpdate (nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState)
  }

  /**
  * Renders the avatar
  * @param classes: the classes to use
  * @param extended: the extended info
  * @param serviceAvatar: the service avatar
  * @return jsx or undefined
  */
  renderAvatar (classes, extended, serviceAvatar) {
    if (extended) {
      if (extended.optAvatarText) {
        const charCode = extended.optAvatarText.toLowerCase().charCodeAt(0)
        const [backgroundColor, color] = avatarColorPalette[charCode % avatarColorPalette.length]
        return (
          <Avatar
            className={classes.extendedAvatar}
            style={{ backgroundColor: backgroundColor, color: color }}>
            {extended.optAvatarText}
          </Avatar>
        )
      }
    }

    return (
      <ACAvatarCircle2
        className={classes.serviceAvatar}
        avatar={serviceAvatar}
        resolver={(i) => Resolver.image(i)}
        size={40} />
    )
  }

  render () {
    const { message, classes, className, ...passProps } = this.props
    const { avatar } = this.state
    return (
      <ListItem className={classNames(classes.listItem, className)} button {...passProps}>
        <span className={classes.avatarContainer}>
          {this.renderAvatar(classes, message.extended, avatar)}
        </span>
        <ListItemText
          primary={message.text}
          primaryTypographyProps={{ noWrap: true }}
          secondary={message.extended ? message.extended.subtitle : undefined}
          secondaryTypographyProps={{ noWrap: true }} />
      </ListItem>
    )
  }
}

export default UnreadMailboxMessageListItem
