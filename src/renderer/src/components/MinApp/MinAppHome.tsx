import { getAllMinApps } from '@renderer/config/minapps'
import store from '@renderer/store'
import { addMinappTab, closeMinappTab, setActiveMinappTab } from '@renderer/store/runtime'
import { MinAppType } from '@renderer/types'
import { Avatar } from 'antd'
import { FC } from 'react'
import styled from 'styled-components'

const MinAppHome: FC = () => {
  const apps = getAllMinApps()

  const onAppClick = (app: MinAppType) => {
    // 获取当前所有标签页
    const state = store.getState()
    const { tabs, activeTabId } = state.runtime.minapp

    // 查找是否已存在相同 URL 的标签页
    const existingTab = tabs.find((tab) => tab.url === app.url)

    if (existingTab) {
      // 如果存在，直接激活该标签页
      store.dispatch(setActiveMinappTab(existingTab.id))

      // 如果当前标签页是空的新标签页，则关闭它
      const currentTab = tabs.find((tab) => tab.id === activeTabId)
      if (currentTab && currentTab.isHome && !currentTab.url && tabs.length > 1) {
        store.dispatch(closeMinappTab(currentTab.id))
      }
    } else {
      // 如果不存在，创建新标签页
      store.dispatch(
        addMinappTab({
          title: app.name,
          url: app.url,
          favicon: app.logo,
          isHome: false
        })
      )

      // 关闭当前的空白新标签页
      const currentTab = tabs.find((tab) => tab.id === activeTabId)
      if (currentTab && currentTab.isHome && !currentTab.url && tabs.length > 1) {
        store.dispatch(closeMinappTab(currentTab.id))
      }
    }
  }

  return (
    <Container>
      <Grid>
        {apps.map((app) => (
          <AppItem key={app.id} onClick={() => onAppClick(app)}>
            <AppIcon src={app.logo} />
            <AppName>{app.name}</AppName>
          </AppItem>
        ))}
      </Grid>
    </Container>
  )
}

const Container = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  overflow-x: hidden;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 90px));
  gap: 16px;
  justify-content: center;
  padding: 0 10px;
`

const AppItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  width: 90px;

  &:hover {
    background-color: var(--color-background-soft);
  }
`

const AppIcon = styled(Avatar)`
  width: 50px;
  height: 50px;
  margin-bottom: 8px;
`

const AppName = styled.div`
  font-size: 12px;
  color: var(--color-text-1);
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
  min-height: 32px;
`

export default MinAppHome
