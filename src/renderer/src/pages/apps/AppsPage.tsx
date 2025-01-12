import { Navbar, NavbarCenter } from '@renderer/components/app/Navbar'
import { Center } from '@renderer/components/Layout'
import { getAllMinApps } from '@renderer/config/minapps'
import { Empty } from 'antd'
import { isEmpty } from 'lodash'
import { FC, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import App from './App'

const AppsPage: FC = () => {
  const { t } = useTranslation()
  const apps = useMemo(() => getAllMinApps(), [])

  return (
    <Container>
      <Navbar>
        <NavbarCenter style={{ borderRight: 'none', justifyContent: 'center' }}>{t('minapp.title')}</NavbarCenter>
      </Navbar>
      <ContentContainer id="content-container">
        <AppsContainer>
          {apps.map((app) => (
            <App key={app.id} app={app} />
          ))}
          {isEmpty(apps) && (
            <Center style={{ flex: 1 }}>
              <Empty />
            </Center>
          )}
        </AppsContainer>
      </ContentContainer>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
`

const ContentContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`

const AppsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 20px;
  padding: 20px;
`

export default AppsPage
