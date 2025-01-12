import { MinAppTab } from '@renderer/store/runtime'
import { FC, useEffect, useRef } from 'react'
import styled from 'styled-components'

interface Props {
  tab: MinAppTab
}

interface WebviewElement extends HTMLElement {
  addEventListener: (event: string, callback: (event: any) => void) => void
  removeEventListener: (event: string, callback: (event: any) => void) => void
  loadURL: (url: string) => void
  getTitle: () => string
  reload: () => void
  setUserAgent: (userAgent: string) => void
  getWebContents: () => any
  session: any
  destroy: () => void
}

const MinAppWebView: FC<Props> = ({ tab }) => {
  const webviewRef = useRef<WebviewElement | null>(null)
  const mountedRef = useRef(true)
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const redirectCountRef = useRef<number>(0)
  const webContentsRef = useRef<any>(null)
  const auth0StateRef = useRef<{ lastUrl: string; timestamp: number } | null>(null)

  // 检查是否是 ChatGPT 相关的 URL
  const isChatGPTUrl = (url: string) => {
    try {
      const urlObj = new URL(url)
      return (
        urlObj.hostname === 'chat.openai.com' ||
        urlObj.hostname === 'auth.openai.com' ||
        urlObj.hostname === 'auth0.openai.com'
      )
    } catch {
      return false
    }
  }

  // 检查是否是 2FA 验证页面
  const is2FAPage = (url: string) => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname === 'auth0.openai.com' && (url.includes('/mfa') || url.includes('/u/mfa-otp-challenge'))
    } catch {
      return false
    }
  }

  // 检查是否是错误页面
  const isErrorPage = (url: string) => {
    try {
      return url.includes('error') || url.includes('rate-limited')
    } catch {
      return false
    }
  }

  // 安全地获取 WebContents
  const safeGetWebContents = () => {
    try {
      if (!webviewRef.current || !mountedRef.current) return null
      if (webContentsRef.current) return webContentsRef.current
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

  const cleanupWebview = () => {
    try {
      if (webContentsRef.current) {
        try {
          webContentsRef.current.session.clearStorageData({
            storages: ['serviceworkers']
          })
        } catch (error) {
          console.error('Error clearing storage data:', error)
        }
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
  }

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

  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current)
      }

      // 对于 ChatGPT，延迟清理以确保所有操作完成
      if (isChatGPTUrl(tab.url)) {
        cleanupTimeoutRef.current = setTimeout(() => {
          cleanupWebview()
        }, 1000)
      } else {
        cleanupWebview()
      }
    }
  }, [tab.url])

  useEffect(() => {
    const webview = webviewRef.current

    if (!webview || !mountedRef.current) {
      return undefined
    }

    const handleNewWindow = (event: any) => {
      if (!mountedRef.current || !webview) return
      try {
        event.preventDefault()
        if (isChatGPTUrl(event.url)) {
          if (is2FAPage(event.url)) {
            // 重置 auth0 状态
            auth0StateRef.current = {
              lastUrl: event.url,
              timestamp: Date.now()
            }
            redirectCountRef.current = 0
          }
          setTimeout(() => {
            try {
              if (mountedRef.current && webview) {
                webview.loadURL(event.url)
              }
            } catch (error) {
              console.error('Error loading ChatGPT URL:', error)
            }
          }, 100)
        } else {
          webview.loadURL(event.url)
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

        // 处理 ChatGPT 相关的 URL
        if (isChatGPTUrl(currentUrl.href) || isChatGPTUrl(newUrl.href)) {
          // 检查是否是 2FA 页面
          if (is2FAPage(event.url)) {
            // 检查是否是重复的 URL
            if (auth0StateRef.current && auth0StateRef.current.lastUrl === event.url) {
              const timeDiff = currentTime - auth0StateRef.current.timestamp
              if (timeDiff < 2000) {
                redirectCountRef.current += 1
                if (redirectCountRef.current > 2) {
                  event.preventDefault()
                  console.log('Prevented potential infinite redirect in 2FA page')
                  return
                }
              } else {
                // 重置计数器，但保留 URL
                redirectCountRef.current = 0
                auth0StateRef.current.timestamp = currentTime
              }
            } else {
              // 新的 2FA URL
              auth0StateRef.current = {
                lastUrl: event.url,
                timestamp: currentTime
              }
              redirectCountRef.current = 0
            }
          } else if (isErrorPage(event.url)) {
            // 如果是错误页面，阻止重定向
            event.preventDefault()
            return
          }
          return // 允许其他 ChatGPT 相关跳转
        }

        // 允许同域名跳转
        if (currentUrl.origin === newUrl.origin) {
          return
        }

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

  if (tab.isHome) {
    return null
  }

  return (
    <Container>
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
          allowpopups: true,
          partition: 'persist:webview',
          webpreferences: 'nodeIntegration=no, contextIsolation=yes, javascript=yes'
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
