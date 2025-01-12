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
    try {
      // 确保在关闭前清理资源
      store.dispatch(setMinappBrowserVisible(false))
      TopView.hide(this.topviewId)
    } catch (error) {
      console.error('Error closing MinApp:', error)
    }
  }

  static async start() {
    try {
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
      return new Promise<any>((resolve) => {
        TopView.show(this.browserComponent, this.topviewId)
        resolve({})
      })
    } catch (error) {
      console.error('Error starting MinApp:', error)
      this.close() // 确保出错时也能正确清理
      throw error // 重新抛出错误以便上层处理
    }
  }
}
