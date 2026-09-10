import { readFileSync } from "fs"
import { join } from "path"

const CITATION_REMINDER = `
## CITATION REMINDER
Before EVERY Edit/Write/Bash/Task tool call, you MUST output:
- **What:** [one-line summary]
- **Why:** [reasoning]
- **Source:** [file path:line, URL, or "model knowledge — not verified"]

After the tool result returns, output:
- **Result:** [what happened]

This is non-negotiable. No exceptions.`

const CITATION_PATTERN = /\*\*What:\*\*/i
const HAS_RESULT_PATTERN = /\*\*Result:\*\*/i
const TOOLS_REQUIRING_CITATION = ["Edit", "Write", "Bash", "Task"]

export const CitationPlugin = async ({ directory }: { directory: string }) => {
  const citedPath = join(
    process.env.HOME || "~",
    ".config/opencode/output-styles/cited.md",
  )

  let citedContent: string
  try {
    citedContent = readFileSync(citedPath, "utf-8")
  } catch {
    console.warn(`[citation] Could not read ${citedPath}`)
    citedContent = ""
  }

  return {
    "session.created": async (output: { context: string[] }) => {
      if (citedContent) {
        output.context.push(citedContent)
      }
      output.context.push(CITATION_REMINDER)
    },

    "experimental.session.compacting": async (
      _input: unknown,
      output: { context: string[] },
    ) => {
      if (citedContent) {
        output.context.push(citedContent)
      }
      output.context.push(CITATION_REMINDER)
    },

    "tool.execute.before": async (
      input: { tool: string; args: unknown },
      output: { args: unknown },
    ) => {
      if (!TOOLS_REQUIRING_CITATION.includes(input.tool)) {
        return
      }

      const toolArgs = output.args as Record<string, unknown>
      const prompt = (toolArgs.prompt as string) || ""

      // Plans directory writes always require citation
      if (input.tool === "Write") {
        const filePath = (toolArgs.filePath as string) || ""
        if (filePath.includes("/plans/")) {
          if (!CITATION_PATTERN.test(prompt)) {
            throw new Error(
              "[CITATION REQUIRED] Writing to plans/ requires citation.",
            )
          }
        }
      }

      if (!CITATION_PATTERN.test(prompt)) {
        throw new Error(
          `[CITATION REQUIRED] ${input.tool} tool calls require a citation block (What/Why/Source). Add citations before proceeding.`,
        )
      }
    },

    "tool.execute.after": async (
      input: { tool: string; args: unknown },
      output: unknown,
    ) => {
      if (!TOOLS_REQUIRING_CITATION.includes(input.tool)) {
        return
      }

      const toolArgs = input.args as Record<string, unknown>
      const prompt = (toolArgs.prompt as string) || ""

      if (!CITATION_PATTERN.test(prompt)) {
        console.warn(
          `[CITATION AUDIT] ${input.tool} called without citation in prompt`,
        )
        return
      }

      // Verify **Result:** appears after tool execution
      const outputObj = output as { text?: string; content?: string } | undefined
      const responseText = outputObj?.text || outputObj?.content || ""

      if (!HAS_RESULT_PATTERN.test(responseText)) {
        console.warn(
          `[CITATION AUDIT] ${input.tool} result missing **Result:** block`,
        )
      }
    },

    "message.updated": async (
      _input: unknown,
      output: { message: { parts: { type: string; text: string }[] } },
    ) => {
      const text = output.message.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("\n")

      if (!CITATION_PATTERN.test(text) && text.length > 100) {
        console.warn("[CITATION AUDIT] Long message without citation")
      }
    },
  }
}
