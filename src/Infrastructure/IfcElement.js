
/**
 * Defines the IfcElement class.
 */
export class IfcElement {
  /**
   *  Creates a new instance of IfcElement.
   *
   * @param {number} modelID the model id of the element
   * @param {number} elementExpressID the express id of the element
   */
  constructor(modelID, elementExpressID) {
    this.modelID = modelID
    this.expressID = elementExpressID
    this.fullyQualifiedId = `${modelID}-${elementExpressID}`
  }

  /**
   * Gets the fully qualified id out of a model id and express id.
   *
   * @param {number} modelID the model id of the element
   * @param {number} elementExpressID the express id of the element
   * @return {string} the fully qualified id of the element
   * @example "1-2" where 1 is the model id and 2 is the express id
   */
  static getFullyQualifiedId(modelID, expressID) {
    return `${modelID}-${expressID}`
  }


  /**
   * Gets the element express id out of a fully qualified id.
   *
   * @param {string} fullyQualifiedId the fully qualified id of the element
   * @return {number} the express id of the element
   * @example if the fully qualified id is "1-2", the express id is 2
   */
  static getExpressId(fullyQualifiedId) {
    return IfcElement.getModelAndExpressId(fullyQualifiedId)[1]
  }

  /**
   * Gets the model id out of a fully qualified id.
   *
   * @param {string} fullyQualifiedId the fully qualified id of the element
   * @return {number} the express id of the element
   * @example if the fully qualified id is "1-2", the express id is 1
   */
  static getModelId(fullyQualifiedId) {
    return IfcElement.getModelAndExpressId(fullyQualifiedId)[0]
  }

  /**
   * Gets the element model id and the express id out of a fully qualified id.
   *
   * @param {string} fullyQualifiedId the fully qualified id of the element
   * @return {number[]} the model id and express id of the element
   * @example if the fully qualified id is "1-2", the result is [1, 2]
   */
  static getModelAndExpressId(fullyQualifiedId) {
    const isInteger = (str) => {
      if (typeof str !== 'string') {
        return false
      }
      return !isNaN(str) &&
             !isNaN(parseInt(str))
    }

    if (!fullyQualifiedId) {
      throw new Error('fullyQualifiedId is undefined')
    }

    if (!fullyQualifiedId.includes('-')) {
      throw new Error(`fullyQualifiedId ${fullyQualifiedId} is not a valid id`)
    }

    const ids = fullyQualifiedId.split('-')

    // eslint-disable-next-line no-magic-numbers
    if (ids.length !== 2 || !isInteger(ids[0]) || !isInteger(ids[1])) {
      throw new Error(`fullyQualifiedId ${fullyQualifiedId} is not a valid id`)
    }

    return [Number(ids[0]), Number(ids[1])]
  }

  /**
   * Gets the element out of a fully qualified id
   *
   * @param {string} fullyQualifiedId  the fully qualified id of the element
   * @return {IfcElement} the element
   */
  static getElement(fullyQualifiedId) {
    const [modelId, expressId] = IfcElement.getModelAndExpressId(fullyQualifiedId)
    return new IfcElement(modelId, expressId)
  }
}
