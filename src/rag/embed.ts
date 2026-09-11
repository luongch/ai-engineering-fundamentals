import { readdir, readFile} from 'node:fs/promise'
import { join, parse, dirname } from 'node:path'
import {getIndex} from './vector-store'
import { fileURLToPath } from 'node:url'

//create helper methods so we can query the directory

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const CORPUS_DIR = join(__dirname, '..', '..', 'data', 'corpus')

async function main() {
    const index = getIndex({
        UPSTASH_VECTOR_REST_TOKEN: process.env.UPSTASH_VECTOR_REST_TOKEN,
        UPSTASH_VECTOR_REST_URL: process.env.UPSTASH_VECTOR_REST_URL
    })

    console.log('....hello')
    await index.reset()
}