import { readFileSync } from "fs"
import { join } from "path"

const CITATION_REMINDER = `

## CITATION REMINDER
Before EVERY Edit/Write/Bash tool call, you MUST output:
- **What:** [one-line summary]
- **Why:** [reasoning]
- **Source:** [file path:line, URL, or "model knowledge — not verified"]

After the tool result returns, output:
- **Result:** [what happened]

This is non-negotiable. No exceptions.`

export const CitationAudit = async ({ directory }: { directory: string }) => {
  const citedPath = join(
    process.env.HOME || "~",
    ".config/opencode/output-styles/cited.md",
  )

  let citedContent: string
  try {
    citedContent = readFileSync(citedPath, "utf-8")
  } catch {
    console.warn(`[citation-audit] Could not read ${citedPath}`)
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
      input: unknown,
      output: { context: string[] },
    ) => {
      if (citedContent) {
        output.context.push(citedContent)
      }
      output.context.push(CITATION_REMINDER)
    },
  }
}
