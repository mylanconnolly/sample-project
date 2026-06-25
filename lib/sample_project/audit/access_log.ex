defmodule SampleProject.Audit.AccessLog do
  @moduledoc """
  An append-only record of access to a PHI-bearing record: who touched which record,
  when, how, and from where.

  This complements (does not replace) `ash_paper_trail`. Paper trail records *what
  changed* on writes; the access log records *all access* — including **reads**
  (views/lists/downloads), which versioning never captures — as a single queryable
  trail. Rows are written asynchronously by `SampleProject.Audit.LogWriter` (enqueued from
  the `SampleProject.Audit.LogRead` preparation and `SampleProject.Audit.LogWrite` change on each
  in-scope resource), so logging never blocks a read.

  The actor is snapshotted (`actor_id` *and* `actor_email`) and the row carries no
  foreign keys to source rows, so the trail stays intact and meaningful even after the
  user or the accessed record is later changed or deleted.

  There is intentionally **no update or destroy action** — the log is immutable.
  """
  use Ash.Resource,
    otp_app: :sample_project,
    domain: SampleProject.Audit,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshTypescript.Resource]

  postgres do
    table "access_logs"
    repo SampleProject.Repo

    custom_indexes do
      # Support the common audit queries: "everything touching this record",
      # "everything this user did", "everything in this project", and time ranges
      # (also what a future retention/pruning job will scan).
      index [:record_id]
      index [:actor_id]
      index [:project_id]
      index [:occurred_at]
      # Grouping/filtering all reads from one page load.
      index [:page_view_id]
    end
  end

  typescript do
    type_name "AccessLog"
  end

  actions do
    create :log do
      description "Record a single access event. System-only — written by SampleProject.Audit.LogWriter."

      accept [
        :action_type,
        :action_name,
        :resource_type,
        :record_id,
        :project_id,
        :actor_id,
        :actor_email,
        :ip_address,
        :user_agent,
        :request_id,
        :request_path,
        :page_view_id,
        :occurred_at
      ]
    end

    read :read do
      primary? true
    end

    read :list_access_logs do
      description "Browse the access log, newest first. App-admin only (see policies)."

      argument :actor_id, :uuid, allow_nil?: true
      argument :record_id, :uuid, allow_nil?: true
      argument :project_id, :uuid, allow_nil?: true
      argument :action_type, SampleProject.Audit.ActionType, allow_nil?: true

      argument :actor_email, :string do
        description "Substring match on the acting user's (snapshotted) email."
        allow_nil? true
      end

      argument :from, :utc_datetime_usec do
        description "Only events at or after this time."
        allow_nil? true
      end

      argument :to, :utc_datetime_usec do
        description "Only events at or before this time."
        allow_nil? true
      end

      filter expr(
               (is_nil(^arg(:actor_id)) or actor_id == ^arg(:actor_id)) and
                 (is_nil(^arg(:record_id)) or record_id == ^arg(:record_id)) and
                 (is_nil(^arg(:project_id)) or project_id == ^arg(:project_id)) and
                 (is_nil(^arg(:action_type)) or action_type == ^arg(:action_type)) and
                 (is_nil(^arg(:actor_email)) or contains(actor_email, ^arg(:actor_email))) and
                 (is_nil(^arg(:from)) or occurred_at >= ^arg(:from)) and
                 (is_nil(^arg(:to)) or occurred_at <= ^arg(:to))
             )

      # `id` tiebreaks events recorded within the same microsecond.
      prepare build(sort: [occurred_at: :desc, id: :desc])

      pagination do
        keyset? true
        default_limit 50
        countable true
        required? false
      end
    end
  end

  policies do
    # Reading the access log is restricted to app-level admins.
    policy action_type(:read) do
      authorize_if actor_attribute_equals(:role, :admin)
    end

    # The log is system-written: `LogWriter` creates rows with `authorize?: false`,
    # so there is no authorized path to forge an entry.
    policy action_type(:create) do
      forbid_if always()
    end
  end

  attributes do
    uuid_primary_key :id

    attribute :action_type, SampleProject.Audit.ActionType do
      description "Whether the record was read, created, updated, or destroyed."
      allow_nil? false
      public? true
    end

    attribute :action_name, :string do
      description "The Ash action that ran, e.g. \"list_memories\" or \"update\"."
      allow_nil? false
      public? true
    end

    attribute :resource_type, :string do
      description "The accessed resource, e.g. \"memory\" or \"user\"."
      allow_nil? false
      public? true
    end

    attribute :record_id, :uuid do
      description "The accessed record's id. Null for accesses that aren't record-scoped."
      public? true
    end

    attribute :project_id, :uuid do
      description "The owning project, when derivable from the record, for scoping/filtering."
      public? true
    end

    attribute :actor_id, :uuid do
      description "The acting user's id. Null for system access (no actor)."
      public? true
    end

    attribute :actor_email, :string do
      description "Snapshot of the acting user's email, kept even if the user is later removed."
      public? true
    end

    attribute :ip_address, :string do
      description "Source IP of the request, when available (absent for non-HTTP access)."
      public? true
    end

    attribute :user_agent, :string do
      description "Request User-Agent, when available."
      public? true
    end

    attribute :request_id, :string do
      description "Correlation id of the originating HTTP request, when available."
      public? true
    end

    attribute :request_path, :string do
      description "The SPA page the request came from (its Referer path), when available."
      public? true
    end

    attribute :page_view_id, :string do
      description "Per-page-load correlation id grouping every read from one navigation."
      public? true
    end

    attribute :occurred_at, :utc_datetime_usec do
      description "When the access happened (captured at access time, not when the row was written)."
      allow_nil? false
      public? true
    end
  end
end
