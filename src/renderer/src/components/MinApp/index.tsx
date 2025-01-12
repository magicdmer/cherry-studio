import store from '@renderer/store'
import { setMinappBrowserVisible } from '@renderer/store/runtime'
import * as React from 'react'

import { TopView } from '../TopView'
import MinAppBrowser from './MinAppBrowser'

// 使用React.memo来缓存MinAppBrowser组件
const CachedMinAppBrowser = React.memo(MinAppBrowser)

export default class MinApp {
  static topviewId = 'MinApp'
  static browserComponent = (<CachedMinAppBrowser />)
  static onClose = () => {}

  static close() {
    // 只改变可见性，不销毁组件
    store.dispatch(setMinappBrowserVisible(false))
    TopView.hide(this.topviewId)
  }

  static start() {
    const state = store.getState()
    const { browserVisible } = state.runtime.minapp

    // 如果浏览器已经显示，则关闭
    if (browserVisible) {
      this.close()
      return Promise.resolve({})
    }

    // 显示浏览器
    store.dispatch(setMinappBrowserVisible(true))

    // 使用缓存的组件实例
    return new Promise<any>(() => {
      TopView.show(this.browserComponent, this.topviewId)
    })
  }
}
