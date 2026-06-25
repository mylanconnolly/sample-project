defmodule SampleProject.Audit.AccessLogTest do
  use SampleProject.DataCase, async: true
  use Oban.Testing, repo: SampleProject.Repo

  alias SampleProject.Accounts.User
  alias SampleProject.Audit.AccessLog
  alias SampleProject.Audit.LogWriter

  defp seed_user(role) do
    email = "#{role}-#{System.unique_integer([:positive])}@test.io"
    Ash.Seed.seed!(User, %{email: email, role: role})
  end

  # Seed an AccessLog row directly. The log is normally written asynchronously by
  # SampleProject.Audit.LogWriter (enqueued from a resource that opts into the LogWrite
  # notifier / LogRead preparation); seeding lets us exercise the resource itself.
  defp seed_log(attrs) do
    defaults = %{
      action_type: :read,
      action_name: "get",
      resource_type: "user",
      record_id: Ash.UUID.generate(),
      actor_email: "someone@test.io",
      occurred_at: DateTime.utc_now()
    }

    Ash.Seed.seed!(AccessLog, Map.merge(defaults, attrs))
  end

  describe "log writer" do
    test "perform/1 inserts a row per entry" do
      entry = %{
        "action_type" => "read",
        "action_name" => "get_user",
        "resource_type" => "user",
        "record_id" => Ash.UUID.generate(),
        "actor_id" => Ash.UUID.generate(),
        "actor_email" => "someone@test.io",
        "ip_address" => "198.51.100.4",
        "occurred_at" => DateTime.utc_now() |> DateTime.to_iso8601()
      }

      assert :ok = perform_job(LogWriter, %{"entries" => [entry, entry]})
      assert length(Ash.read!(AccessLog, authorize?: false)) == 2
    end
  end

  describe "list_access_logs policy" do
    test "an app-admin can browse the access log" do
      admin = seed_user(:admin)
      seed_log(%{actor_id: admin.id, actor_email: to_string(admin.email)})

      assert {:ok, %{results: results}} =
               AccessLog
               |> Ash.Query.for_read(:list_access_logs, %{}, actor: admin)
               |> Ash.read(page: [limit: 50])

      assert results != []
    end

    test "a non-admin sees nothing (forbidden reads return empty)" do
      regular = seed_user(:user)
      seed_log(%{})

      assert {:ok, %{results: []}} =
               AccessLog
               |> Ash.Query.for_read(:list_access_logs, %{}, actor: regular)
               |> Ash.read(page: [limit: 50])
    end
  end

  describe "list_access_logs actor_email filter" do
    test "returns only rows whose actor email matches the substring" do
      admin = seed_user(:admin)

      alice = "alice-#{System.unique_integer([:positive])}@x.io"
      bob = "bob-#{System.unique_integer([:positive])}@x.io"
      alice_id = Ash.UUID.generate()

      seed_log(%{actor_id: alice_id, actor_email: alice})
      seed_log(%{actor_id: Ash.UUID.generate(), actor_email: bob})

      assert {:ok, %{results: results}} =
               AccessLog
               |> Ash.Query.for_read(:list_access_logs, %{actor_email: "alice"}, actor: admin)
               |> Ash.read(page: [limit: 50])

      emails = results |> Enum.map(&to_string(&1.actor_email)) |> Enum.uniq()
      assert emails != []
      assert Enum.all?(emails, &String.contains?(&1, "alice"))
      assert Enum.any?(results, &(&1.actor_id == alice_id))
    end
  end
end
