import AiProvider from '@renderer/aiCore'
import { DEFAULT_WEBSEARCH_RAG_DOCUMENT_COUNT } from '@renderer/config/constant'
import Logger from '@renderer/config/logger'
import { isEmbeddingModel, isRerankModel } from '@renderer/config/models'
import { NOT_SUPPORTED_REANK_PROVIDERS } from '@renderer/config/providers'
import { useProviders } from '@renderer/hooks/useProvider'
import { useWebSearchSettings } from '@renderer/hooks/useWebSearchProviders'
import { SettingDivider, SettingRow, SettingRowTitle } from '@renderer/pages/settings'
import { getModelUniqId } from '@renderer/services/ModelService'
import { Model } from '@renderer/types'
import { Button, InputNumber, Select, Slider, Tooltip } from 'antd'
import { find, sortBy } from 'lodash'
import { ChevronDown, Info, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const INPUT_BOX_WIDTH = '200px'

const RagSettings = () => {
  const { t } = useTranslation()
  const { providers } = useProviders()
  const { compressionConfig, updateCompressionConfig } = useWebSearchSettings()
  const [loadingDimensions, setLoadingDimensions] = useState(false)

  const embeddingModels = useMemo(() => {
    return providers
      .map((p) => p.models)
      .flat()
      .filter((model) => isEmbeddingModel(model))
  }, [providers])

  const rerankModels = useMemo(() => {
    return providers
      .map((p) => p.models)
      .flat()
      .filter((model) => isRerankModel(model))
  }, [providers])

  const embeddingSelectOptions = useMemo(() => {
    return providers
      .filter((p) => p.models.length > 0)
      .map((p) => ({
        label: p.isSystem ? t(`provider.${p.id}`) : p.name,
        title: p.name,
        options: sortBy(p.models, 'name')
          .filter((model) => isEmbeddingModel(model))
          .map((m) => ({
            label: m.name,
            value: getModelUniqId(m),
            providerId: p.id,
            modelId: m.id
          }))
      }))
      .filter((group) => group.options.length > 0)
  }, [providers, t])

  const rerankSelectOptions = useMemo(() => {
    return providers
      .filter((p) => p.models.length > 0)
      .filter((p) => !NOT_SUPPORTED_REANK_PROVIDERS.includes(p.id))
      .map((p) => ({
        label: p.isSystem ? t(`provider.${p.id}`) : p.name,
        title: p.name,
        options: sortBy(p.models, 'name')
          .filter((model) => isRerankModel(model))
          .map((m) => ({
            label: m.name,
            value: getModelUniqId(m)
          }))
      }))
      .filter((group) => group.options.length > 0)
  }, [providers, t])

  const handleEmbeddingModelChange = (modelValue: string) => {
    const selectedModel = find(embeddingModels, JSON.parse(modelValue)) as Model
    updateCompressionConfig({ embeddingModel: selectedModel })
  }

  const handleRerankModelChange = (modelValue?: string) => {
    const selectedModel = modelValue ? (find(rerankModels, JSON.parse(modelValue)) as Model) : undefined
    updateCompressionConfig({ rerankModel: selectedModel })
  }

  const handleEmbeddingDimensionsChange = (value: number | null) => {
    updateCompressionConfig({ embeddingDimensions: value || undefined })
  }

  const handleDocumentCountChange = (value: number) => {
    updateCompressionConfig({ documentCount: value })
  }

  const handleAutoGetDimensions = async () => {
    if (!compressionConfig?.embeddingModel) {
      Logger.log('[RagSettings] handleAutoGetDimensions: no embedding model')
      window.message.error(t('settings.websearch.compression.error.embedding_model_required'))
      return
    }

    const provider = providers.find((p) => p.id === compressionConfig.embeddingModel?.provider)
    if (!provider) {
      Logger.log('[RagSettings] handleAutoGetDimensions: provider not found')
      window.message.error(t('settings.websearch.compression.error.provider_not_found'))
      return
    }

    setLoadingDimensions(true)
    try {
      const aiProvider = new AiProvider(provider)
      const dimensions = await aiProvider.getEmbeddingDimensions(compressionConfig.embeddingModel)

      updateCompressionConfig({ embeddingDimensions: dimensions })

      window.message.success(t('settings.websearch.compression.info.dimensions_auto_success', { dimensions }))
    } catch (error) {
      Logger.error('[RagSettings] handleAutoGetDimensions: failed to get embedding dimensions', error)
      window.message.error(t('settings.websearch.compression.error.dimensions_auto_failed'))
    } finally {
      setLoadingDimensions(false)
    }
  }

  return (
    <>
      <SettingRow>
        <SettingRowTitle>{t('models.embedding_model')}</SettingRowTitle>
        <Select
          value={compressionConfig?.embeddingModel ? getModelUniqId(compressionConfig.embeddingModel) : undefined}
          style={{ width: INPUT_BOX_WIDTH }}
          options={embeddingSelectOptions}
          placeholder={t('settings.models.empty')}
          onChange={handleEmbeddingModelChange}
          allowClear={false}
          showSearch
          suffixIcon={<ChevronDown size={16} color="var(--color-border)" />}
        />
      </SettingRow>
      <SettingDivider />

      <SettingRow>
        <SettingRowTitle>
          {t('models.embedding_dimensions')}
          <Tooltip title={t('settings.websearch.compression.rag.embedding_dimensions.tooltip')}>
            <Info size={16} color="var(--color-icon)" style={{ marginLeft: 5, cursor: 'pointer' }} />
          </Tooltip>
        </SettingRowTitle>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: INPUT_BOX_WIDTH }}>
          <InputNumber
            value={compressionConfig?.embeddingDimensions}
            style={{ flex: 1 }}
            placeholder={t('settings.websearch.compression.rag.embedding_dimensions.placeholder')}
            min={0}
            onChange={handleEmbeddingDimensionsChange}
          />
          <Tooltip title={t('settings.websearch.compression.rag.embedding_dimensions.auto_get')}>
            <Button
              icon={<RefreshCw size={16} />}
              loading={loadingDimensions}
              disabled={!compressionConfig?.embeddingModel}
              onClick={handleAutoGetDimensions}
            />
          </Tooltip>
        </div>
      </SettingRow>
      <SettingDivider />

      <SettingRow>
        <SettingRowTitle>{t('models.rerank_model')}</SettingRowTitle>
        <Select
          value={compressionConfig?.rerankModel ? getModelUniqId(compressionConfig.rerankModel) : undefined}
          style={{ width: INPUT_BOX_WIDTH }}
          options={rerankSelectOptions}
          placeholder={t('settings.models.empty')}
          onChange={handleRerankModelChange}
          allowClear
          showSearch
          suffixIcon={<ChevronDown size={16} color="var(--color-border)" />}
        />
      </SettingRow>
      <SettingDivider />

      <SettingRow>
        <SettingRowTitle>
          {t('settings.websearch.compression.rag.document_count')}
          <Tooltip title={t('settings.websearch.compression.rag.document_count.tooltip')} placement="right">
            <Info size={16} color="var(--color-icon)" style={{ marginLeft: 5, cursor: 'pointer' }} />
          </Tooltip>
        </SettingRowTitle>
        <div style={{ width: INPUT_BOX_WIDTH }}>
          <Slider
            value={compressionConfig?.documentCount || DEFAULT_WEBSEARCH_RAG_DOCUMENT_COUNT}
            min={1}
            max={10}
            step={1}
            onChange={handleDocumentCountChange}
            marks={{
              1: t('settings.websearch.compression.rag.document_count.default'),
              3: '3',
              10: '10'
            }}
          />
        </div>
      </SettingRow>
    </>
  )
}

export default RagSettings
