import ToolStatus from "../streaming/ToolStatus";
import MarkdownRenderer from "./MarkdownRenderer";
import type { Message } from "./types";
import { tool, type UIMessage } from "ai";

interface MessageBubbleProps {
  message: UIMessage;
}

function getToolStatus(state?: string) {
  if (state === "output-available") {
    return "complete";
  }

  if (state === "output-error") {
    return "error";
  }

  return "running";
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div className={`message-bubble ${message.role}`}>
      <div className="message-role">
        {message.role === "user" ? "You" : "Assistant"}
      </div>
      <div className="message-content">
        {message.parts?.map((part, i) => {
          if(part.type === 'text') {
            if(message.role === 'assistant') {
              return <MarkdownRenderer key={i} content={part.text} />
            }
            return <p key={i}>{part.text}</p>
          }

          if (part.type?.startsWith('tool-')) {
            const toolName = part.type.replace('tool-', "")
            const toolPart = part as { state?: string}
            // const status = toolPart.state === 'output-available' ? "complete" : toolPart.state === 'output-error' ? 'error' : 'running'
            const status = getToolStatus(toolPart.state)
            return <ToolStatus key={i} name={toolName} status={status} />
          }

          return null
        })}
        
        {/* {message.role === "assistant" ? (
          <MarkdownRenderer content={message.content} />
        ) : (
          <p>{message.content}</p>
        )} */}
      </div>
    </div>
  );
}
