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

  const activeTab = React.useMemo(() => {
    if (!mountedRef.current) return null
    try {
      return tabs.find((tab) => tab.id === activeTabId)
    } catch (error) {
      console.error('Error finding active tab:', error)
      return null
    }
  }, [tabs, activeTabId])

  // 使用useMemo缓存子组件
  const content = React.useMemo(() => {
    if (!mountedRef.current) return null
    try {
      if (!activeTab) return null
      return activeTab.isHome ? <MinAppHome /> : <MinAppWebView key={activeTab.id} tab={activeTab} />
    } catch (error) {
      console.error('Error rendering content:', error)
      return null
    }
  }, [activeTab])

  if (!browserVisible) {
    return null
  }

  return (
    <Container style={{ display: browserVisible ? 'flex' : 'none' }}>
      <MinAppTabs />
      {content}
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

MinAppBrowser.displayName = 'MinAppBrowser'

export default MinAppBrowser
