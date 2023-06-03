import {IfcContext} from 'web-ifc-viewer/dist/components'
import {IfcViewerAPIExtended} from './IfcViewerAPIExtended'
import {unsortedArraysAreEqual, arrayRemove} from '../utils/arrays'
import {Mesh, MeshLambertMaterial, DoubleSide} from 'three'
import useStore from '../store/useStore'
import {BlendFunction} from 'postprocessing'
import {IfcElement} from './IfcElement'


/**
 *  Provides hiding, unhiding, isolation, and unisolation functionalities
 */
export default class IfcIsolator {
  subsetCustomId = ''
  revealSubsetCustomId = ''
  context = null
  ifcModel = null
  viewer = null
  unhiddenSubset = null
  isolationSubset = null
  revealedElementsSubset = null
  currentSelectionSubsets = []
  visualElementsIds = []
  spatialStructure = {}
  hiddenIds = []
  isolatedIds = []
  tempIsolationModeOn = false
  revealHiddenElementsMode = false
  hiddenMaterial = null
  isolationOutlineEffect = null

  /**
   * Instantiates a new instance of IfcIsolator
   *
   * @param {IfcContext} context of the viewer
   * @param {IfcViewerAPIExtended} viewer
   */
  constructor(context, viewer) {
    this.context = context
    this.viewer = viewer
    this.initHiddenMaterial()
    this.isolationOutlineEffect = viewer.postProcessor.createOutlineEffect({
      blendFunction: BlendFunction.SCREEN,
      edgeStrength: 5,
      pulseSpeed: 0.0,
      visibleEdgeColor: 0x00FFFF,
      hiddenEdgeColor: 0x00FFFF,
      height: window.innerHeight,
      windth: window.innerWidth,
      blur: false,
      xRay: true,
      opacity: 1,
    })
  }

  /**
   * Sets the loaded model to the isolator context
   *
   * @param {Mesh} (ifcModel) the laoded ifc model mesh
   */
  async setModel(ifcModel) {
    this.ifcModel = ifcModel
    const visuals = [...new Set(ifcModel.geometry.attributes.expressID.array)]
    this.visualElementsIds = visuals.map((id) => IfcElement.getFullyQualifiedId(ifcModel.modelID, id))
    const rootElement = await this.ifcModel.ifcManager.getSpatialStructure(ifcModel.modelID, false)
    this.collectSpatialElementsId(rootElement)
    this.subsetCustomId = `Bldrs::Share::HiddenElements::${ifcModel.modelID}`
    this.revealSubsetCustomId = `Bldrs::Share::RevealedElements::${ifcModel.modelID}`
  }

  /**
   * Sets reveal hidden elements mode
   *
   * @param {boolean} (isReveal) true if reveal, otherwise false
   */
  setRevealHiddenElementsMode(isReveal) {
    this.revealHiddenElementsMode = isReveal
  }

  /**
   * Collects spatial elements ids.
   *
   * @param {object} root IFC element
   */
  collectSpatialElementsId(element) {
    if (element.children.length > 0) {
      this.spatialStructure[IfcElement.getFullyQualifiedId(this.ifcModel.modelID, element.expressID)] =
          element.children.map((e) => IfcElement.getFullyQualifiedId(this.ifcModel.modelID, e.expressID))

      element.children.forEach((e) => {
        this.collectSpatialElementsId(e)
      })
    }
  }

  /**
   * Flattens element's children if it has any.
   *
   * @param {number} IFC element Id
   * @return {number} element id if no children or {number[]} if has children
   */
  flattenChildren(elementId, result = null) {
    if (Number.isInteger(elementId)) {
      const children = this.spatialStructure[IfcElement.getFullyQualifiedId(this.ifcModel.modelID, elementId)]
      if (result === null) {
        result = [elementId]
      }
      if (children !== undefined && children.length > 0) {
        children.forEach((c) => {
          const id = IfcElement.getExpressId(c)
          result.push(id)
          this.flattenChildren(id, result)
        })
      }
      return result
    } else {
      const types = useStore.getState().elementTypesMap
      const elements = types.filter((t) => t.name === elementId)[0].elements
      const flattenedTypeElements = []
      elements.forEach((e) => {
        flattenedTypeElements.push(e.expressID)
        this.flattenChildren(e.expressID, flattenedTypeElements)
      })
      return flattenedTypeElements
    }
  }

