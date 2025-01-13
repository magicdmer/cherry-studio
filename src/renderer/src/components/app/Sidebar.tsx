import { FileSearchOutlined, FolderOutlined, PictureOutlined, TranslationOutlined } from '@ant-design/icons'
import { isMac } from '@renderer/config/constant'
import { isLocalAi, UserAvatar } from '@renderer/config/env'
import { useTheme } from '@renderer/context/ThemeProvider'
import useAvatar from '@renderer/hooks/useAvatar'
import { modelGenerating, useRuntime } from '@renderer/hooks/useRuntime'
import { useSettings } from '@renderer/hooks/useSettings'
import store from '@renderer/store'
import { setMinappShow } from '@renderer/store/runtime'
import { Tooltip } from 'antd'
import { Avatar } from 'antd'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import MinApp from '../MinApp'
import UserPopup from '../Popups/UserPopup'

const Sidebar: FC = () => {
  const { pathname } = useLocation()
  const avatar = useAvatar()
  const { minappShow } = useRuntime()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { windowStyle, sidebarIcons } = useSettings()
  const { theme, toggleTheme } = useTheme()

  const isRoute = (path: string): string => (pathname === path ? 'active' : '')
  const isRoutes = (path: string): string => (pathname.startsWith(path) ? 'active' : '')

  const onEditUser = () => UserPopup.show()

  const macTransparentWindow = isMac && windowStyle === 'transparent'
  const sidebarBgColor = macTransparentWindow ? 'transparent' : 'var(--navbar-background)'

  const to = async (path: string) => {
    await modelGenerating()

    // 如果当前在小程序页面，且点击了其他标签
    if (minappShow && path !== '/apps') {
      // 隐藏小程序但不重置状态
      store.dispatch(setMinappShow(false))
      MinApp.close()
    }

    // 如果点击了小程序标签且小程序当前隐藏
    if (path === '/apps' && !minappShow) {
      store.dispatch(setMinappShow(true))
      MinApp.start() // 直接启动MinAppBrowser
    }

    navigate(path)
  }

  const renderMainMenus = () => {
    return sidebarIcons.visible.map((icon) => {
      const iconMap = {
        assistants: <i className="iconfont icon-chat" />,
        agents: <i className="iconfont icon-business-smart-assistant" />,
        paintings: <PictureOutlined style={{ fontSize: 16 }} />,
        translate: <TranslationOutlined />,
        minapp: <i className="iconfont icon-appstore" />,
        knowledge: <FileSearchOutlined />,
        files: <FolderOutlined />
      }

      const pathMap = {
        assistants: '/',
        agents: '/agents',
        paintings: '/paintings',
        translate: '/translate',
        minapp: '/apps',
        knowledge: '/knowledge',
        files: '/files'
      }

      const path = pathMap[icon]
      const isActive = path === '/' ? isRoute(path) : isRoutes(path)

      return (
        <Tooltip key={icon} title={t(`${icon}.title`)} mouseEnterDelay={0.8} placement="right">
          <StyledLink onClick={() => to(path)}>
            <Icon className={isActive}>{iconMap[icon]}</Icon>
          </StyledLink>
        </Tooltip>
      )
    })
  }

  return (
    <Container
      id="app-sidebar"
      style={{
        backgroundColor: sidebarBgColor,
        zIndex: minappShow ? 10000 : 'initial'
      }}>
      <AvatarImg src={avatar || UserAvatar} draggable={false} className="nodrag" onClick={onEditUser} />
      <MainMenus>
        <Menus>{renderMainMenus()}</Menus>
      </MainMenus>
      <Menus>
        <Tooltip title={t('settings.theme.title')} mouseEnterDelay={0.8} placement="right">
          <Icon onClick={() => toggleTheme()}>
            {theme === 'dark' ? (
              <i className="iconfont icon-theme icon-dark1" />
            ) : (
              <i className="iconfont icon-theme icon-theme-light" />
            )}
          </Icon>
        </Tooltip>
        <Tooltip title={t('settings.title')} mouseEnterDelay={0.8} placement="right">
          <StyledLink onClick={() => to(isLocalAi ? '/settings/assistant' : '/settings/provider')}>
            <Icon className={pathname.startsWith('/settings') ? 'active' : ''}>
              <i className="iconfont icon-setting" />
            </Icon>
          </StyledLink>
        </Tooltip>
      </Menus>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  height: ${isMac ? 'calc(100vh - var(--navbar-height))' : '100vh'};
  -webkit-app-region: drag !important;
  margin-top: ${isMac ? 'var(--navbar-height)' : 0};
`

const AvatarImg = styled(Avatar)`
  width: 31px;
  height: 31px;
  background-color: var(--color-background-soft);
  margin-bottom: ${isMac ? '12px' : '12px'};
  margin-top: ${isMac ? '0px' : '2px'};
  border: none;
  cursor: pointer;
`
const MainMenus = styled.div`
  display: flex;
  flex: 1;
`

const Menus = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`

const Icon = styled.div`
  width: 35px;
  height: 35px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  margin-bottom: 5px;
  -webkit-app-region: none;
  border: 0.5px solid transparent;
  .iconfont,
  .anticon {
    color: var(--color-icon);
    font-size: 20px;
    text-decoration: none;
  }
  .anticon {
    font-size: 17px;
  }
  &:hover {
    background-color: var(--color-hover);
    cursor: pointer;
    .iconfont,
    .anticon {
      color: var(--color-icon-white);
    }
  }
  &.active {
    background-color: var(--color-active);
    border: 0.5px solid var(--color-border);
    .iconfont,
    .anticon {
      color: var(--color-icon-white);
    }
  }
`

const StyledLink = styled.div`
  text-decoration: none;
  -webkit-app-region: none;
  &* {
    user-select: none;
  }
`

export default Sidebar
