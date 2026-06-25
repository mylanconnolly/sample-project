defmodule SampleProject.Memories.Memory.Scope do
  @moduledoc """
  The visibility/grouping scope of a `SampleProject.Memories.Memory`.

  Memories are recorded and recalled by AI agents (Claude Code / Desktop) over MCP
  across workstations and users, so the scope governs who else can see a note:

    * `:global`     — org-wide knowledge readable by every authenticated user.
    * `:repository` — knowledge about one code repository (keyed by `repo_key`),
      readable by every authenticated user as shared team knowledge.
    * `:user`       — a private note readable only by the user who created it.
  """
  use Ash.Type.Enum,
    values: [
      global: [
        label: "Global",
        description: "Org-wide knowledge readable by every authenticated user."
      ],
      repository: [
        label: "Repository",
        description:
          "Knowledge about a specific code repository (keyed by repo_key); readable by every authenticated user as shared team knowledge."
      ],
      user: [
        label: "User",
        description: "A private note readable only by the user who created it."
      ]
    ]
end
