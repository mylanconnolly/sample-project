defmodule SampleProject.Memories.Memory do
  @moduledoc """
  A durable note ("memory") recorded and recalled by AI agents over MCP.

  Memories let Claude Code / Desktop persist knowledge across workstations and
  users. Each memory has a `scope` (see `SampleProject.Memories.Memory.Scope`) that
  governs visibility:

    * `:global`     — readable by every authenticated user.
    * `:repository` — readable by every authenticated user; tied to a `repo_key`
      (a normalized "owner/name") so memories group by the repo an agent is in.
    * `:user`       — readable only by its `created_by` owner.

  Anyone may create a memory; only its owner (or an app-admin) may edit or delete
  it. Each memory carries an inline `BAAI/bge-small-en-v1.5` embedding of its
  `content` so `:search_memories` can rank by cosine similarity. Embedding is
  fail-open: if the model is unavailable the note still saves (with a nil
  `embedding`) and remains findable by the keyword `:list_memories` search; a
  backfill can re-embed it later.
  """
  use Ash.Resource,
    otp_app: :sample_project,
    domain: SampleProject.Memories,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshTypescript.Resource]

  postgres do
    table "memories"
    repo SampleProject.Repo

    custom_indexes do
      index [:scope]
      index [:repo_key]
      index [:created_by_id]
    end

    # The HNSW vector index needs the `vector_cosine_ops` operator class, which the
    # `custom_indexes` DSL can't express — so it's raw SQL here. The operator class
    # must match the `<=>` cosine queries used by `:search_memories`.
    custom_statements do
      statement :memories_embedding_hnsw do
        up """
        CREATE INDEX memories_embedding_hnsw_index
          ON memories
          USING hnsw (embedding vector_cosine_ops)
          WITH (m = 16, ef_construction = 64)
        """

        down "DROP INDEX IF EXISTS memories_embedding_hnsw_index"
      end
    end
  end

  typescript do
    type_name "Memory"
  end

  actions do
    defaults [:read]

    read :list_memories do
      description "List memories visible to the actor, optionally filtered by scope/repo_key and a keyword search over content. Newest first."

      argument :scope, SampleProject.Memories.Memory.Scope, allow_nil?: true
      argument :repo_key, :string, allow_nil?: true

      argument :search, :string do
        description "Optional case-insensitive keyword/phrase filter over content (supports quoted phrases and -exclusions)."
        allow_nil? true
      end

      filter expr(
               (is_nil(^arg(:scope)) or scope == ^arg(:scope)) and
                 (is_nil(^arg(:repo_key)) or repo_key == ^arg(:repo_key))
             )

      prepare {SampleProject.Search.PhraseSearch, argument: :search, fields: [:content]}
      prepare build(sort: [inserted_at: :desc, id: :desc])

      pagination do
        keyset? true
        default_limit 25
        countable true
        required? false
      end
    end

    read :get_memory do
      description "Fetch a single memory by id."
      get_by :id
    end

    read :search_memories do
      description "Semantic search over memories the actor may see. The server embeds the query and ranks results by vector similarity. Optionally narrow by scope/repo_key."

      argument :query, :string, allow_nil?: false
      argument :scope, SampleProject.Memories.Memory.Scope, allow_nil?: true
      argument :repo_key, :string, allow_nil?: true

      argument :limit, :integer do
        allow_nil? false
        default 10
      end

      filter expr(
               (is_nil(^arg(:scope)) or scope == ^arg(:scope)) and
                 (is_nil(^arg(:repo_key)) or repo_key == ^arg(:repo_key))
             )

      prepare SampleProject.Memories.Memory.Preparations.EmbedAndFilterSimilar
    end

    create :create do
      description "Create a memory. The acting user becomes its owner. For repository scope, pass repo_key."

      accept [:scope, :repo_key, :content]

      change relate_actor(:created_by)
      change SampleProject.Memories.Memory.Changes.ResolveRepo
      change SampleProject.Memories.Memory.Changes.SetEmbedding

      validate present(:repo_key),
        where: [attribute_equals(:scope, :repository)],
        message: "is required for repository-scoped memories"
    end

    update :update do
      description "Update a memory's content (and, for repository scope, its repo_key)."

      accept [:content, :repo_key]

      # The repo lookup and embedding run as non-atomic changes.
      require_atomic? false

      change SampleProject.Memories.Memory.Changes.ResolveRepo
      change SampleProject.Memories.Memory.Changes.SetEmbedding
    end

    destroy :delete do
      description "Delete a memory."
    end
  end

  policies do
    # App-level admins are global superusers: read/write any memory.
    bypass actor_attribute_equals(:role, :admin) do
      authorize_if always()
    end

    # Read visibility matrix: global + repository are shared with everyone; user
    # memories are private to their owner.
    policy action_type(:read) do
      authorize_if expr(scope in [:global, :repository])
      authorize_if expr(scope == :user and created_by_id == ^actor(:id))
    end

    # Any authenticated user may record a memory.
    policy action(:create) do
      authorize_if actor_present()
    end

    # Editing/deleting is limited to the owner (admins handled by the bypass).
    policy action([:update, :delete]) do
      authorize_if expr(created_by_id == ^actor(:id))
    end
  end

  attributes do
    uuid_primary_key :id

    attribute :scope, SampleProject.Memories.Memory.Scope do
      description "Visibility/grouping scope of the memory."
      allow_nil? false
      public? true
    end

    attribute :repo_key, :string do
      description "Free-text repository identity for :repository scope, e.g. \"org/repo\". Normalized to lowercase \"owner/name\" on write; nil for other scopes."
      allow_nil? true
      public? true
    end

    attribute :content, :string do
      description "The memory note, plain text."
      allow_nil? false
      public? true
    end

    attribute :content_hash, :string do
      description "SHA-256 (hex) of the embedded content; lets :update skip re-embedding unchanged text."
      allow_nil? true
    end

    attribute :embedding, :vector do
      description "The bge-small-en-v1.5 embedding of content; nil if embedding failed (the note is still keyword-searchable)."
      allow_nil? true
      constraints dimensions: 384
    end

    timestamps do
      public? true
    end
  end

  relationships do
    belongs_to :created_by, SampleProject.Accounts.User do
      description "The user who created the memory (its owner)."
      allow_nil? false
      public? true
      domain SampleProject.Accounts
    end
  end
end
