import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { AppLogo, UserAvatar } from '@renderer/config/env'
import type { UpdateInfo } from 'electron-updater'

export interface UpdateState {
  info: UpdateInfo | null
  checking: boolean
  downloading: boolean
  downloadProgress: number
  available: boolean
}

export interface WebDAVSyncState {
  lastSyncTime: number | null
  syncing: boolean
  lastSyncError: string | null
}

export interface MinAppTab {
  id: string
  title: string
  url: string
  favicon?: string
  isHome: boolean
}

export interface MinAppState {
  tabs: MinAppTab[]
  activeTabId: string | null
  browserVisible: boolean
}

export interface RuntimeState {
  avatar: string
  generating: boolean
  minappShow: boolean
  minapp: MinAppState
  searching: boolean
  filesPath: string
  update: UpdateState
  webdavSync: WebDAVSyncState
}

const initialState: RuntimeState = {
  avatar: UserAvatar,
  generating: false,
  minappShow: false,
  minapp: {
    tabs: [{ id: 'home', title: '小程序', url: '', isHome: true }],
    activeTabId: 'home',
    browserVisible: false
  },
  searching: false,
  filesPath: '',
  update: {
    info: null,
    checking: false,
    downloading: false,
    downloadProgress: 0,
    available: false
  },
  webdavSync: {
    lastSyncTime: null,
    syncing: false,
    lastSyncError: null
  }
}

const runtimeSlice = createSlice({
  name: 'runtime',
  initialState,
  reducers: {
    setAvatar: (state, action: PayloadAction<string | null>) => {
      state.avatar = action.payload || AppLogo
    },
    setGenerating: (state, action: PayloadAction<boolean>) => {
      state.generating = action.payload
    },
    setMinappShow: (state, action: PayloadAction<boolean>) => {
      state.minappShow = action.payload
    },
    setSearching: (state, action: PayloadAction<boolean>) => {
      state.searching = action.payload
    },
    setFilesPath: (state, action: PayloadAction<string>) => {
      state.filesPath = action.payload
    },
    setUpdateState: (state, action: PayloadAction<Partial<UpdateState>>) => {
      state.update = { ...state.update, ...action.payload }
    },
    setWebDAVSyncState: (state, action: PayloadAction<Partial<WebDAVSyncState>>) => {
      state.webdavSync = { ...state.webdavSync, ...action.payload }
    },
    setMinappBrowserVisible: (state, action: PayloadAction<boolean>) => {
      state.minapp.browserVisible = action.payload
    },
    addMinappTab: (state, action: PayloadAction<Omit<MinAppTab, 'id'>>) => {
      const id = Math.random().toString(36).substring(7)
      state.minapp.tabs.push({ ...action.payload, id })
      state.minapp.activeTabId = id
    },
    closeMinappTab: (state, action: PayloadAction<string>) => {
      const index = state.minapp.tabs.findIndex((tab) => tab.id === action.payload)
      if (index !== -1) {
        state.minapp.tabs.splice(index, 1)
        if (state.minapp.activeTabId === action.payload) {
          state.minapp.activeTabId = state.minapp.tabs[index - 1]?.id || 'home'
        }
      }
    },
    setActiveMinappTab: (state, action: PayloadAction<string>) => {
      const tabId = action.payload
      const tabExists = state.minapp.tabs.some((tab) => tab.id === tabId)
      if (tabExists) {
        state.minapp.activeTabId = tabId
        console.log('Tab activated:', tabId)
      } else {
        console.warn('Attempted to activate non-existent tab:', tabId)
      }
    },
    updateMinappTab: (state, action: PayloadAction<Partial<MinAppTab> & { id: string }>) => {
      const tab = state.minapp.tabs.find((t) => t.id === action.payload.id)
      if (tab) {
        Object.assign(tab, action.payload)
      }
    }
  }
})

export const {
  setAvatar,
  setGenerating,
  setMinappShow,
  setSearching,
  setFilesPath,
  setUpdateState,
  setWebDAVSyncState,
  setMinappBrowserVisible,
  addMinappTab,
  closeMinappTab,
  setActiveMinappTab,
  updateMinappTab
} = runtimeSlice.actions

export default runtimeSlice.reducer
