import { CloseOutlined, DeleteOutlined, HomeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import store from '@renderer/store'
import { useAppSelector } from '@renderer/store'
import { addMinappTab, closeMinappTab, setActiveMinappTab } from '@renderer/store/runtime'
import { Dropdown, Menu, message, Tooltip } from 'antd'
import * as React from 'react'
import styled from 'styled-components'

interface WebviewElement extends HTMLElement {
  getWebContents: () => any
  reload: () => void
}

const MinAppTabs: React.FC = React.memo(() => {
  const { tabs, activeTabId } = useAppSelector((state) => state.runtime.minapp)

  const onTabClick = React.useCallback((_: React.MouseEvent, tabId: string) => {
    store.dispatch(setActiveMinappTab(tabId))
  }, [])

  const onTabClose = React.useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation()
      if (tabs.length > 1) {
        store.dispatch(closeMinappTab(tabId))
      }
    },
    [tabs.length]
  )

  const onNewTab = React.useCallback(() => {
    store.dispatch(
      addMinappTab({
        title: '新标签页',
        url: '',
        isHome: true
      })
    )
  }, [])

  const safeGetWebview = React.useCallback((tabId: string): WebviewElement | null => {
    try {
      return document.querySelector(`webview[data-tab-id="${tabId}"]`) as WebviewElement
    } catch (error) {
      console.error('Error getting webview:', error)
      return null
    }
  }, [])

  const clearCookies = React.useCallback(async (tab: any) => {
    try {
      const webview = safeGetWebview(tab.id)
      if (!webview) {
        message.error('无法访问网页内容')
        return
      }

      let webContents: any = null
      try {
        webContents = webview.getWebContents()
      } catch (error) {
        console.error('Error getting WebContents:', error)
        message.error('无法访问网页内容')
        return
      }

      if (!webContents || !webContents.session) {
        message.error('无法访问网页内容')
        return
      }

      try {
        await webContents.session.clearStorageData({
          storages: ['cookies', 'localstorage', 'caches', 'indexdb', 'serviceworkers']
        })
        message.success('已清除网站数据')
        webview.reload()
      } catch (error) {
        console.error('Error clearing storage data:', error)
        message.error('清除网站数据失败')
      }
    } catch (error) {
      console.error('Error in clearCookies:', error)
      message.error('操作失败')
    }
  }, [])

  const reloadTab = React.useCallback(
    (tab: any) => {
      try {
        const webview = safeGetWebview(tab.id)
        if (webview) {
          webview.reload()
        }
      } catch (error) {
        console.error('Error reloading tab:', error)
        message.error('刷新失败')
      }
    },
    [safeGetWebview]
  )

  const getContextMenu = React.useCallback(
    (tab: any) => {
      if (tab.isHome) {
        return <Menu items={[]} />
      }

      const items = [
        {
          key: 'refresh',
          icon: <ReloadOutlined />,
          label: '刷新',
          onClick: () => reloadTab(tab)
        },
        {
          key: 'clearCookies',
          icon: <DeleteOutlined />,
          label: '清除网站数据',
          onClick: () => clearCookies(tab)
        }
      ]
      return <Menu items={items} />
    },
    [clearCookies, reloadTab]
  )

  // 使用useMemo缓存标签页列表的渲染
  const tabElements = React.useMemo(() => {
    return tabs.map((tab) => (
      <Dropdown key={tab.id} overlay={getContextMenu(tab)} trigger={['contextMenu']}>
        <Tab active={tab.id === activeTabId} onClick={(e) => onTabClick(e, tab.id)}>
          <TabContent>
            {tab.isHome ? <HomeOutlined style={{ fontSize: 14 }} /> : tab.favicon && <TabIcon src={tab.favicon} />}
            <TabTitle>{tab.title}</TabTitle>
            {!tab.isHome && (
              <CloseButton onClick={(e) => onTabClose(e, tab.id)}>
                <CloseOutlined style={{ fontSize: 10 }} />
              </CloseButton>
            )}
          </TabContent>
        </Tab>
      </Dropdown>
    ))
  }, [tabs, activeTabId, onTabClick, onTabClose, getContextMenu])

  return (
    <TabsContainer>
      {tabElements}
      <NewTabButton onClick={onNewTab}>
        <Tooltip title="新标签页">
          <PlusOutlined style={{ fontSize: 12 }} />
        </Tooltip>
      </NewTabButton>
    </TabsContainer>
  )
})

const TabsContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 32px;
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  padding: 0 8px;
  user-select: none;
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
  z-index: 101;
  pointer-events: auto;

  &::-webkit-scrollbar {
    display: none;
  }
`

const Tab = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 8px;
  margin-right: 4px;
  border-radius: 6px;
  background-color: ${(props) => (props.active ? 'var(--color-background-soft)' : 'transparent')};
  border: 1px solid ${(props) => (props.active ? 'var(--color-border)' : 'transparent')};
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  width: 160px;

  &:hover {
    background-color: var(--color-background-soft);
  }
`

const TabContent = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  overflow: hidden;
`

const TabIcon = styled.img`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
`

const TabTitle = styled.span`
  font-size: 12px;
  color: var(--color-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
`

const CloseButton = styled.div`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--color-text-2);
  flex-shrink: 0;
  opacity: 0;
  transition: all 0.2s;

  ${TabContent}:hover & {
    opacity: 1;
  }

  &:hover {
    background-color: var(--color-background-mute);
    color: var(--color-text-1);
  }
`

const NewTabButton = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--color-text-2);
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background-color: var(--color-background-soft);
    color: var(--color-text-1);
  }
`

MinAppTabs.displayName = 'MinAppTabs'

export default MinAppTabs
