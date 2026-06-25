defmodule SampleProject.Settings.GcsConfig.Changes.EncryptServiceAccountJson do
  @moduledoc """
  Validates and encrypts the `:service_account_json` argument into the
  `encrypted_service_account_json` attribute.

  A blank or absent argument leaves any existing key untouched, so an admin can
  update other settings (e.g. the bucket name) without re-entering the key.
  When provided, the value must be valid JSON describing a GCS service account
  (`"type": "service_account"` with a private key and client email); otherwise
  the change adds an error. The plaintext is never written to an attribute
  directly — `AshCloak` handles encryption via a before-action hook.
  """
  use Ash.Resource.Change

  @impl true
  def change(changeset, _opts, _context) do
    case Ash.Changeset.fetch_argument(changeset, :service_account_json) do
      {:ok, value} when is_binary(value) ->
        case String.trim(value) do
          "" -> changeset
          trimmed -> validate_and_encrypt(changeset, trimmed)
        end

      _ ->
        changeset
    end
  end

  defp validate_and_encrypt(changeset, trimmed) do
    case Jason.decode(trimmed) do
      {:ok, %{"type" => "service_account", "private_key" => pk, "client_email" => email}}
      when is_binary(pk) and is_binary(email) ->
        AshCloak.encrypt_and_set(changeset, :service_account_json, trimmed)

      {:ok, _} ->
        Ash.Changeset.add_error(changeset,
          field: :service_account_json,
          message:
            "must be a GCS service account key (JSON with \"type\": \"service_account\", a private key and client email)"
        )

      {:error, _} ->
        Ash.Changeset.add_error(changeset,
          field: :service_account_json,
          message: "must be valid JSON"
        )
    end
  end
end
