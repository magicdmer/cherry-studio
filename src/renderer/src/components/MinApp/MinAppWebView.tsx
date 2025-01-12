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
}

const MinAppWebView: FC<Props> = ({ tab }) => {
  const webviewRef = useRef<WebviewElement | null>(null)

  useEffect(() => {
    const webview = webviewRef.current

    if (!webview) {
      return undefined
    }

    const handleDomReady = () => {
      webview.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )
    }

    const handleNewWindow = (event: any) => {
      event.preventDefault()
      webview.loadURL(event.url)
    }

    webview.addEventListener('dom-ready', handleDomReady)
    webview.addEventListener('new-window', handleNewWindow)
    webview.addEventListener('will-navigate', (event: any) => {
      const currentUrl = new URL(tab.url)
      const newUrl = new URL(event.url)
      if (currentUrl.origin === newUrl.origin) {
        return
      }

      event.preventDefault()
      webview.loadURL(event.url)
    })

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady)
      webview.removeEventListener('new-window', handleNewWindow)
    }
  }, [tab.id])

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
          partition: 'persist:minapp',
          webpreferences: 'contextIsolation=no, webSecurity=no',
          allowpopups: true
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
