import {IfcViewerAPI} from 'web-ifc-viewer'
import IfcHighlighter from './IfcHighlighter'
import IfcIsolator from './IfcIsolator'
import IfcViewsManager from './IfcElementsStyleManager'
import IfcCustomViewSettings from './IfcCustomViewSettings'
import CustomPostProcessor from './CustomPostProcessor'
import debug from '../utils/debug'
import {arrayRemove} from '../utils/arrays'
import {IfcElement} from './IfcElement'


const viewParameter = (new URLSearchParams(window.location.search)).get('view')?.toLowerCase() ?? 'default'
const viewRules = {
  'default': [],
  'ch.sia380-1.heatmap': ['Rule1', 'Rule2'],
}
/* eslint-disable jsdoc/no-undefined-types */
/**
 * Extending the original IFCViewerFunctionality
 */
export class IfcViewerAPIExtended extends IfcViewerAPI {
  // TODO: might be useful if we used a Set as well to handle large selections,
  // but for now array is more performant for small numbers
  _selectedElements = []
  _isolators = {}
  _revealHiddenElementsMode = false
  _tempIsolationMode = false
  /**  */
  constructor(options) {
    super(options)
    const renderer = this.context.getRenderer()
    const scene = this.context.getScene()
    const camera = this.context.getCamera()
    this.postProcessor = new CustomPostProcessor(renderer, scene, camera)
    this.highlighter = new IfcHighlighter(this.context, this.postProcessor)
    this.viewsManager = new IfcViewsManager(this.IFC.loader.ifcManager.parser, viewRules[viewParameter])
  }

  /**
   * Loads the given IFC in the current scene.
   *
   * @param {string} url IFC as URL.
   * @param {boolean} fitToFrame (optional) if true, brings the perspectiveCamera to the loaded IFC.
   * @param {Function(event)} onProgress (optional) a callback function to report on downloading progress
   * @param {Function} onError (optional) a callback function to report on loading errors
   * @param {IfcCustomViewSettings} customViewSettings (optional) override the ifc elements file colors
   * @return {IfcModel} ifcModel object
   */
  async loadIfcUrl(url, fitToFrame, onProgress, onError, customViewSettings) {
    this.viewsManager.setViewSettings(customViewSettings)
    return await this.IFC.loadIfcUrl(url, fitToFrame, onProgress, onError)
  }

  /**
   * Attaches the given IFC in the current scene.
   *
   * @param {string} url IFC file as URL.
   * @param {boolean} fitToFrame (optional) if true, brings the perspectiveCamera to the loaded IFC.
   * @param {Function(event)} onProgress (optional) a callback function to report on downloading progress
   * @param {Function} onError (optional) a callback function to report on loading errors
   */
  async attachIfcUrl(url, fitToFrame, onProgress, onError) {
    let ifcModel = null
    try {
      const settings = this.IFC.loader.ifcManager.state.webIfcSettings
      const fastBools = (settings === null || settings === void 0 ? void 0 : settings.USE_FAST_BOOLS) || true
      await this.IFC.loader.ifcManager.applyWebIfcConfig({
        COORDINATE_TO_ORIGIN: false,
        USE_FAST_BOOLS: fastBools,
      })
      ifcModel = await this.IFC.loader.loadAsync(url, onProgress)
      this.IFC.addIfcModel(ifcModel)
      await this.setIsolator(ifcModel)
      if (fitToFrame) {
        this.context.fitToFrame()
      }
      return ifcModel
    } catch (err) {
      if (onError) {
        onError(err)
      }
      if (ifcModel) {
        this.unloadAttachedIfc(ifcModel, onError)
      }
      return null
    }
  }

  /**
   * Unloads an attached IFC from the current scene.
   *
   * @param {IfcModel} attached model
   * @param {Function} onError (optional) a callback function to report on unloading errors
   */
  unloadAttachedIfc(model, onError = null) {
    try {
      this.context.items.ifcModels = arrayRemove(this.context.items.ifcModels, model)
      this.context.items.pickableIfcModels = arrayRemove(this.context.items.pickableIfcModels, model)
      const scene = this.context.getScene()
      model.close(scene)
      this.context.fitToFrame()
      this.disposeModel(model)
      this._isolators[model.modelID].dispose()
      this._isolators[model.modelID] = null
    } catch (err) {
      if (onError) {
        onError(err)
      }
    }
  }

  /**
   * Gets the expressId of the element that the mouse is pointing at
   *
   * @return {object} the expressId of the element and modelId
   */
  castRayToIfcScene() {
    const found = this.context.castRayIfc()
    if (!found) {
      return null
    }
    const [modelId, id] = this.getPickedItemId(found)
    return {modelID: modelId, id}
  }

  /**
   * gets a copy of the current selected elements in the scene
   *
   * @return {IfcElement[]} the selected elements in the scene as IfcElement objects
   */
  getSelectedElements = () => [...this._selectedElements]

  /**
   * Sets the isolator for the given model
   *
   * @param {IfcModel} model the model associated with the isolator
   */
  async setIsolator(model) {
    const isolator = new IfcIsolator(this.context, this)
    this._isolators[model.modelID] = isolator
    await isolator.setModel(model)
    isolator.setRevealHiddenElementsMode(this._revealHiddenElementsMode)
  }

