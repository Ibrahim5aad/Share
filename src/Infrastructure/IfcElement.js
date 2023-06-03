
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
   * Gets the fully qualified id of the element.
   *
   * @return {string} the fully qualified id of the element
   * @example "1-2" where 1 is the model id and 2 is the express id
   */
  getFullyQualifiedId() {
    return this.fullyQualifiedId
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
    return Number(fullyQualifiedId.split('-')[1])
  }
}
