import { createContext, useContext } from 'react'

export const WorkModeContext = createContext(false)
export const useWorkMode = () => useContext(WorkModeContext)

export const WORK_LOGO = 'https://ik.imagekit.io/businesswith/tr:w-200,h-100,cm-pad_resize,dpr-2/logo/hypergene-logo.png'
