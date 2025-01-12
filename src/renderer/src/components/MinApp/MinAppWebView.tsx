import { MinAppTab } from '@renderer/store/runtime'
import { FC, useCallback, useEffect, useRef } from 'react'
import styled from 'styled-components'

interface Props {
  tab: MinAppTab
}

interface WebviewElement extends HTMLElement {
  addEventListener: (event: string, callback: (event: any) => void, options?: any) => void
  removeEventListener: (event: string, callback: (event: any) => void) => void
  loadURL: (url: string) => void
  getTitle: () => string
  reload: () => void
  setUserAgent: (userAgent: string) => void
  getWebContents: () => any
  session: any
  destroy: () => void
  executeJavaScript: (code: string) => Promise<any>
}

const MinAppWebView: FC<Props> = ({ tab }) => {
  const webviewRef = useRef<WebviewElement | null>(null)
  const mountedRef = useRef(true)
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const webContentsRef = useRef<any>(null)

  // 清理函数只在标签页真正关闭时调用
  const cleanupWebview = useCallback(() => {
    try {
      if (webContentsRef.current) {
        webContentsRef.current = null
      }

      if (webviewRef.current) {
        try {
          if (webviewRef.current.destroy) {
            webviewRef.current.destroy()
          }
        } catch (error) {
          console.error('Error destroying webview:', error)
        }
        webviewRef.current = null
      }
    } catch (error) {
      console.error('Error in cleanupWebview:', error)
    }
  }, [])

  // 组件卸载时的清理（只在标签页关闭时触发）
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current)
      }
      cleanupWebview()
    }
  }, [cleanupWebview])

  // 只在初始化时设置URL
  useEffect(() => {
    const webview = webviewRef.current
    if (!webview || !mountedRef.current || !tab.url || tab.isHome) return

    // 只在第一次加载时设置URL
    if (!webview.getAttribute('src')) {
      webview.loadURL(tab.url)
    }
  }, [tab.url, tab.isHome])

  useEffect(() => {
    const handleDomReady = () => {
      if (!mountedRef.current || !webviewRef.current) return
      const webContents = safeGetWebContents()
      if (!webContents) return

      try {
        webviewRef.current.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
      } catch (error) {
        console.error('Error setting user agent:', error)
      }
    }

    const webview = webviewRef.current
    if (webview) {
      webview.addEventListener('dom-ready', handleDomReady)
    }

    return () => {
      if (webview) {
        try {
          webview.removeEventListener('dom-ready', handleDomReady)
        } catch (error) {
          console.error('Error removing dom-ready listener:', error)
        }
      }
    }
  }, [])

  // 安全地获取 WebContents
  const safeGetWebContents = () => {
    try {
      if (!webviewRef.current || !mountedRef.current) return null
      if (webContentsRef.current) return webContentsRef.current

      // 添加类型检查
      if (typeof webviewRef.current.getWebContents !== 'function') {
        console.warn('getWebContents is not available yet')
        return null
      }

      const webContents = webviewRef.current.getWebContents()
      if (webContents) {
        webContentsRef.current = webContents
      }
      return webContents
    } catch (error) {
      console.error('Error getting WebContents:', error)
      return null
    }
  }

  // 安全地添加事件监听器
  const safeAddEventListener = (webview: WebviewElement, event: string, handler: (event: any) => void) => {
    try {
      webview.addEventListener(event, handler)
    } catch (error) {
      console.error(`Error adding ${event} listener:`, error)
    }
  }

  // 安全地移除事件监听器
  const safeRemoveEventListener = (webview: WebviewElement, event: string, handler: (event: any) => void) => {
    try {
      if (webview) {
        webview.removeEventListener(event, handler)
      }
    } catch (error) {
      console.error(`Error removing ${event} listener:`, error)
    }
  }

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview || !mountedRef.current) {
      return undefined
    }

    // 处理加载错误
    const handleLoadFail = (event: any) => {
      console.log('Load failed:', event)
      if (event.errorCode === -2 && event.validatedURL.includes('featurebase.app')) {
        // 对于特定域名的加载失败，我们可以选择忽略
        console.log('Ignoring non-critical resource load failure')
        return
      }

      if (event.errorCode === -2) {
        // 对于其他 -2 错误，可能是由于安全策略导致的
        console.log('Resource blocked by security policy:', event.validatedURL)
        return
      }
    }

    // 处理加载完成
    const handleLoadCommit = () => {
      console.log('Page load committed')
    }

    // 处理did-fail-load事件
    const handleDidFailLoad = (event: any) => {
      console.log('Did fail load:', event)
      if (event.errorCode === -2) {
        // 特殊处理某些资源加载失败的情况
        if (event.validatedURL.includes('featurebase.app')) {
          console.log('Non-critical resource load failure, continuing...')
          return
        }
      }
    }

    // 处理did-finish-load事件
    const handleDidFinishLoad = () => {
      console.log('Page finished loading')
      // 注入一些错误处理代码
      webview
        .executeJavaScript(
          `
        window.addEventListener('error', (event) => {
          console.log('Page error:', event);
          event.preventDefault();
          return false;
        });
        window.addEventListener('unhandledrejection', (event) => {
          console.log('Unhandled promise rejection:', event);
          event.preventDefault();
          return false;
        });
      `
        )
        .catch(console.error)
    }

    // 添加事件监听
    safeAddEventListener(webview, 'did-fail-load', handleDidFailLoad)
    safeAddEventListener(webview, 'did-finish-load', handleDidFinishLoad)
    safeAddEventListener(webview, 'load-commit', handleLoadCommit)
    safeAddEventListener(webview, 'did-fail-provisional-load', handleLoadFail)

    return () => {
      if (!mountedRef.current) return
      safeRemoveEventListener(webview, 'did-fail-load', handleDidFailLoad)
      safeRemoveEventListener(webview, 'did-finish-load', handleDidFinishLoad)
      safeRemoveEventListener(webview, 'load-commit', handleLoadCommit)
      safeRemoveEventListener(webview, 'did-fail-provisional-load', handleLoadFail)
    }
  }, [])

  // 修改webview配置
  return (
    <Container
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        visibility: tab.isHome ? 'hidden' : 'visible',
        zIndex: tab.isHome ? -1 : 'auto',
        pointerEvents: tab.isHome ? 'none' : 'auto',
        opacity: tab.isHome ? 0 : 1
      }}>
      <webview
        {...({
          src: tab.url,
          ref: webviewRef,
          'data-tab-id': tab.id,
          style: {
            width: '100%',
            height: '100%',
            display: 'flex'
          },
          allowpopups: 'true',
          partition: 'persist:shared',
          webpreferences:
            'nodeIntegration=no, contextIsolation=yes, javascript=yes, backgroundThrottling=false, webSecurity=yes, allowRunningInsecureContent=no, plugins=yes, webgl=yes, experimentalFeatures=yes',
          httpreferrer: 'strict-origin-when-cross-origin',
          useragent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        } as any)}
      />
    </Container>
  )
}

const Container = styled.div`
  flex: 1;
  display: flex;
  position: relative;
  isolation: isolate;
  background: var(--color-background);
`

export default MinAppWebView
