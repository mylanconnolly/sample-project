import { useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/** The name the MCP server is registered under in the client's config. */
const SERVER_NAME = "sample-project"

/** The MCP endpoint, derived from where the app is being served. */
function mcpUrl(): string {
  if (typeof window === "undefined") return "/mcp"
  return `${window.location.origin}/mcp`
}

/**
 * Documentation for connecting an MCP client (Claude Code / Claude Desktop) to
 * this app's MCP server. Lives beneath the API keys card on the profile page:
 * the server authenticates with an API key generated there.
 */
export function McpSetupCard() {
  const url = mcpUrl()

  const claudeCodeCommand = `claude mcp add --transport http ${SERVER_NAME} ${url} \\\n  --header "Authorization: Bearer YOUR_API_KEY"`

  const desktopConfig = JSON.stringify(
    {
      mcpServers: {
        [SERVER_NAME]: {
          command: "npx",
          args: [
            "mcp-remote@latest",
            url,
            "--header",
            "Authorization: Bearer YOUR_API_KEY",
          ],
        },
      },
    },
    null,
    2,
  )

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Connect over MCP</CardTitle>
        <CardDescription>
          Connect an AI assistant to your memories over the Model Context
          Protocol (MCP). It can create, search, and recall memories — acting as
          you, limited to what you're allowed to do. Authenticate with an API key
          generated above; replace <Code>YOUR_API_KEY</Code> below with it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Server URL</h3>
          <CodeBlock code={url} label="Copy server URL" />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">Claude Code</h3>
          <p className="text-sm text-muted-foreground">
            Run this in your terminal. Add <Code>--scope user</Code> to make it
            available in every project; use <Code>claude mcp list</Code> to
            verify and <Code>claude mcp remove {SERVER_NAME}</Code> to undo.
          </p>
          <CodeBlock
            code={claudeCodeCommand}
            label="Copy Claude Code command"
          />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">Claude Desktop</h3>
          <p className="text-sm text-muted-foreground">
            Claude Desktop can't reach HTTP MCP servers directly, so this routes
            through the <Code>mcp-remote</Code> bridge (requires{" "}
            <a
              href="https://nodejs.org"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-2"
            >
              Node.js
            </a>
            ). Add this to <Code>claude_desktop_config.json</Code>, then quit
            and reopen Claude Desktop.
          </p>
          <CodeBlock code={desktopConfig} label="Copy Claude Desktop config" />
          <p className="text-xs text-muted-foreground">
            Config file location — macOS:{" "}
            <Code>
              ~/Library/Application Support/Claude/claude_desktop_config.json
            </Code>
            ; Windows: <Code>%APPDATA%\Claude\claude_desktop_config.json</Code>.
            If the bridge trips over the space in the header value, update with{" "}
            <Code>npx mcp-remote@latest</Code> or pass the token via an
            environment variable.
          </p>
        </section>
      </CardContent>
    </Card>
  )
}

/** Inline monospace snippet used within prose. */
function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs break-all">
      {children}
    </code>
  )
}

/** A multi-line code block with a copy-to-clipboard button. */
function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be unavailable (e.g. insecure context); the text is still
      // visible for the user to select and copy manually.
    }
  }

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md border border-foreground/10 bg-muted py-2 pr-12 pl-3 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={label}
        className="absolute top-2 right-2 size-7"
        onClick={copy}
      >
        {copied ? (
          <CheckIcon className="text-success-foreground" />
        ) : (
          <CopyIcon />
        )}
      </Button>
    </div>
  )
}
