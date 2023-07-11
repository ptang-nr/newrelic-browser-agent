export class Configurable {
  /**
   * Performs a deep merge of the supplied configuration object with the current Configurable
   * instance.
   * @param {object=} input Input object to deep merge with the current configuration.
   */
  update (input = {}) {
    this.#deepUpdate(input, this)
  }

  /**
   * Performs a deep merge of the supplied configuration object into the target object. When called
   * for the first time, target should be undefined so it properly references the current Configurable
   * instance. This method hides the implementation for the {@see update} method.
   * @param {object=} input Input object to deep merge with the current configuration.
   * @param {object=} target The target object to merge the input object into.
   */
  #deepUpdate (input = {}, target = this) {
    for (let key in Object.keys(target)) {
      if (input[key] !== undefined) {
        try {
          if (typeof obj[key] === 'object' && typeof target[key] === 'object') output[key] = this.update(input[key], target[key])
          else target[key] = obj[key]
        } catch (e) {
          warn('An error occurred while setting a property of a Configurable', e)
        }
      }
    }
  }
}
