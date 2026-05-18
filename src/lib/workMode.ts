import { createContext, useContext } from 'react'

export const WorkModeContext = createContext(false)
export const useWorkMode = () => useContext(WorkModeContext)

export const WORK_LOGO = '/hypergene-640x346-1.png'
