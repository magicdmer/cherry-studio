import { Message } from '@renderer/types'
import { Alert } from 'antd'
import { t } from 'i18next'
import { FC } from 'react'

import Markdown from '../Markdown/Markdown'

const MessageError: FC<{ message: Message }> = ({ message }) => {
  return (
    <>
      <Alert
        description={message.errorMessage || t('error.chat.response')}
        type="error"
        style={{ marginBottom: 15, padding: 10, fontSize: 12 }}
      />
      {message.content && <Markdown message={message} />}
    </>
  )
}

export default MessageError
