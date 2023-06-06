import { IfcElement } from "../Infrastructure/IfcElement";

/**
 * Data stored in Zustand for Isolator state.
 *
 * @param {Function} set
 * @param {Function} get
 * @return {object} Zustand slice.
 */
export default function createIsolatorSlice(set, get) {
  return {
    hiddenElements: [],
    isolatedElements: {},
    isTempIsolationModeOn: false,

    hideElements: (hiddenElements) =>
      set((state) => ({
        hiddenElements: [...new Set([...state.hiddenElements, ...hiddenElements])],
      })),

    unhideElements: (unhiddenElements) =>
      set((state) => ({
        hiddenElements: state.hiddenElements.filter((elementId) => !unhiddenElements.includes(elementId)),
      })),

    unhideElementsFromModel: (modelId) =>
      set((state) => ({
        hiddenElements: state.hiddenElements.filter((elementId) => IfcElement.getModelId(elementId) !== modelId),
      })),

    updateIsolatedStatus: (elementId, isIsolated) =>
      set((state) => ({
        isolatedElements: {
          ...state.isolatedElements, [elementId]: isIsolated,
        },
      })),


    setHiddenElements: (elements) => set(() => ({hiddenElements: elements})),
    setIsolatedElements: (elements) => set(() => ({isolatedElements: elements})),
    setIsTempIsolationModeOn: (isOn) => set(() => ({isTempIsolationModeOn: isOn})),
  }
}
