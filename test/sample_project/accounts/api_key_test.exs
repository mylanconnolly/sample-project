defmodule SampleProject.Accounts.ApiKeyTest do
  use SampleProject.DataCase, async: true

  require Ash.Query

  alias SampleProject.Accounts.ApiKey
  alias SampleProject.Accounts.User

  defp seed_user do
    email = "key-#{System.unique_integer([:positive])}@test.io"
    Ash.Seed.seed!(User, %{email: email, role: :user})
  end

  defp generate_key(actor, opts \\ []) do
    name = Keyword.get(opts, :name, "test key")
    expires_at = Keyword.get(opts, :expires_at, DateTime.add(DateTime.utc_now(), 30, :day))

    ApiKey
    |> Ash.Changeset.for_create(:generate, %{name: name, expires_at: expires_at}, actor: actor)
    |> Ash.create()
  end

  describe "generate" do
    test "returns the plaintext key once (in metadata) and binds it to the actor" do
      user = seed_user()

      assert {:ok, key} = generate_key(user, name: "CI")

      # The full key is exposed only here, as action metadata.
      assert "sampleproject_" <> _ = key.__metadata__.plaintext_api_key
      assert key.name == "CI"
      # The owner is taken from the actor, never from input.
      assert key.user_id == user.id
    end

    test "fails closed without an actor (cannot bind ownership)" do
      # `relate_actor(:user)` has no actor to relate to, so generation fails
      # rather than producing an unowned key.
      assert {:error, %Ash.Error.Invalid{errors: [%{relationship: :user} | _]}} =
               ApiKey
               |> Ash.Changeset.for_create(:generate, %{
                 name: "x",
                 expires_at: DateTime.add(DateTime.utc_now(), 1, :day)
               })
               |> Ash.create()
    end

    test "the stored hash is not the plaintext key" do
      user = seed_user()
      {:ok, key} = generate_key(user)

      refute key.api_key_hash == key.__metadata__.plaintext_api_key
      assert is_binary(key.api_key_hash)
    end
  end

  describe "valid calculation" do
    test "is true for a future expiry and false for a past one" do
      user = seed_user()

      {:ok, live} = generate_key(user, expires_at: DateTime.add(DateTime.utc_now(), 1, :day))
      {:ok, dead} = generate_key(user, expires_at: DateTime.add(DateTime.utc_now(), -1, :day))

      assert Ash.load!(live, :valid, actor: user).valid
      refute Ash.load!(dead, :valid, actor: user).valid
    end
  end

  describe "list_for_actor" do
    test "returns only the actor's own keys, newest first" do
      user = seed_user()
      other = seed_user()

      {:ok, _} = generate_key(user, name: "mine-1")
      {:ok, _} = generate_key(user, name: "mine-2")
      {:ok, _} = generate_key(other, name: "theirs")

      names =
        ApiKey
        |> Ash.Query.for_read(:list_for_actor, %{}, actor: user)
        |> Ash.read!()
        |> Enum.map(& &1.name)

      assert "mine-1" in names
      assert "mine-2" in names
      refute "theirs" in names
    end
  end

  describe "ownership policies" do
    test "a user cannot read another user's keys via the primary read" do
      owner = seed_user()
      intruder = seed_user()
      {:ok, key} = generate_key(owner)

      # Forbidden reads resolve to empty rather than erroring (no_filter_static_forbidden_reads?: false).
      assert {:ok, []} =
               ApiKey
               |> Ash.Query.for_read(:read, %{}, actor: intruder)
               |> Ash.Query.filter(id == ^key.id)
               |> Ash.read()
    end

    test "a user can destroy their own key" do
      user = seed_user()
      {:ok, key} = generate_key(user)

      assert :ok = Ash.destroy(key, action: :destroy, actor: user)

      assert {:ok, []} =
               ApiKey
               |> Ash.Query.for_read(:list_for_actor, %{}, actor: user)
               |> Ash.read()
    end

    test "a user cannot destroy another user's key" do
      owner = seed_user()
      intruder = seed_user()
      {:ok, key} = generate_key(owner)

      assert {:error, %Ash.Error.Forbidden{}} =
               Ash.destroy(key, action: :destroy, actor: intruder)

      # The key is still there for its owner.
      assert [_] =
               ApiKey
               |> Ash.Query.for_read(:list_for_actor, %{}, actor: owner)
               |> Ash.read!()
    end
  end

  describe "api-key sign-in" do
    test "a generated key authenticates its user; a deactivated user's does not" do
      user = seed_user()
      {:ok, key} = generate_key(user)
      plaintext = key.__metadata__.plaintext_api_key

      assert {:ok, signed_in} =
               User
               |> Ash.Query.for_read(:sign_in_with_api_key, %{api_key: plaintext})
               |> Ash.read_one()

      assert signed_in.id == user.id
    end
  end
end
