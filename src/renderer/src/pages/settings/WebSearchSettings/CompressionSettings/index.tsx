import { useWebSearchSettings } from '@renderer/hooks/useWebSearchProviders'
import { SettingDivider, SettingGroup, SettingRow, SettingRowTitle, SettingTitle } from '@renderer/pages/settings'
import { Select } from 'antd'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import CutoffSettings from './CutoffSettings'
import RagSettings from './RagSettings'

const CompressionSettings = () => {
  const { t } = useTranslation()
  const { compressionConfig, updateCompressionConfig } = useWebSearchSettings()

  const compressionMethodOptions = [
    { value: 'none', label: t('settings.websearch.compression.method.none') },
    { value: 'cutoff', label: t('settings.websearch.compression.method.cutoff') },
    { value: 'rag', label: t('settings.websearch.compression.method.rag') }
  ]

  const handleCompressionMethodChange = (method: 'none' | 'cutoff' | 'rag') => {
    updateCompressionConfig({ method })
  }

  return (
    <SettingGroup>
      <SettingTitle>{t('settings.websearch.compression.title')}</SettingTitle>
      <SettingDivider />

      <SettingRow>
        <SettingRowTitle>{t('settings.websearch.compression.method')}</SettingRowTitle>
        <Select
          value={compressionConfig?.method || 'none'}
          style={{ width: '200px' }}
          onChange={handleCompressionMethodChange}
          options={compressionMethodOptions}
          suffixIcon={<ChevronDown size={16} color="var(--color-border)" />}
        />
      </SettingRow>
      <SettingDivider />

      {compressionConfig?.method === 'cutoff' && <CutoffSettings />}
      {compressionConfig?.method === 'rag' && <RagSettings />}
    </SettingGroup>
  )
}

export default CompressionSettings