  /**
   * Gets the isolator for the given model
   *
   * @param {number} modelID
   * @return {IfcIsolator} the isolator for the given model
   */
  getIsolator(modelID) {
    return this._isolators[modelID]
  }

  /**
   * Gets the isolators for all the models
   *
   * @return {IfcIsolator[]} the isolators for all the models
   */
  getIsolators = () => [...Object.values(this._isolators)]

  /**
   * sets the current selected expressIds in the scene
   *
   * @param {IfcElement[]} elements the selected elements in the scene as IfcElement objects
   * @param {boolean} focusSelection (optional) if true, focuses the camera on the selected element
   */
  async setSelection(elements, focusSelection) {
    this._selectedElements = elements
    const toBeSelected = this._selectedElements
        .filter((element) => this.getIsolator(element.modelID)
            .canBePickedInScene(element.expressID))

    if (typeof focusSelection === 'undefined') {
      // if not specified, only focus on item if it was the first one to be selected
      focusSelection = toBeSelected.length === 1
    }
    if (toBeSelected.length !== 0) {
      try {
        const groupedIds = toBeSelected.reduce((acc, element) => {
          acc[element.modelID] = [...(acc[element.modelID] || []), element.expressID]; return acc
        }, {})
        for (const [modelId, expressIds] of Object.entries(groupedIds)) {
          await this.IFC.selector.pickIfcItemsByID(Number(modelId), expressIds, false, true)
        }
        this.highlighter.setHighlighted(this.IFC.selector.selection.meshes)
      } catch (e) {
        debug().error('IfcViewerAPIExtended#setSelection$onError: ', e)
      }
    } else {
      this.highlighter.setHighlighted(null)
      this.IFC.selector.unpickIfcItems()
    }
  }

  /**
   * Highlights the item pointed by the cursor.
   *
   */
  async highlightIfcItem() {
    const found = this.context.castRayIfc()
    if (!found) {
      this.IFC.selector.preselection.toggleVisibility(false)
      return
    }
    const [modelId, id] = this.getPickedItemId(found)
    if (this.getIsolator(modelId).canBePickedInScene(id)) {
      await this.IFC.selector.preselection.pick(found)
      this.highlightPreselection()
    }
  }

  /**
   * Hides selected ifc elements
   *
   */
  hideSelectedElements() {
    if (this._tempIsolationMode) {
      return
    }

    const groupedIds = this.getSelectedElements().reduce((acc, element) => {
      acc[element.modelID] = [...(acc[element.modelID] || []), element.expressID]; return acc
    }, {})

    for (const [modelId, expressIds] of Object.entries(groupedIds)) {
      this.getIsolator(modelId).hideElementsById(expressIds)
    }
  }

  /**
   * applies Preselection effect on an Element by Id
   *
   * @param {number} modelID
   * @param {number[]} expressIds express Ids of the elements
   */
  async preselectElementsByIds(modelId, expressIds) {
    const filteredIds = expressIds.filter((id) => this.getIsolator(modelId).canBePickedInScene(id))
        .map((a) => parseInt(a))
    if (filteredIds.length) {
      await this.IFC.selector.preselection.pickByID(modelId, filteredIds, false, true)
      this.highlightPreselection()
    }
  }

  /**
   * toggles the visibility of the selected elements
   *
   */
  toggleRevealHiddenElements() {
    this._revealHiddenElementsMode = !this._revealHiddenElementsMode
    Object.values(this._isolators).forEach((isolator) => {
      isolator.toggleRevealHiddenElements(this._revealHiddenElementsMode)
    })
  }

  /**
   * sets the reveal hidden elements mode
   *
   *
   * @param {boolean} isReveal reveal hidden elements mode is on or off
   */
  setRevealHiddenElementsMode(isReveal) {
    this._revealHiddenElementsMode = isReveal
  }

  /**
   * toggles the isolation mode
   *
   */
  toggleIsolationMode() {
    this._tempIsolationMode = !this._tempIsolationMode
    Object.values(this._isolators).forEach((isolator) => {
      isolator.toggleIsolationMode()
    })
  }

  /**
   * Unhides all the hidden elements in the scene
   *
   */
  unhideAllElements() {
    for (const isolator of this.getIsolators()) {
      isolator.unHideAllElements()
    }
    this._revealHiddenElementsMode = false
  }

  /**
   * adds the highlighting (outline effect) to the currently preselected element in the viewer
   */
  highlightPreselection() {
    // Deconstruct the preselection meshes set to get the first element in set
    // The preselection set always contains only one element or none
    const [targetMesh] = this.IFC.selector.preselection.meshes
    this.highlighter.addToHighlighting(targetMesh)
  }

  /**
   * Highlights the item pointed by the cursor.
   *
   * @param {object} picked item
   * @return {number[]} the modelID and the element express id
   */
  getPickedItemId(picked) {
    const mesh = picked.object
    if (picked.faceIndex === undefined) {
      return null
    }
    const ifcManager = this.IFC
    return [mesh.modelID, ifcManager.loader.ifcManager.getExpressId(mesh.geometry, picked.faceIndex)]
  }

  /**
   * Disposes the given model
   */
  disposeModel(model) {
    model.removeFromParent()
    if (model.geometry.boundsTree) {
      model.geometry.disposeBoundsTree()
    }
    model.geometry.dispose()
    if (Array.isArray(model.material)) {
      model.material.forEach((mat) => mat.dispose())
    } else {
      model.material.dispose()
    }
  }
}
