defmodule SampleProject.Accounts.ApiKey do
  use Ash.Resource,
    otp_app: :sample_project,
    domain: SampleProject.Accounts,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshTypescript.Resource]

  postgres do
    table "api_keys"
    repo SampleProject.Repo
  end

  typescript do
    type_name "ApiKey"
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      primary? true
      accept [:user_id, :expires_at, :name]

      change {AshAuthentication.Strategy.ApiKey.GenerateApiKey,
              prefix: :sampleproject, hash: :api_key_hash}
    end

    # Self-service: the signed-in user generates a key for themselves. The user
    # is taken from the actor (never accepted as input) so a user can only ever
    # create keys for their own account.
    create :generate do
      description "Generate a new API key for the current user."
      accept [:name, :expires_at]

      change relate_actor(:user)

      change {AshAuthentication.Strategy.ApiKey.GenerateApiKey,
              prefix: :sampleproject, hash: :api_key_hash}

      # The plaintext key is set into the record's metadata by GenerateApiKey and
      # is the ONLY time the full key is available. Declaring it here returns it
      # in the action result so the UI can show it once, then it's gone forever.
      metadata :plaintext_api_key, :string do
        description "The full API key. Only returned at creation time and never again."
        allow_nil? false
      end
    end

    read :list_for_actor do
      description "List the current user's API keys, newest first."
      filter expr(user_id == ^actor(:id))
      prepare build(sort: [inserted_at: :desc])
    end
  end

  policies do
    bypass AshAuthentication.Checks.AshAuthenticationInteraction do
      authorize_if always()
    end

    # A user may generate a key (it's forced to belong to them via relate_actor).
    policy action(:generate) do
      authorize_if actor_present()
    end

    # Users may only read/destroy their own keys. This also gates the record
    # lookup performed by the destroy action.
    policy action_type([:read, :destroy]) do
      authorize_if expr(user_id == ^actor(:id))
    end
  end

  attributes do
    uuid_primary_key :id

    attribute :name, :string do
      description "A human-friendly label so the user can tell their keys apart."
      allow_nil? true
      public? true
    end

    attribute :api_key_hash, :binary do
      allow_nil? false
      sensitive? true
    end

    attribute :expires_at, :utc_datetime_usec do
      allow_nil? false
      public? true
    end

    timestamps do
      public? true
    end
  end

  relationships do
    belongs_to :user, SampleProject.Accounts.User
  end

  calculations do
    calculate :valid, :boolean, expr(expires_at > now()) do
      public? true
    end
  end

  identities do
    identity :unique_api_key, [:api_key_hash]
  end
end
