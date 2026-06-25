import * as React from "react"
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  ListsToggle,
  CreateLink,
  InsertTable,
  InsertThematicBreak,
  Separator,
} from "@mdxeditor/editor"
import "@mdxeditor/editor/style.css"

import { cn } from "@/lib/utils"
import type { MarkdownEditorImplProps } from "./markdown-editor"

// Languages offered in the code-block language dropdown. The empty key is the
// fallback descriptor MDXEditor uses for fences with no/unknown language.
const codeBlockLanguages = {
  "": "Plain text",
  text: "Plain text",
  js: "JavaScript",
  jsx: "JavaScript (JSX)",
  ts: "TypeScript",
  tsx: "TypeScript (TSX)",
  elixir: "Elixir",
  json: "JSON",
  bash: "Shell",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
}

function Toolbar({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <>
        <BoldItalicUnderlineToggles />
        <CodeToggle />
        <Separator />
        <ListsToggle />
        <CreateLink />
      </>
    )
  }
  return (
    <>
      <BlockTypeSelect />
      <Separator />
      <BoldItalicUnderlineToggles />
      <CodeToggle />
      <Separator />
      <ListsToggle />
      <Separator />
      <CreateLink />
      <InsertTable />
      <InsertThematicBreak />
    </>
  )
}

export default function MarkdownEditorImpl({
  value,
  onChange,
  placeholder,
  compact,
  autoFocus,
  dark,
}: MarkdownEditorImplProps) {
  return (
    <MDXEditor
      markdown={value}
      // MDXEditor passes a second `initialMarkdownNormalize` arg we don't want
      // forwarded to the form's change handler.
      onChange={(markdown) => onChange(markdown)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      // MDXEditor's palette/fonts come from these theme classes; one must always
      // be present. We override the actual colours to app tokens in app.css.
      className={dark ? "dark-theme" : "light-theme"}
      contentEditableClassName={cn(
        "prose prose-sm dark:prose-invert max-w-none focus:outline-none",
        compact ? "min-h-16" : "min-h-40",
      )}
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
        codeMirrorPlugin({ codeBlockLanguages }),
        markdownShortcutPlugin(),
        toolbarPlugin({ toolbarContents: () => <Toolbar compact={compact} /> }),
      ]}
    />
  )
}
