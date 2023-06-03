/**
 * Recursively visit nodes if the node has children
 *
 * @param {object} elt tree element
 * @param {Function} observeCb Callback for each child/element pair:
 * observeCb(child, elt).
 */
export function visitTree(elt, observeCb) {
  if (elt && elt.children) {
    for (const child of elt.children) {
      observeCb(child, elt)
      visitTree(child, observeCb)
    }
  }
}


/**
 * Visits an element tree and sets parent links for each element.
 *
 * @param {number} modelID Model ID.
 * @param {object} rootElt Root IFC element.
 * @param {object} elementsById An already existing map of elements by ID.
 */
export function setupLookupAndParentLinks(modelID, rootElt, elementsById) {
  if (elementsById === undefined || elementsById === null) {
    throw new Error('Illegal argument: elementsById undefined')
  }
  elementsById[modelID] = {}
  visitTree(rootElt, (elt, parent) => {
    elementsById[modelID][parent.expressID] = parent
    elementsById[modelID][elt.expressID] = elt
    elt.parent = parent
  })
}


/**
 * Generate a URL address fragment for the element.
 *
 * @param {object} elt IFC element.
 * @param {Function} getIdCb Instance of.
 * @return {Array} The element path array
 */
export function computeElementPathIds(elt, getIdCb) {
  if (elt === undefined || elt === null) {
    throw new Error('Illegal argument: elt undefined')
  }
  if (getIdCb === undefined || getIdCb === null) {
    throw new Error('Illegal argument: getIdCb undefined')
  }
  const id = getIdCb(elt)
  return elt.parent ? computeElementPathIds(elt.parent, getIdCb).concat(id) : [id]
}
