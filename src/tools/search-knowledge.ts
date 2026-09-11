import { tool } from "ai";
import {z} from 'zod'
import { getIndex } from "../rag/vector-store";

export function makeSearchKnowledge(env: any) {
    return tool({
        description: `Search private docs on things related to internal architecture.`,
        inputSchema: z.object({
            query: z.string().describe('Natual language query describing what you need to know')
        }),
        execute: async ({query}) => {
            try {
                const index = getIndex(env)
                const results = await index.query({
                    data: query,
                    topK: 3, //the top results from the vector you want to return
                    includeMetadata:true

                })

                return {
                    results: results.map(r => ({
                        source: r.metadata.source ?? r.id,
                        content: r.metadata.content ?? ""

                    }))
                }
            } catch(e) {
                return {
                    error: 'oops something bad happened'
                }
            }
        }

    })
}