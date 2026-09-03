import {addElements} from './tools/add-elements'
import {removeElements} from './tools/remove-elements'
import {updateElements} from './tools/updateElements'
import {queryCanvas} from './tools/query-canvas'
import { makeSearchWeb } from './tools/search-web'

export function buildTools(env: any) {
  return {
    addElements,
    removeElements,
    updateElements,
    queryCanvas,
    searchWeb: makeSearchWeb(env.TAVILY_API_KEY),
  }
}