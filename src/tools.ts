import {addElements} from './tools/add-elements'
import {removeElements} from './tools/remove-elements'
import {updateElements} from './tools/updateElements'
import {queryCanvas} from './tools/query-canvas'

export function buildTools() {
  return {
    addElements,
    removeElements,
    updateElements,
    queryCanvas
  }
}