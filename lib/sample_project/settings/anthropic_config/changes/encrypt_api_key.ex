defmodule SampleProject.Settings.AnthropicConfig.Changes.EncryptApiKey do
  @moduledoc """
  Encrypts the `:api_key` argument into the `encrypted_api_key` attribute.

  A blank or absent argument leaves any existing key untouched, so an admin can
  update other settings (e.g. the default model) without re-entering the key.
  The plaintext is never written to an attribute directly — `AshCloak` handles
  encryption via a before-action hook.
  """
  use Ash.Resource.Change

  @impl true
  def change(changeset, _opts, _context) do
    case Ash.Changeset.fetch_argument(changeset, :api_key) do
      {:ok, value} when is_binary(value) ->
        case String.trim(value) do
          "" -> changeset
          trimmed -> AshCloak.encrypt_and_set(changeset, :api_key, trimmed)
        end

      _ ->
        changeset
    end
  end
end
