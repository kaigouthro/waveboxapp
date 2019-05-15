import uuid from 'uuid'
import userPersistence from 'Storage/userStorage'
import wirePersistence from 'Storage/wireStorage'
import extensionStorePersistence from 'Storage/extensionStoreStorage'
import containerPersistence from 'Storage/containerStorage'
import {
  CLIENT_ID,
  ANALYTICS_ID,
  CREATED_TIME
} from 'shared/Models/DeviceKeys'
import { SAPIExtensionLoader } from 'Extensions/ServiceApi'

class PersistenceBootstrapper {
  /**
  * Loads the data from the base stores (user, container, extension, wire)
  * Loads all the data from the persistence stores
  * @return all the data from the persistence stores
  */
  static loadBaseStoreData () {
    let userData = userPersistence.allJSONItems()
    let didUpdateUserData = false

    // Create some persistent values
    if (userData[CLIENT_ID] === undefined) {
      userPersistence.setJSONItem(CLIENT_ID, uuid.v4())
      didUpdateUserData = true
    }
    if (userData[ANALYTICS_ID] === undefined) {
      userPersistence.setJSONItem(ANALYTICS_ID, uuid.v4())
      didUpdateUserData = true
    }
    if (userData[CREATED_TIME] === undefined) {
      userPersistence.setJSONItem(CREATED_TIME, new Date().getTime())
      didUpdateUserData = true
    }

    if (didUpdateUserData) {
      userData = userPersistence.allJSONItems()
    }

    return {
      userData: userData,
      containerData: containerPersistence.allJSONItems(),
      extensionStoreData: extensionStorePersistence.allJSONItems(),
      wireConfigData: wirePersistence.allJSONItems()
    }
  }

  /**
  * Loads all the data from the persistence stores
  * @return all the data from the persistence stores
  */
  static load () {
    return {
      ...this.loadBaseStoreData(),
      containerSAPI: SAPIExtensionLoader.loadContainersSync()
    }
  }
}

export default PersistenceBootstrapper
