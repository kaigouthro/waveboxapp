import ServiceReducer from './ServiceReducer'

class GenericServiceReducer extends ServiceReducer {
  /* **************************************************************************/
  // Class
  /* **************************************************************************/

  static get name () { return 'GenericServiceReducer' }

  /* **************************************************************************/
  // Avatar
  /* **************************************************************************/

  /**
  * Sets the page favicons as the avatar
  * @param service: the service to update
  * @param favicons: the list of favicons
  * @param touchIcons: the list of touch icons
  */
  static setPageFaviconAvatar (service, favicons, touchIcons) {
    if ((favicons === undefined || favicons.length === 0) && (touchIcons === undefined || touchIcons.length === 0)) {
      return service.changeData({ serviceAvatarURL: null })
    } else {
      // Use the touch icon over the favicon as it's normally larger
      const validTouchIcons = (touchIcons || [])
        .filter((f) => f.split('?')[0].endsWith('.png'))
      if (validTouchIcons.length) {
        return service.changeData({ serviceAvatarURL: validTouchIcons.slice(-1)[0] })
      }

      const validFavicons = (favicons || [])
        .map((f) => f.endsWith('/') ? f.substr(0, f.length - 1) : f) // Electron sometimes gives a trailing slash :-/
        .filter((f) => { // some websites send junk
          const base = f.split('?')[0]
          return base.endsWith('.png') || base.endsWith('.ico') || base.endsWith('.jpg') || base.endsWith('.gif')
        })
      if (validFavicons.length) {
        const bestFavicon = validFavicons.find((f) => f.endsWith('.ico')) || favicons.slice(-1)[0]
        return service.changeData({ serviceAvatarURL: bestFavicon })
      } else {
        return service.changeData({ serviceAvatarURL: null })
      }
    }
  }

  /* **************************************************************************/
  // Settings
  /* **************************************************************************/

  /**
  * Updates the url for the service
  * @param service: the service to update
  * @param url: the url to set
  */
  static setUrl (service, url) {
    return service.changeData({ url: url })
  }

  /**
  * Updates the setting to show adaptor data
  * @param service: the service to update
  * @param supports: true to supports, false otherwise
  */
  static setSupportsWBGAPI (service, supports) {
    return service.changeData({ supportsWBGAPI: supports })
  }

  /**
  * Sets whether to use the page title as the display name or not
  * @param service: the service to update
  * @param use: true to use, false otherwise
  */
  static setUsePageTitleAsDisplayName (service, use) {
    return service.changeData({ usePageTitleAsDisplayName: use })
  }

  /**
  * Sets whether to use the page theme as the color or not
  * @param service: the service to update
  * @param use: true to use, false otherwise
  */
  static setUsePageThemeAsColor (service, use) {
    return service.changeData({ usePageThemeAsColor: use })
  }
}

export default GenericServiceReducer
