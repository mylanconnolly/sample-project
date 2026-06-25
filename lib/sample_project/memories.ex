defmodule SampleProject.Memories do
  @moduledoc """
  Durable agent memories.

  A small store that lets AI agents (Claude Code / Desktop) record and recall
  knowledge across workstations and users — over MCP (the `tools` block, served at
  `/mcp`) and via the admin web UI (the `typescript_rpc` block). See
  `SampleProject.Memories.Memory` for the scope/visibility model and the semantic +
  keyword search actions.
  """
  use Ash.Domain,
    otp_app: :sample_project,
    extensions: [AshTypescript.Rpc, AshAi]

  typescript_rpc do
    resource SampleProject.Memories.Memory do
      rpc_action :list_memories, :list_memories
      rpc_action :get_memory, :get_memory
      rpc_action :search_memories, :search_memories
      rpc_action :create_memory, :create
      rpc_action :update_memory, :update
      rpc_action :delete_memory, :delete
    end
  end

  # Exposed to AI agents over MCP (see the router's AshAi.Mcp.Router tools list).
  tools do
    tool :create_memory, SampleProject.Memories.Memory, :create
    tool :search_memories, SampleProject.Memories.Memory, :search_memories
    tool :list_memories, SampleProject.Memories.Memory, :list_memories
    tool :get_memory, SampleProject.Memories.Memory, :get_memory
    tool :update_memory, SampleProject.Memories.Memory, :update
    tool :delete_memory, SampleProject.Memories.Memory, :delete
  end

  resources do
    resource SampleProject.Memories.Memory
  end
end
