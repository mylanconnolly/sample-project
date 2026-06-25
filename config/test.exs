import Config
config :sample_project, Oban, testing: :manual

# Use the deterministic, model-free embedding adapter so the suite/CI never load
# EXLA or download a model. See SampleProject.Embeddings.StubAdapter.
config :sample_project, :embeddings, adapter: SampleProject.Embeddings.StubAdapter

# Keep Nx on the pure-Elixir backend in test (the stub doesn't use it, but this
# avoids any accidental EXLA dependency at runtime).
config :nx, :default_backend, Nx.BinaryBackend
config :sample_project, token_signing_secret: "4KZSiOKt4HHTYFCbRzsxD6vdhkzofnft"
config :bcrypt_elixir, log_rounds: 1
config :ash, policies: [show_policy_breakdowns?: true], disable_async?: true

# Cloak vault key for the test environment (throwaway).
config :sample_project, SampleProject.Vault,
  ciphers: [
    default:
      {Cloak.Ciphers.AES.GCM,
       tag: "AES.GCM.V1",
       key: Base.decode64!("rogEEAOtqIVAYAF59nct6l1M7lc24ynhnzDAiM5U818="),
       iv_length: 12}
  ]

# Configure your database
#
# The MIX_TEST_PARTITION environment variable can be used
# to provide built-in test partitioning in CI environment.
# Run `mix help test` for more information.
config :sample_project, SampleProject.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "sample_project_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: System.schedulers_online() * 2,
  # Encode/decode pgvector `vector` columns as Ash.Vector (see SampleProject.PostgrexTypes).
  types: SampleProject.PostgrexTypes

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :sample_project, SampleProjectWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "aA7hxxEOiNnxVoDXu+7CIYcG0Zl09oQyRz2Uq0dPn0mvK0XQrhOgkZPgQB6X1ysZ",
  server: false

# Render Vite *dev-server* asset tags in test so controller tests that exercise
# the SPA shell don't require a production build (priv/static/assets/.vite/
# manifest.json, which isn't present in CI). The URL need not be reachable —
# tests assert the rendered shell, never load the assets. See SampleProjectWeb.Vite.
config :sample_project, :vite_dev_server, "http://localhost:5173"

# In test we don't send emails
config :sample_project, SampleProject.Mailer, adapter: Swoosh.Adapters.Test

# Disable swoosh api client as it is only required for production adapters
config :swoosh, :api_client, false

# Print only warnings and errors during test
config :logger, level: :warning

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime

# Enable helpful, but potentially expensive runtime checks
config :phoenix_live_view,
  enable_expensive_runtime_checks: true

# Sort query params output of verified routes for robust url comparisons
config :phoenix,
  sort_verified_routes_query_params: true
