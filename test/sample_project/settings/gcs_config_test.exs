defmodule SampleProject.Settings.GcsConfigTest do
  use SampleProject.DataCase, async: true

  alias SampleProject.Accounts.User
  alias SampleProject.Settings
  alias SampleProject.Settings.GcsConfig

  @service_account Jason.encode!(%{
                     "type" => "service_account",
                     "project_id" => "my-project",
                     "private_key" =>
                       "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
                     "client_email" => "svc@my-project.iam.gserviceaccount.com"
                   })

  defp seed_user(role) do
    email = "#{role}-#{System.unique_integer([:positive])}@test.io"
    Ash.Seed.seed!(User, %{email: email, role: role})
  end

  defp upsert(attrs, actor) do
    GcsConfig
    |> Ash.Changeset.for_create(:upsert, attrs, actor: actor)
    |> Ash.create()
  end

  describe "service account key" do
    test "is encrypted at rest and decrypts on load" do
      admin = seed_user(:admin)

      {:ok, config} =
        upsert(%{bucket_name: "my-bucket", service_account_json: @service_account}, admin)

      # The plaintext is never stored in a readable column.
      assert is_binary(config.encrypted_service_account_json)

      loaded =
        Ash.load!(config, [:service_account_json, :service_account_json_set], authorize?: false)

      assert loaded.service_account_json == @service_account
      assert loaded.service_account_json_set == true
    end

    test "a blank key leaves the stored one unchanged" do
      admin = seed_user(:admin)

      {:ok, _} = upsert(%{bucket_name: "b1", service_account_json: @service_account}, admin)
      # Update the bucket without re-sending the key.
      {:ok, _} = upsert(%{bucket_name: "b2", service_account_json: ""}, admin)

      assert {:ok, %{bucket: "b2", credentials: %{"type" => "service_account"}}} =
               Settings.gcs_config()
    end

    test "rejects a key that isn't a service account" do
      admin = seed_user(:admin)

      assert {:error, %Ash.Error.Invalid{}} =
               upsert(%{bucket_name: "b", service_account_json: ~s({"type":"user"})}, admin)
    end

    test "rejects invalid JSON" do
      admin = seed_user(:admin)

      assert {:error, %Ash.Error.Invalid{}} =
               upsert(%{bucket_name: "b", service_account_json: "not json"}, admin)
    end
  end

  describe "gcs_config/0" do
    test "returns the parsed credentials and bucket" do
      admin = seed_user(:admin)

      {:ok, _} =
        upsert(%{bucket_name: "the-bucket", service_account_json: @service_account}, admin)

      assert {:ok, %{bucket: "the-bucket", credentials: credentials}} = Settings.gcs_config()
      assert credentials["client_email"] == "svc@my-project.iam.gserviceaccount.com"
    end

    test "returns :error when nothing is configured" do
      assert :error = Settings.gcs_config()
    end

    test "returns :error when the bucket is missing" do
      admin = seed_user(:admin)
      {:ok, _} = upsert(%{service_account_json: @service_account}, admin)

      assert :error = Settings.gcs_config()
    end
  end

  describe "policies" do
    test "only app admins may write the config" do
      user = seed_user(:user)
      assert {:error, %Ash.Error.Forbidden{}} = upsert(%{bucket_name: "b"}, user)
    end

    test "an admin can read the config; a non-admin sees nothing" do
      admin = seed_user(:admin)
      user = seed_user(:user)
      {:ok, _} = upsert(%{bucket_name: "b"}, admin)

      assert {:ok, [_]} =
               GcsConfig |> Ash.Query.for_read(:current, %{}, actor: admin) |> Ash.read()

      assert {:ok, []} =
               GcsConfig |> Ash.Query.for_read(:current, %{}, actor: user) |> Ash.read()
    end
  end
end
