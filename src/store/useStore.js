import create from 'zustand'
import createIFCSlice from './IFCSlice'
import createNotesSlice from './NotesSlice'
import createUISlice from './UISlice'
import createUIVisibilitySlice from './UIVisibilitySlice'
import createRepositorySlice from './RepositorySlice'
import createIsolatorSlice from './IfcIsolatorSlice'
import createAttachedModelsSlice from './AttachedModelsSlice'


const useStore = create((set, get) => ({
  ...createIFCSlice(set, get),
  ...createNotesSlice(set, get),
  ...createRepositorySlice(set, get),
  ...createUISlice(set, get),
  ...createUIVisibilitySlice(set, get),
  ...createIsolatorSlice(set, get),
  ...createAttachedModelsSlice(set),
}))

export default useStore
