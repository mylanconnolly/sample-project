defmodule SampleProject.MixProject do
  use Mix.Project

  def project do
    [
      app: :sample_project,
      version: "0.1.0",
      elixir: "~> 1.15",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps(),
      compilers: [:phoenix_live_view] ++ Mix.compilers(),
      listeners: [Phoenix.CodeReloader],
      consolidate_protocols: Mix.env() != :dev,
      usage_rules: usage_rules()
    ]
  end

  defp usage_rules do
    # Example for those using claude.
    [
      file: "CLAUDE.md",
      # rules to include directly in CLAUDE.md
      usage_rules: ["usage_rules:all"],
      skills: [
        location: ".claude/skills",
        # build skills that combine multiple usage rules
        build: [
          "ash-framework": [
            # The description tells people how to use this skill.
            description:
              "Use this skill working with Ash Framework or any of its extensions. Always consult this when making any domain changes, features or fixes.",
            # Include all Ash dependencies
            usage_rules: [:ash, ~r/^ash_/]
          ],
          "phoenix-framework": [
            description:
              "Use this skill working with Phoenix Framework. Consult this when working with the web layer, controllers, views, liveviews etc.",
            # Include all Phoenix dependencies
            usage_rules: [:phoenix, ~r/^phoenix_/]
          ],
          req: [
            description:
              "Use this skill when you need to make a request to an external API or service.",
            usage_rules: [:req]
          ]
        ]
      ]
    ]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      mod: {SampleProject.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  def cli do
    [
      preferred_envs: [precommit: :test]
    ]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Specifies your project dependencies.
  #
  # Type `mix help deps` for examples and options.
  defp deps do
    [
      {:req_gcs, "~> 0.1"},
      {:req_anthropic, "~> 0.2"},
      # Local, in-BEAM text embeddings for semantic similarity search
      # (SampleProject.Embeddings). bge-small-en-v1.5 is served via Bumblebee + Nx.Serving
      # with the EXLA compiler; tests/CI use a deterministic stub adapter instead so
      # they never load EXLA. See lib/sample_project/embeddings/.
      {:bumblebee, "~> 0.6"},
      {:nx, "~> 0.9"},
      {:exla, "~> 0.9"},
      # Bumblebee → progress_bar declares a stale `decimal ~> 2.0` cap, but our Ecto
      # requires `decimal ~> 3.0`. progress_bar only formats numbers and runs fine on
      # decimal 3, so we override to let the two coexist. Without this, dependency
      # resolution fails.
      {:decimal, "~> 3.0", override: true},
      # Phrase-aware splitter for search query parsing (SampleProject.Search).
      {:phrase_utils, "~> 0.1.0"},
      {:picosat_elixir, "~> 0.2"},
      {:sourceror, "~> 1.8", only: [:dev, :test]},
      {:oban, "~> 2.0"},
      {:ash_typescript, "~> 0.17"},
      {:ash_ai, "~> 0.7"},
      {:usage_rules, "~> 1.0", only: [:dev]},
      {:ash_cloak, "~> 0.3"},
      {:cloak, "~> 1.0"},
      {:tidewave, "~> 0.6", only: [:dev]},
      {:oban_web, "~> 2.0"},
      {:ash_oban, "~> 0.8"},
      {:ash_authentication_phoenix, "~> 2.0"},
      {:ash_authentication, "~> 4.0"},
      {:ash_postgres, "~> 2.0"},
      {:ash_phoenix, "~> 2.0"},
      {:ash, "~> 3.0"},
      {:igniter, "~> 0.6", only: [:dev, :test]},
      {:phoenix, "~> 1.8.8"},
      {:phoenix_ecto, "~> 4.5"},
      {:ecto_sql, "~> 3.13"},
      {:postgrex, ">= 0.0.0"},
      {:phoenix_html, "~> 4.1"},
      {:phoenix_live_reload, "~> 1.2", only: :dev},
      {:phoenix_live_view, "~> 1.2.0"},
      {:lazy_html, ">= 0.1.0", only: :test},
      {:phoenix_live_dashboard, "~> 0.9.0"},
      {:heroicons,
       github: "tailwindlabs/heroicons",
       tag: "v2.2.0",
       sparse: "optimized",
       app: false,
       compile: false,
       depth: 1},
      {:swoosh, "~> 1.16"},
      {:req, "~> 0.6", override: true},
      {:telemetry_metrics, "~> 1.0"},
      {:telemetry_poller, "~> 1.0"},
      {:gettext, "~> 1.0"},
      {:jason, "~> 1.2"},
      {:dns_cluster, "~> 0.2.0"},
      {:bandit, "~> 1.5"},
      # Kubernetes-aware health checks (startup/liveness/readiness probes).
      # See SampleProject.Health and the plug at the top of SampleProjectWeb.Endpoint.
      {:kubernetes_health_check, "~> 0.7"}
    ]
  end

  # Aliases are shortcuts or tasks specific to the current project.
  # For example, to install project dependencies and perform other setup tasks, run:
  #
  #     $ mix setup
  #
  # See the documentation for `Mix` for more info on aliases.
  defp aliases do
    [
      setup: ["deps.get", "ash.setup", "assets.setup", "assets.build", "run priv/repo/seeds.exs"],
      "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: ["ash.setup --quiet", "test"],
      "assets.setup": ["ash_typescript.npm_install", "cmd --cd assets npm install"],
      "assets.build": ["compile", "cmd --cd assets npm run build"],
      "assets.deploy": ["cmd --cd assets npm run build"],
      precommit: [
        "compile --warnings-as-errors",
        "deps.unlock --unused",
        "format",
        "cmd --cd assets npm run format",
        "ash_typescript.codegen --check",
        "cmd --cd assets npx tsc --noEmit",
        "cmd --cd assets npm test",
        "test"
      ]
    ]
  end
end