  /**
   * Initializes hide operations subset
   *
   * @param {Array} (includedIds) element ids included in the subset
   */
  initHideOperationsSubset(includedIds, removeModel = true) {
    if (removeModel) {
      this.context.getScene().remove(this.ifcModel)
      this.removeModelFromPickableModels(this.ifcModel)
      this.viewer.IFC.selector.selection.unpick()
      this.viewer.IFC.selector.preselection.unpick()
    }
    this.unhiddenSubset = this.ifcModel.createSubset({
      modelID: this.ifcModel.modelID,
      scene: this.context.getScene(),
      ids: includedIds,
      applyBVH: true,
      removePrevious: true,
      customID: this.subsetCustomId,
    })
    this.context.items.pickableIfcModels.push(this.unhiddenSubset)
  }

  /**
   * Initializes temporary isolation subset
   *
   * @param {Array} (includedIds) element ids included in the subset
   */
  initTemporaryIsolationSubset(includedIds) {
    this.context.getScene().remove(this.ifcModel)
    this.removeModelFromPickableModels(this.ifcModel)
    this.isolationSubset = this.ifcModel.createSubset({
      modelID: this.ifcModel.modelID,
      scene: this.context.getScene(),
      ids: includedIds,
      applyBVH: true,
      removePrevious: true,
      customID: this.subsetCustomId,
    })
    this.context.items.pickableIfcModels.push(this.isolationSubset)
    this.isolationOutlineEffect.setSelection([this.isolationSubset])
  }


  /**
   * Hides ifc elements by their ids
   *
   * @param {Array} (toBeHiddenElementIds) element ids to be hidden
   */
  hideElementsById(toBeHiddenElementIds) {
    if (Array.isArray(toBeHiddenElementIds)) {
      const toBeHiddenFullIds = [...new Set(toBeHiddenElementIds.map((id) => IfcElement.getFullyQualifiedId(this.ifcModel.modelID, id)))]
      const noChanges = unsortedArraysAreEqual(toBeHiddenFullIds, this.hiddenIds)
      if (noChanges) {
        return
      }
      const toBeHidden = toBeHiddenFullIds.concat(this.hiddenIds)
      this.hiddenIds = [...toBeHidden]
      const hiddenIdsObject = Object.fromEntries(
          this.hiddenIds.map((id) => [id, true]))
      useStore.setState({hiddenElements: hiddenIdsObject})
    } else if (Number.isFinite(toBeHiddenElementIds)) {
      const id = IfcElement.getFullyQualifiedId(this.ifcModel.modelID, toBeHiddenElementIds)
      if (this.hiddenIds.includes(id)) {
        return
      }
      this.hiddenIds.push(id)
      useStore.getState().updateHiddenStatus(id, true)
    } else {
      return
    }
    const toBeShown = this.visualElementsIds.filter((id) => !this.hiddenIds.includes(id))
        .map((id) => IfcElement.getExpressId(id))
    this.initHideOperationsSubset(toBeShown)
    const selection = useStore.getState().selectedElements.filter((el) => !this.hiddenIds.includes(el.getFullyQualifiedId()))
    useStore.setState({selectedElements: selection})
    if (this.revealHiddenElementsMode) {
      this.toggleRevealHiddenElements(true)
    }
  }

