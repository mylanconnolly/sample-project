defmodule SampleProject.StorageTest do
  use SampleProject.DataCase, async: false

  alias SampleProject.Accounts.User
  alias SampleProject.Settings.GcsConfig
  alias SampleProject.Storage

  @service_account Jason.encode!(%{
                     "type" => "service_account",
                     "project_id" => "my-project",
                     "private_key" =>
                       "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
                     "client_email" => "svc@my-project.iam.gserviceaccount.com"
                   })

  defp configure_gcs! do
    admin =
      Ash.Seed.seed!(User, %{
        email: "admin-#{System.unique_integer([:positive])}@t.io",
        role: :admin
      })

    GcsConfig
    |> Ash.Changeset.for_create(
      :upsert,
      %{bucket_name: "test-bucket", service_account_json: @service_account},
      actor: admin
    )
    |> Ash.create!()
  end

  setup do
    # Route Storage's Req client to a test stub; the preset `auth` makes ReqGCS
    # skip its real OAuth/token step (see req_gcs README "Testing").
    Application.put_env(:sample_project, Storage,
      req_options: [plug: {Req.Test, Storage}, auth: {:bearer, "test"}]
    )

    on_exit(fn -> Application.delete_env(:sample_project, Storage) end)
    :ok
  end

  test "upload PUTs the object to the configured bucket" do
    configure_gcs!()

    Req.Test.stub(Storage, fn conn ->
      assert conn.method == "POST"
      assert conn.host == "storage.googleapis.com"
      Req.Test.json(conn, %{"name" => "k"})
    end)

    assert :ok = Storage.upload("attachments/t/a/file.txt", "hello", "text/plain")
  end

  test "download returns the object bytes" do
    configure_gcs!()

    Req.Test.stub(Storage, fn conn ->
      Req.Test.text(conn, "the-bytes")
    end)

    assert {:ok, "the-bytes"} = Storage.download("attachments/t/a/file.txt")
  end

  test "delete treats a 404 as success" do
    configure_gcs!()

    Req.Test.stub(Storage, fn conn ->
      Plug.Conn.send_resp(conn, 404, "")
    end)

    assert :ok = Storage.delete("attachments/t/a/missing.txt")
  end

  test "surfaces a non-2xx response as an error" do
    configure_gcs!()

    Req.Test.stub(Storage, fn conn ->
      Plug.Conn.send_resp(conn, 500, "boom")
    end)

    assert {:error, {:gcs, 500, _}} = Storage.upload("k", "v", "text/plain")
  end

  test "returns :not_configured when storage isn't set up" do
    assert {:error, :not_configured} = Storage.download("k")
  end
end
