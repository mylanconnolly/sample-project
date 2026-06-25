defmodule SampleProject.Settings.AnthropicConfig do
  @moduledoc """
  Singleton configuration for the Anthropic/Claude integration.

  Exactly one row of this resource is ever stored — the `:singleton` marker
  attribute, together with the `:singleton` identity, enforces that the upsert
  always targets the same record. The API key is encrypted at rest via
  `AshCloak` (the `:api_key` attribute becomes `:encrypted_api_key`, with a
  decrypting calculation of the same name).

  Use `SampleProject.Settings.anthropic_api_key/0` to read the (decrypted) key when
  making requests rather than reading the attribute directly.
  """
  use Ash.Resource,
    otp_app: :sample_project,
    domain: SampleProject.Settings,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshCloak, AshTypescript.Resource]

  postgres do
    table "anthropic_configs"
    repo SampleProject.Repo
  end

  cloak do
    vault(SampleProject.Vault)
    attributes [:api_key]
  end

  typescript do
    type_name "AnthropicConfig"
  end

  actions do
    defaults [:read]

    read :current do
      description "Fetch the singleton Anthropic configuration (a 0- or 1-element list)."
    end

    action :list_models, {:array, :map} do
      constraints items: [
                    fields: [
                      id: [type: :string, allow_nil?: false],
                      display_name: [type: :string, allow_nil?: false]
                    ]
                  ]

      description """
      List the Claude models available to the configured API key. Results are
      cached ~1h by the client; returns [] when no key is set or the call fails.
      """

      run SampleProject.Settings.AnthropicConfig.Actions.ListModels
    end

    create :upsert do
      description "Create or update the singleton Anthropic configuration."
      primary? true
      upsert? true
      upsert_identity :singleton
      accept [:default_model]

      argument :api_key, :string do
        description "The Anthropic API key. Leave blank to keep the existing key unchanged."
        allow_nil? true
        sensitive? true
        public? true
      end

      change SampleProject.Settings.AnthropicConfig.Changes.EncryptApiKey
    end
  end

  policies do
    # Managing or reading the integration credentials is restricted to
    # app-level admins. System/internal reads (e.g. when issuing an Anthropic
    # request) run with `authorize?: false` and bypass these policies.
    policy always() do
      authorize_if actor_attribute_equals(:role, :admin)
    end
  end

  attributes do
    uuid_primary_key :id

    attribute :singleton, :atom do
      description "Marker constraining this resource to a single row."
      constraints one_of: [:singleton]
      default :singleton
      allow_nil? false
      writable? false
      public? false
    end

    attribute :api_key, :string do
      description "The Anthropic API key, encrypted at rest."
      allow_nil? true
      sensitive? true
      public? false
    end

    attribute :default_model, :string do
      description "Default Claude model id used when a call doesn't specify one."
      allow_nil? true
      public? true
    end

    create_timestamp :inserted_at
    update_timestamp :updated_at
  end

  calculations do
    # Lets the admin UI show whether a key is configured without ever exposing
    # the (encrypted, non-public) key itself.
    calculate :api_key_set, :boolean, expr(not is_nil(encrypted_api_key)) do
      public? true
      description "Whether an API key has been configured."
    end
  end

  identities do
    identity :singleton, [:singleton]
  end
end