  /**
   * Unhides ifc elements by their ids
   *
   * @param {Array} (toBeUnhiddenElementIds) element ids to be unhidden
   */
  unHideElementsById(toBeUnhiddenElementIds) {
    if (Array.isArray(toBeUnhiddenElementIds)) {
      const toBeUnhidden = toBeUnhiddenElementIds.map((id) => IfcElement.getFullyQualifiedId(this.ifcModel.modelID, id))
      const toBeShown = toBeUnhidden.filter((el) => this.hiddenIds.includes(el))
      if (toBeShown.length === 0) {
        return
      }
      const toBeHidden = new Set(this.hiddenIds.filter((el) => !toBeShown.includes(el)))
      this.hiddenIds = [...toBeHidden]
      const hiddenIdsObject = Object.fromEntries(
          this.hiddenIds.map((id) => [id, true]))
      useStore.setState({hiddenElements: hiddenIdsObject})
    } else if (Number.isFinite(toBeUnhiddenElementIds)) {
      const id = IfcElement.getFullyQualifiedId(this.ifcModel.modelID, toBeUnhiddenElementIds)
      if (this.hiddenIds.includes(id)) {
        this.hiddenIds = arrayRemove(this.hiddenIds, id)
        useStore.getState().updateHiddenStatus(id, false)
      } else {
        return
      }
    } else {
      return
    }
    if (this.hiddenIds.length === 0) {
      this.unHideAllElements()
    } else {
      const toBeShown = this.visualElementsIds.filter((el) => !this.hiddenIds.includes(el))
          .map((id) => IfcElement.getExpressId(id))
      this.initHideOperationsSubset(toBeShown)
    }
    const selection = useStore.getState().selectedElements
    this.viewer.setSelection(selection, false)
    // reset reveal mode
    if (this.revealHiddenElementsMode) {
      this.toggleRevealHiddenElements(true)
    }
  }

  /**
   * Unhides all hidden elements
   *
   */
  unHideAllElements() {
    if (this.tempIsolationModeOn || !this.unhiddenSubset) {
      return
    }
    this.removeModelFromPickableModels(this.unhiddenSubset)
    this.context.getScene().remove(this.unhiddenSubset)
    this.disposeMesh(this.unhiddenSubset)
    delete this.unhiddenSubset
    this.context.getScene().add(this.ifcModel)
    this.context.items.pickableIfcModels.push(this.ifcModel)
    this.hiddenIds = []
    useStore.setState({hiddenElements: {}})
    if (this.revealHiddenElementsMode) {
      this.toggleRevealHiddenElements(false)
    }
  }

  /**
   * Toggles reveal hidden elements from hide and isolate operations
   *
   * @param {boolean} (isreveal) true if reveal, otherwise false
   */
  toggleRevealHiddenElements(isreveal) {
    if (!isreveal) {
      this.revealHiddenElementsMode = false
      this.context.getScene().remove(this.revealedElementsSubset)
      this.disposeMesh(this.revealedElementsSubset)
      delete this.revealedElementsSubset
    } else {
      let hidden = this.hiddenIds.map((id) => IfcElement.getExpressId(id))
      if (this.tempIsolationModeOn) {
        hidden = hidden.concat(this.visualElementsIds.filter((e) => !this.isolatedIds.includes(e)).map((id) => IfcElement.getExpressId(id)))
      }
      if (hidden.length === 0) {
        this.context.getScene().remove(this.revealedElementsSubset)
        this.disposeMesh(this.revealedElementsSubset)
        delete this.revealedElementsSubset
        return
      }
      this.revealHiddenElementsMode = true
      this.revealedElementsSubset = this.ifcModel.createSubset({
        modelID: this.ifcModel.modelID,
        scene: this.context.getScene(),
        ids: hidden,
        applyBVH: true,
        removePrevious: true,
        customID: this.revealSubsetCustomId,
        material: this.hiddenMaterial,
      })
    }
  }

