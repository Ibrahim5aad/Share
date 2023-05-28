/**
 * Data stored in Zustand for Attached Models state.
 *
 * @param {Function} set
 * @param {Function} get
 * @return {object} Zustand slice.
 */
export default function createAttachedModelsSlice(set) {
  return {
    attachedModels: [],

    addAttachedModel: (model) =>
      set((state) => ({
        attachedModels: [...state.attachedModels, model],
      })),

    removeAttachedModel: (modelId) =>
      set((state) => ({
        attachedModels: state.attachedModels.filter((m) => m.model.modelID !== modelId),
      })),

    setAttachedModels: (models) => set(() => ({attachedModels: models})),
  }
}
