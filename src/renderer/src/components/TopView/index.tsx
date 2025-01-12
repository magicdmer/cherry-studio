import { useAppInit } from '@renderer/hooks/useAppInit'
import { message, Modal } from 'antd'
import React, { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react'

import { Box } from '../Layout'

let onPop = () => {}
let onShow = ({ element, id }: { element: React.FC | React.ReactNode; id: string }) => {
  element
  id
}
let onHide = (id: string) => {
  id
}
let onHideAll = () => {}

interface Props {
  children?: React.ReactNode
}

type ElementItem = {
  id: string
  element: React.FC | React.ReactNode
}

const TopViewContainer: React.FC<Props> = ({ children }) => {
  const [elements, setElements] = useState<ElementItem[]>([])
  const elementsRef = useRef<ElementItem[]>([])
  const mountedRef = useRef(true)
  elementsRef.current = elements

  const [messageApi, messageContextHolder] = message.useMessage()
  const [modal, modalContextHolder] = Modal.useModal()

  useAppInit()

  useEffect(() => {
    window.message = messageApi
    window.modal = modal

    return () => {
      mountedRef.current = false
      // 清理所有元素
      elementsRef.current = []
      setElements([])
    }
  }, [messageApi, modal])

  onPop = () => {
    if (!mountedRef.current) return
    try {
      const views = [...elementsRef.current]
      views.pop()
      elementsRef.current = views
      setElements(elementsRef.current)
    } catch (error) {
      console.error('Error in TopView pop:', error)
    }
  }

  onShow = ({ element, id }: ElementItem) => {
    if (!mountedRef.current) return
    try {
      if (!elementsRef.current.find((el) => el.id === id)) {
        const newElements = elementsRef.current.concat([{ element, id }])
        elementsRef.current = newElements
        setElements(newElements)
      }
    } catch (error) {
      console.error('Error in TopView show:', error)
    }
  }

  onHide = (id: string) => {
    if (!mountedRef.current) return
    try {
      const filteredElements = elementsRef.current.filter((el) => el.id !== id)
      elementsRef.current = filteredElements
      setElements(filteredElements)
    } catch (error) {
      console.error('Error in TopView hide:', error)
    }
  }

  onHideAll = () => {
    if (!mountedRef.current) return
    try {
      setElements([])
      elementsRef.current = []
    } catch (error) {
      console.error('Error in TopView hideAll:', error)
    }
  }

  const FullScreenContainer: React.FC<PropsWithChildren> = useCallback(({ children }) => {
    return (
      <Box flex={1} position="absolute" w="100%" h="100%">
        <Box position="absolute" w="100%" h="100%" onClick={onPop} />
        {children}
      </Box>
    )
  }, [])

  return (
    <>
      {children}
      {messageContextHolder}
      {modalContextHolder}
      {elements.map(({ element: Element, id }) => (
        <FullScreenContainer key={`TOPVIEW_${id}`}>
          {typeof Element === 'function' ? <Element /> : Element}
        </FullScreenContainer>
      ))}
    </>
  )
}

export const TopView = {
  show: (element: React.FC | React.ReactNode, id: string) => onShow({ element, id }),
  hide: (id: string) => onHide(id),
  clear: () => onHideAll(),
  pop: onPop
}

export default TopViewContainer