  /**
   * Checks whether a certain element can be picked in scene or not
   *
   * @param {number} (elementId) the element id
   * @return {boolean} true if hidden, otherwise false
   */
  canBePickedInScene(elementExpressId) {
    const fullyQualifiedId = IfcElement.getFullyQualifiedId(this.ifcModel.modelID, elementExpressId)
    if (this.tempIsolationModeOn) {
      return !this.hiddenIds.includes(fullyQualifiedId) && this.isolatedIds.includes(fullyQualifiedId)
    }
    return !this.hiddenIds.includes(fullyQualifiedId)
  }

  /**
   * Checks whether a certain element can be hidden in scene or not
   *
   * @param {number} (elementId) the element id
   * @return {boolean} true if can be hidden, otherwise false
   */
  canBeHidden(elementId) {
    return this.visualElementsIds.includes(IfcElement.getFullyQualifiedId(this.ifcModel.modelID, elementId)) ||
    Object.keys(this.spatialStructure).includes(IfcElement.getFullyQualifiedId(this.ifcModel.modelID, elementId))
  }

  /**
   * Toggles isolation mode
   *
   */
  toggleIsolationMode() {
    if (this.revealHiddenElementsMode) {
      this.toggleRevealHiddenElements(true)
    }
    if (this.tempIsolationModeOn) {
      this.resetTempIsolation()
    } else {
      this.isolateSelectedElements()
    }
  }

  /**
   * Isolates selected ifc elements
   *
   */
  isolateSelectedElements() {
    const selection = this.viewer.getSelectedElements().map((el) => el.getFullyQualifiedId())

    if (selection.length === 0) {
      return
    }
    const noChanges = unsortedArraysAreEqual(selection, this.hiddenIds)
    if (noChanges) {
      return
    }
    this.tempIsolationModeOn = true
    useStore.setState({isTempIsolationModeOn: true})
    this.isolatedIds = selection
    const isolatedIdsObject = Object.fromEntries(
        this.isolatedIds.map((id) => [id, true]))
    useStore.setState({isolatedElements: isolatedIdsObject})
    this.initTemporaryIsolationSubset(this.viewer.getSelectedElements().map((el) => el.expressID))
  }

  /**
   * Resets temporary isolation
   *
   */
  resetTempIsolation() {
    if (!this.tempIsolationModeOn) {
      return
    }
    this.tempIsolationModeOn = false
    useStore.setState({isTempIsolationModeOn: false})
    this.isolatedIds = []
    useStore.setState({isolatedElements: {}})
    this.context.getScene().remove(this.isolationSubset)
    this.removeModelFromPickableModels(this.isolationSubset)
    this.disposeMesh(this.isolationSubset)
    delete this.isolationSubset
    if (this.hiddenIds.length > 0) {
      const toBeShown = this.visualElementsIds.filter((el) => !this.hiddenIds.includes( el ))
          .map((id) => IfcElement.getExpressId(id))
      this.initHideOperationsSubset(toBeShown, false)
    } else {
      this.context.getScene().add(this.ifcModel)
      this.context.items.pickableIfcModels.push(this.ifcModel)
    }
    this.isolationOutlineEffect.setSelection([])
  }

  /**
   * Initialize hidden elements material.
   *
   */
  initHiddenMaterial() {
    const planes = this.context.getClippingPlanes()
    const color = 0x00FFFF
    const opacity = 0.3
    this.hiddenMaterial = new MeshLambertMaterial({
      color,
      opacity,
      transparent: true,
      depthTest: true,
      side: DoubleSide,
      clippingPlanes: planes,
    })
  }

  /**
   * Removes model from pickable models
   *
   */
  removeModelFromPickableModels(model) {
    this.context.items.pickableIfcModels = this.context.items.pickableIfcModels.filter(function(m) {
      return m.uuid !== model.uuid
    })
  }

  /**
   * Disposes mesh
   *
   * @param {Mesh} mesh
   */
  disposeMesh(mesh) {
    mesh.removeFromParent()
    if (mesh.geometry.boundsTree) {
      mesh.geometry.disposeBoundsTree()
    }
    mesh.geometry.dispose()
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => mat.dispose())
    } else {
      mesh.material.dispose()
    }
  }
}
