import MinApp from '@renderer/components/MinApp'
import { Provider } from '@renderer/types'
import { Button, message } from 'antd'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { SettingSubtitle } from '..'

interface Props {
  provider: Provider
}

const GraphRAGSettings: FC<Props> = ({ provider }) => {
  const modalId = provider.models.filter((model) => model.id.includes('global'))[0]?.id
  const { t } = useTranslation()

  const onShowGraphRAG = async () => {
    try {
      await window.api.getAppInfo()
      await MinApp.start()
    } catch (error) {
      console.error('Failed to show GraphRAG:', error)
      message.error(t('errors.operationFailed'))
    }
  }

  if (!modalId) {
    return null
  }

  return (
    <Container>
      <SettingSubtitle>{t('words.knowledgeGraph')}</SettingSubtitle>
      <Button style={{ marginTop: 10 }} onClick={onShowGraphRAG}>
        {t('words.visualization')}
      </Button>
    </Container>
  )
}

const Container = styled.div``

export default GraphRAGSettings
