# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :ash_typescript,
  output_file: "assets/js/ash_rpc.ts",
  run_endpoint: "/rpc/run",
  validate_endpoint: "/rpc/validate",
  input_field_formatter: :camel_case,
  output_field_formatter: :camel_case,
  require_tenant_parameters: false,
  generate_zod_schemas: false,
  generate_phx_channel_rpc_actions: true,
  generate_validation_functions: true,
  typed_channels: [SampleProjectWeb.AccountChannel],
  typed_channels_output_file: "assets/js/ash_typed_channels.ts",
  json_manifest_file: "assets/js/ash_rpc_manifest.json",
  json_manifest_filename_format: :relative,
  zod_import_path: "zod",
  zod_schema_suffix: "ZodSchema",
  phoenix_import_path: "phoenix"

# Run AshOban triggers/scheduled actions as trusted system jobs (no actor). They
# operate over whole resources — and resolve aggregates across related resources —
# which actor-based policies can't authorize, and the AshOban context doesn't reach
# aggregate authorization, so a policy bypass alone is insufficient.
config :ash_oban, pro?: false, authorize?: false

# Anthropic/Claude client. The API key is resolved at request time and is
# supplied per-call from the encrypted `SampleProject.Settings.AnthropicConfig`
# singleton (see `SampleProject.Settings.anthropic_api_key/0`), so it is intentionally
# not set here.
config :req_anthropic, anthropic_version: "2023-06-01"

# Local text-embedding backend for semantic similarity search (memories). The real
# adapter serves bge-small-en-v1.5 in-BEAM (see SampleProject.Embeddings.ServingAdapter);
# config/test.exs and config/dev.exs override `:adapter` with the model-free stub.
config :sample_project, :embeddings,
  adapter: SampleProject.Embeddings.ServingAdapter,
  repo: "BAAI/bge-small-en-v1.5"

# Bumblebee/Nx run on EXLA across the app.
config :nx, :default_backend, EXLA.Backend

config :sample_project, Oban,
  engine: Oban.Engines.Basic,
  notifier: Oban.Notifiers.Postgres,
  queues: [
    default: 10,
    # Lower concurrency: each job may embed many chunks, but the serving batches
    # internally, so a few concurrent jobs saturate it.
    embeddings: 4
  ],
  repo: SampleProject.Repo,
  plugins: [{Oban.Plugins.Cron, []}]

config :ash,
  allow_forbidden_field_for_relationships_by_default?: true,
  include_embedded_source_by_default?: false,
  show_keysets_for_all_actions?: false,
  default_page_type: :keyset,
  policies: [no_filter_static_forbidden_reads?: false],
  keep_read_action_loads_when_loading?: false,
  default_actions_require_atomic?: true,
  read_action_after_action_hooks_in_order?: true,
  bulk_actions_default_to_errors?: true,
  transaction_rollback_on_error?: true,
  redact_sensitive_values_in_errors?: true,
  known_types: [AshPostgres.Timestamptz, AshPostgres.TimestamptzUsec]

config :spark,
  formatter: [
    remove_parens?: true,
    "Ash.Resource": [
      section_order: [
        :authentication,
        :token,
        :user_identity,
        :postgres,
        :resource,
        :code_interface,
        :actions,
        :policies,
        :pub_sub,
        :preparations,
        :changes,
        :validations,
        :multitenancy,
        :attributes,
        :relationships,
        :calculations,
        :aggregates,
        :identities
      ]
    ],
    "Ash.Domain": [section_order: [:resources, :policies, :authorization, :domain, :execution]]
  ]

config :sample_project,
  ecto_repos: [SampleProject.Repo],
  generators: [timestamp_type: :utc_datetime],
  ash_domains: [
    SampleProject.Accounts,
    SampleProject.Settings,
    SampleProject.Audit,
    SampleProject.Memories
  ]

# Return an explicit error (rather than an empty result) when an invalid magic
# link token is used. Recommended once registration is disabled so failed
# sign-ins are distinguishable. Read from the :ash_authentication app env.
config :ash_authentication, return_error_on_invalid_magic_link_token?: true

# Configure the endpoint
config :sample_project, SampleProjectWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [html: SampleProjectWeb.ErrorHTML, json: SampleProjectWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: SampleProject.PubSub,
  live_view: [signing_salt: "4dD6Bql/"]

# Configure LiveView
config :phoenix_live_view,
  # the attribute set on all root tags. Used for Phoenix.LiveView.ColocatedCSS.
  root_tag_attribute: "phx-r"

# Configure the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. You can see the emails in your browser, at "/dev/mailbox".
#
# For production it's recommended to configure a different adapter
# at the `config/runtime.exs`.
config :sample_project, SampleProject.Mailer, adapter: Swoosh.Adapters.Local

# Assets are built with Vite (see assets/vite.config.ts and SampleProjectWeb.Vite).
# In dev the Vite dev server provides HMR; in prod `mix assets.deploy` runs
# `vite build`, which content-hashes output into priv/static/assets.

# Configure Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
