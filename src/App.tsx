import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { serializeCanvasState } from "./context/canvas-state";
import {
  convertToExcalidrawElements,
  CaptureUpdateAction,
  newElementWith,
} from "@excalidraw/excalidraw";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import Canvas from "./components/Canvas";
import ChatPanel from "./components/chat/ChatPanel";
import "./App.css";

// One agent instance per page load. The canvas state lives only in the
// browser, so persisting chat history across refreshes would leave a dead
// conversation referencing diagrams that no longer exist. Generated at the
// module level so React StrictMode's double mount doesn't change it.
const sessionId = crypto.randomUUID();

function stripNulls (obj: any) {
  const out:any  = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v! == null) {
      out[k] = v
    }
  }

  return out
}

export default function App() {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Track which tool calls we have already applied to the canvas so we
  // don't apply the same elements twice as messages re-render.
  const appliedToolCalls = useRef<Set<string>>(new Set());
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

  useEffect(() => {
    excalidrawAPIRef.current = excalidrawAPI;
  }, [excalidrawAPI]);

  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    setExcalidrawAPI(api);
  }, []);

  // Connect to a fresh agent instance for this page load
  const agent = useAgent({ agent: "design-agent", name: sessionId });

  // useAgentChat manages the chat protocol on top of the agent connection.
  // It gives us the messages array, a sendMessage function, and a status.
  const { messages, sendMessage, status } = useAgentChat({ 
    agent,
    onToolCall: async ({toolCall, addToolOutput}) => {
      const api = excalidrawAPIRef.current;
      if(!api) {
        addToolOutput({toolCallId: toolCall.toolCallId, output: {error: "canvas not ready, let the user know to try again in a few seconds."}}) //output it what you want it to see
        return
      }
      if(toolCall.toolName === 'queryCanvas') {
        addToolOutput({
          toolCallId: toolCall.toolCallId,
          output: {
            summary: serializeCanvasState(api.getSceneElements() as any),
          }
        })
        return
      }

      if(toolCall.toolName === 'addElements') {
        const { elements } = toolCall.input as any
        const cleaned = elements.map(stripNulls)

        const newOnes = convertToExcalidrawElements(cleaned, {regenerateIds: false})

        const next = [...api.getSceneElements(), ...newOnes]

        api.updateScene({ elements: next, captureUpdate: CaptureUpdateAction.IMMEDIATELY})

        api.scrollToContent(next, {fitToContent: true})

        addToolOutput({toolCallId: toolCall.toolCallId, output: {added: newOnes.length}})

        return
      }

      if(toolCall.toolName === 'updateElements') {
        const {updates} = toolCall.input as any
        const byId = new Map(updates.map(update => [update.id, stripNulls(update.fields)]))
        const next  = api.getSceneElements().map(el =>{
          //find the same ids we want to update
          const fields = byId.get(el.id)
          return fields && Object.keys(fields).length > 0  //if there are fields and it matches the one we want the LLM to update
          ? newElementWith(el, fields) //create a new element with the updated fields
          : el
        })

        api.updateScene({ elements: next, captureUpdate: CaptureUpdateAction.IMMEDIATELY})
        addToolOutput({toolCallId: toolCall.toolCallId, output: {updated: byId.size}}) //let the agent know we did that
        return 
      }

      if(toolCall.toolName === 'removeElements') {
        const {ids} = toolCall.input as any
        const remove = new Set(ids)
        const next = api.getSceneElements().filter(el => !remove.has(el.id)) //only pass the ones that are not in the remove set
        api.updateScene({elements: next, captureUpdate: CaptureUpdateAction.IMMEDIATELY})
        addToolOutput({toolCallId: toolCall.toolCallId, output: {removed: remove.size}}) //let the agent know we did that
      }
  }});

  // Wrap sendMessage so every outgoing user message also carries a snapshot
  // of the current canvas state in a data-canvas-state part. The worker
  // reads this off the latest user message and serializes it into the
  // system prompt. This is the lesson 6 transport for canvas awareness; a
  // later lesson will replace it with a client side tool the agent can
  // call directly when it actually needs the info.
  const sendWithCanvas = useMemo(
    () =>
      (msg: { role: "user"; parts: { type: "text"; text: string }[] }) => {
        const elements = excalidrawAPI?.getSceneElements() ?? [];
        sendMessage({
          ...msg,
          parts: [
            ...msg.parts,
            { type: "data-canvas-state", data: { elements } } as never,
          ],
        });
      },
    [sendMessage, excalidrawAPI]
  );

  return (
    <div className={`app ${theme}`}>
      <div className="canvas-container">
        <Canvas onApiReady={handleApiReady} onThemeChange={setTheme} />
      </div>
      <ChatPanel
        messages={messages}
        sendMessage={sendMessage}
        status={status}
      />
      <a href="#viewer" className="viewer-launch" title="Open diagram viewer for human scoring">
        viewer
      </a>
    </div>
  );
}
