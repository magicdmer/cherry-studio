import { useAppSelector } from '@renderer/store'
import * as React from 'react'
import styled from 'styled-components'

import MinAppHome from './MinAppHome'
import MinAppTabs from './MinAppTabs'
import MinAppWebView from './MinAppWebView'

const MinAppBrowser: React.FC = React.memo(() => {
  const { browserVisible, tabs, activeTabId } = useAppSelector((state) => state.runtime.minapp)
  const mountedRef = React.useRef(true)

  React.useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // 渲染所有标签页的webview，通过CSS控制显示/隐藏
  const content = React.useMemo(() => {
    if (!mountedRef.current) return null
    try {
      // 分别渲染主页和webview内容
      const homeContent = tabs
        .filter((tab) => tab.isHome)
        .map((tab) => (
          <TabContainer key={tab.id} active={tab.id === activeTabId}>
            <MinAppHome />
          </TabContainer>
        ))

      const webviewContent = tabs
        .filter((tab) => !tab.isHome)
        .map((tab) => (
          <TabContainer key={tab.id} active={tab.id === activeTabId}>
            <MinAppWebView tab={tab} />
          </TabContainer>
        ))

      return [...homeContent, ...webviewContent]
    } catch (error) {
      console.error('Error rendering content:', error)
      return null
    }
  }, [tabs, activeTabId])

  if (!browserVisible) {
    return null
  }

  return (
    <Container style={{ display: browserVisible ? 'flex' : 'none' }}>
      <MinAppTabs />
      <WebViewContainer>{content}</WebViewContainer>
    </Container>
  )
})

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100% - var(--navbar-height));
  width: calc(100% - var(--sidebar-width));
  background-color: var(--color-background);
  padding-top: 8px;
  position: fixed;
  top: var(--navbar-height);
  left: var(--sidebar-width);
  right: 0;
  bottom: 0;
  z-index: 100;
  pointer-events: auto;
`

const WebViewContainer = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  overflow: hidden;
`

const TabContainer = styled.div<{ active: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: ${(props) => (props.active ? 'flex' : 'none')};
  flex: 1;
  overflow: hidden;
`

MinAppBrowser.displayName = 'MinAppBrowser'

export default MinAppBrowser
