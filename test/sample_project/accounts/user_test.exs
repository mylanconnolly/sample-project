defmodule SampleProject.Accounts.UserTest do
  use SampleProject.DataCase, async: true

  import Swoosh.TestAssertions
  require Ash.Query

  alias SampleProject.Accounts
  alias SampleProject.Accounts.User

  defp seed_user(role) do
    email = "#{role}-#{System.unique_integer([:positive])}@test.io"
    Ash.Seed.seed!(User, %{email: email, role: role})
  end

  defp count_users do
    User |> Ash.Query.for_read(:read) |> Ash.count!(authorize?: false)
  end

  # Request a magic link for `email` and pull the token out of the sent email.
  defp capture_magic_token!(email) do
    :ok = Accounts.request_magic_link!(email)
    assert_received {:email, %Swoosh.Email{html_body: html}}
    [_, token] = Regex.run(~r{/magic_link/([^"\s<]+)}, html)
    URI.decode(token)
  end

  describe "admin authorization" do
    test "admins can list users" do
      admin = seed_user(:admin)
      _other = seed_user(:user)

      assert {:ok, users} =
               User |> Ash.Query.for_read(:list_users, %{}, actor: admin) |> Ash.read()

      assert length(users) >= 2
    end

    test "non-admins see no users (forbidden reads return empty, not an error)" do
      user = seed_user(:user)
      _other = seed_user(:user)

      # The app sets `no_filter_static_forbidden_reads?: false`, so an
      # unauthorized read yields an empty result rather than enumerating users.
      assert {:ok, []} =
               User |> Ash.Query.for_read(:list_users, %{}, actor: user) |> Ash.read()
    end

    test "non-admins are forbidden from inviting users" do
      user = seed_user(:user)

      assert {:error, %Ash.Error.Forbidden{}} =
               User
               |> Ash.Changeset.for_create(:invite, %{email: "nope@test.io"}, actor: user)
               |> Ash.create()
    end
  end

  describe "list_users search" do
    defp search_users(search, actor) do
      User
      |> Ash.Query.for_read(:list_users, %{search: search}, actor: actor)
      |> Ash.read!()
      |> Enum.map(&to_string(&1.email))
    end

    test "filters by case-insensitive email substring" do
      admin = seed_user(:admin)
      Ash.Seed.seed!(User, %{email: "needle@test.io", role: :user})

      emails = search_users("NEEDLE", admin)
      assert "needle@test.io" in emails
      refute to_string(admin.email) in emails
    end

    test "treats each phrase as an AND so 'mc iotrak' finds mconnolly@iotrak.com" do
      admin = seed_user(:admin)
      Ash.Seed.seed!(User, %{email: "mconnolly@iotrak.com", role: :user})
      Ash.Seed.seed!(User, %{email: "mconnolly@example.com", role: :user})

      emails = search_users("mc iotrak", admin)
      assert "mconnolly@iotrak.com" in emails
      refute "mconnolly@example.com" in emails
    end

    test "honours the requested sort (no default sort overrides it)" do
      admin = seed_user(:admin)
      Ash.Seed.seed!(User, %{email: "aaa-sort@test.io", role: :user})
      Ash.Seed.seed!(User, %{email: "zzz-sort@test.io", role: :user})

      # The RPC appends `sort_input` after the action's preparations, so a
      # default sort in the action would win. This asserts ascending email order
      # is actually applied.
      emails =
        User
        |> Ash.Query.for_read(:list_users, %{}, actor: admin)
        |> Ash.Query.sort_input("email")
        |> Ash.read!()
        |> Enum.map(&to_string(&1.email))

      assert Enum.find_index(emails, &(&1 == "aaa-sort@test.io")) <
               Enum.find_index(emails, &(&1 == "zzz-sort@test.io"))
    end
  end

  describe "invite" do
    test "admins create an account and a magic-link email is sent" do
      admin = seed_user(:admin)

      assert {:ok, invited} =
               User
               |> Ash.Changeset.for_create(:invite, %{email: "invited@test.io", role: :user},
                 actor: admin
               )
               |> Ash.create()

      assert to_string(invited.email) == "invited@test.io"
      assert invited.role == :user
      assert_email_sent()
    end
  end

  describe "update_user" do
    test "admins can change a user's role" do
      admin = seed_user(:admin)
      user = seed_user(:user)

      assert {:ok, updated} =
               user
               |> Ash.Changeset.for_update(:update_user, %{role: :admin}, actor: admin)
               |> Ash.update()

      assert updated.role == :admin
    end

    test "admins can update a user looked up by id (the RPC bulk-update path)" do
      admin = seed_user(:admin)
      user = seed_user(:user)

      # The RPC layer runs update_user as a bulk update that first reads the
      # record via the primary `:read` action, so that read must also be
      # authorized for admins. This guards against that regression.
      assert %Ash.BulkResult{status: :success, records: [updated]} =
               User
               |> Ash.Query.for_read(:read, %{}, actor: admin)
               |> Ash.Query.filter(id == ^user.id)
               |> Ash.bulk_update(:update_user, %{role: :admin},
                 actor: admin,
                 return_records?: true,
                 return_errors?: true,
                 strategy: [:atomic, :stream, :atomic_batches],
                 allow_stream_with: :full_read
               )

      assert updated.role == :admin
    end
  end

  describe "update_profile" do
    test "a user can set their own display name" do
      user = seed_user(:user)

      assert {:ok, updated} =
               user
               |> Ash.Changeset.for_update(:update_profile, %{name: "Ada Lovelace"}, actor: user)
               |> Ash.update()

      assert updated.name == "Ada Lovelace"
    end

    test "a user can update their own profile via the RPC bulk-update path" do
      # update_profile runs (like update_user) as a bulk update that first reads
      # the record via the primary `:read`, so a non-admin must be able to read
      # *themselves* for the lookup to succeed.
      user = seed_user(:user)

      assert %Ash.BulkResult{status: :success, records: [updated]} =
               User
               |> Ash.Query.for_read(:read, %{}, actor: user)
               |> Ash.Query.filter(id == ^user.id)
               |> Ash.bulk_update(:update_profile, %{name: "Self Service"},
                 actor: user,
                 return_records?: true,
                 return_errors?: true,
                 strategy: [:atomic, :stream, :atomic_batches],
                 allow_stream_with: :full_read
               )

      assert updated.name == "Self Service"
    end

    test "a user cannot update another user's profile" do
      actor = seed_user(:user)
      target = seed_user(:user)

      assert {:error, %Ash.Error.Forbidden{}} =
               target
               |> Ash.Changeset.for_update(:update_profile, %{name: "Hijacked"}, actor: actor)
               |> Ash.update()
    end
  end

  describe "active flag" do
    test "admins can deactivate and reactivate a user" do
      admin = seed_user(:admin)
      user = seed_user(:user)
      assert user.active

      assert {:ok, deactivated} =
               user |> Ash.Changeset.for_update(:deactivate, %{}, actor: admin) |> Ash.update()

      refute deactivated.active

      assert {:ok, reactivated} =
               deactivated
               |> Ash.Changeset.for_update(:activate, %{}, actor: admin)
               |> Ash.update()

      assert reactivated.active
    end

    test "non-admins cannot deactivate users" do
      actor = seed_user(:user)
      target = seed_user(:user)

      assert {:error, %Ash.Error.Forbidden{}} =
               target |> Ash.Changeset.for_update(:deactivate, %{}, actor: actor) |> Ash.update()
    end

    test "deactivated users cannot sign in, but active users can" do
      email = "login-#{System.unique_integer([:positive])}@test.io"
      user = Ash.Seed.seed!(User, %{email: email, role: :user, active: true})

      # Active: a fresh magic-link token signs the user in.
      assert {:ok, signed_in} =
               User
               |> Ash.Query.for_read(:sign_in_with_magic_link, %{
                 token: capture_magic_token!(email)
               })
               |> Ash.read_one()

      assert signed_in.id == user.id

      # Deactivate, then a fresh, valid token must NOT sign them in.
      user |> Ash.Changeset.for_update(:deactivate, %{}, authorize?: false) |> Ash.update!()

      assert {:ok, nil} =
               User
               |> Ash.Query.for_read(:sign_in_with_magic_link, %{
                 token: capture_magic_token!(email)
               })
               |> Ash.read_one()
    end
  end

  describe "registration disabled" do
    test "requesting a magic link for an unknown email creates no user" do
      before_count = count_users()

      assert :ok = Accounts.request_magic_link!("stranger@test.io")

      assert count_users() == before_count
      refute_email_sent()
    end

    test "requesting a magic link for an existing user sends an email" do
      user = seed_user(:user)

      assert :ok = Accounts.request_magic_link!(to_string(user.email))

      assert_email_sent()
    end
  end
end
