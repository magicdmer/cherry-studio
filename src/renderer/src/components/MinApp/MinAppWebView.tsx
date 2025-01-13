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
  const redirectCountRef = useRef<number>(0)
  const auth0StateRef = useRef<{ lastUrl: string; timestamp: number } | null>(null)

  // 检查是否是身份验证相关的URL
  const isAuthUrl = (url: string) => {
    try {
      const urlObj = new URL(url)
      return (
        urlObj.hostname.includes('accounts.google.com') ||
        urlObj.hostname.includes('auth0.openai.com') ||
        urlObj.hostname.includes('auth.openai.com') ||
        urlObj.hostname.includes('auth.claude.ai') ||
        urlObj.hostname.includes('id.grok.x') ||
        urlObj.hostname.includes('auth0.com') ||
        url.includes('oauth') ||
        url.includes('login') ||
        url.includes('signin') ||
        url.includes('sso')
      )
    } catch {
      return false
    }
  }

  // 检查是否是验证码相关的URL
  const isCaptchaUrl = (url: string) => {
    try {
      return (
        url.includes('captcha') ||
        url.includes('challenge') ||
        url.includes('cloudflare') ||
        url.includes('hcaptcha') ||
        url.includes('recaptcha')
      )
    } catch {
      return false
    }
  }

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

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview || !mountedRef.current) {
      return undefined
    }

    const handleNewWindow = (event: any) => {
      if (!mountedRef.current || !webview) return
      try {
        event.preventDefault()
        const url = event.url

        // 对于身份验证和验证码相关的URL，允许在新窗口中打开
        if (isAuthUrl(url) || isCaptchaUrl(url)) {
          // 使用默认浏览器打开身份验证页面
          window.open(url, '_blank', 'nodeIntegration=no,contextIsolation=yes')
        } else {
          // 其他URL在当前webview中打开
          webview.loadURL(url)
        }
      } catch (error) {
        console.error('Error handling new window:', error)
      }
    }

    const handleRedirect = (event: any) => {
      if (!mountedRef.current || !webview) return
      try {
        const currentUrl = new URL(tab.url)
        const newUrl = new URL(event.url)
        const currentTime = Date.now()

        // 处理身份验证相关的重定向
        if (isAuthUrl(event.url)) {
          // 检查是否是重复的重定向
          if (auth0StateRef.current && auth0StateRef.current.lastUrl === event.url) {
            const timeDiff = currentTime - auth0StateRef.current.timestamp
            if (timeDiff < 2000) {
              redirectCountRef.current += 1
              if (redirectCountRef.current > 2) {
                // 如果短时间内重定向次数过多，可能是循环重定向，尝试在新窗口中打开
                event.preventDefault()
                window.open(event.url, '_blank', 'nodeIntegration=no,contextIsolation=yes')
                return
              }
            } else {
              // 重置计数器，但保留URL
              redirectCountRef.current = 0
              auth0StateRef.current.timestamp = currentTime
            }
          } else {
            // 新的认证URL
            auth0StateRef.current = {
              lastUrl: event.url,
              timestamp: currentTime
            }
            redirectCountRef.current = 0
          }
          return // 允许认证相关的重定向
        }

        // 允许同域名跳转
        if (currentUrl.origin === newUrl.origin) {
          return
        }

        // 对于验证码，也允许在新窗口中打开
        if (isCaptchaUrl(event.url)) {
          event.preventDefault()
          window.open(event.url, '_blank', 'nodeIntegration=no,contextIsolation=yes')
          return
        }

        // 其他重定向在当前webview中处理
        event.preventDefault()
        setTimeout(() => {
          try {
            if (mountedRef.current && webview) {
              webview.loadURL(event.url)
            }
          } catch (error) {
            console.error('Error loading redirected URL:', error)
          }
        }, 100)
      } catch (error) {
        console.error('Error handling redirect:', error)
      }
    }

    const safeAddEventListener = (event: string, handler: (event: any) => void) => {
      try {
        webview.addEventListener(event, handler)
      } catch (error) {
        console.error(`Error adding ${event} listener:`, error)
      }
    }

    const safeRemoveEventListener = (event: string, handler: (event: any) => void) => {
      try {
        if (webview) {
          webview.removeEventListener(event, handler)
        }
      } catch (error) {
        console.error(`Error removing ${event} listener:`, error)
      }
    }

    safeAddEventListener('new-window', handleNewWindow)
    safeAddEventListener('will-navigate', handleRedirect)
    safeAddEventListener('did-navigate', handleRedirect)

    return () => {
      if (!mountedRef.current) return
      safeRemoveEventListener('new-window', handleNewWindow)
      safeRemoveEventListener('will-navigate', handleRedirect)
      safeRemoveEventListener('did-navigate', handleRedirect)
    }
  }, [tab.id, tab.url])

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
          webpreferences: 'nodeIntegration=no, contextIsolation=yes, javascript=yes, backgroundThrottling=false, webSecurity=yes, allowRunningInsecureContent=no, plugins=yes'
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
