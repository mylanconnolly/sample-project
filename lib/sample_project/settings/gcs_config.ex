defmodule SampleProject.Settings.GcsConfig do
  @moduledoc """
  Singleton configuration for the Google Cloud Storage integration.

  Exactly one row of this resource is ever stored — the `:singleton` marker
  attribute, together with the `:singleton` identity, enforces that the upsert
  always targets the same record. The service account JSON key is encrypted at
  rest via `AshCloak` (the `:service_account_json` attribute becomes
  `:encrypted_service_account_json`, with a decrypting calculation of the same
  name).

  Use `SampleProject.Settings.gcs_config/0` to read the (decrypted, parsed)
  credentials and bucket when making storage requests rather than reading the
  attributes directly. The bucket is assumed to already exist; the GCP project
  id is read from the service account JSON itself, so it isn't stored separately.
  """
  use Ash.Resource,
    otp_app: :sample_project,
    domain: SampleProject.Settings,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    extensions: [AshCloak, AshTypescript.Resource]

  postgres do
    table "gcs_configs"
    repo SampleProject.Repo
  end

  cloak do
    vault(SampleProject.Vault)
    attributes [:service_account_json]
  end

  typescript do
    type_name "GcsConfig"
  end

  actions do
    defaults [:read]

    read :current do
      description "Fetch the singleton GCS configuration (a 0- or 1-element list)."
    end

    create :upsert do
      description "Create or update the singleton GCS configuration."
      primary? true
      upsert? true
      upsert_identity :singleton
      accept [:bucket_name]

      argument :service_account_json, :string do
        description "The GCS service account JSON key. Leave blank to keep the existing key unchanged."
        allow_nil? true
        sensitive? true
        public? true
      end

      change SampleProject.Settings.GcsConfig.Changes.EncryptServiceAccountJson
    end
  end

  policies do
    # Managing or reading the integration credentials is restricted to app-level
    # admins. System/internal reads (e.g. issuing a storage request) run with
    # `authorize?: false` and bypass these policies.
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

    attribute :service_account_json, :string do
      description "The GCS service account JSON key, encrypted at rest."
      allow_nil? true
      sensitive? true
      public? false
    end

    attribute :bucket_name, :string do
      description "The name of the (pre-existing) GCS bucket attachments are stored in."
      allow_nil? true
      public? true
    end

    create_timestamp :inserted_at
    update_timestamp :updated_at
  end

  calculations do
    # Lets the admin UI show whether a service account key is configured without
    # ever exposing the (encrypted, non-public) value itself.
    calculate :service_account_json_set,
              :boolean,
              expr(not is_nil(encrypted_service_account_json)) do
      public? true
      description "Whether a service account key has been configured."
    end
  end

  identities do
    identity :singleton, [:singleton]
  end
end
