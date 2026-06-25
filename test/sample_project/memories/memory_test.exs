defmodule SampleProject.Memories.MemoryTest do
  use SampleProject.DataCase, async: true

  alias SampleProject.Accounts.User
  alias SampleProject.Memories.Memory

  defp seed_user(role) do
    email = "#{role}-#{System.unique_integer([:positive])}@test.io"
    Ash.Seed.seed!(User, %{email: email, role: role})
  end

  defp create_memory(attrs, actor) do
    Memory
    |> Ash.Changeset.for_create(:create, attrs, actor: actor)
    |> Ash.create()
  end

  defp create_memory!(attrs, actor) do
    {:ok, memory} = create_memory(attrs, actor)
    memory
  end

  describe "create" do
    test "sets the acting user as owner and embeds the content" do
      user = seed_user(:user)

      memory = create_memory!(%{scope: :user, content: "Remember the deploy steps"}, user)

      assert memory.created_by_id == user.id
      assert memory.scope == :user
      assert is_struct(memory.embedding, Ash.Vector)
      assert is_binary(memory.content_hash)
    end

    test "requires repo_key for repository-scoped memories" do
      user = seed_user(:user)

      assert {:error, error} = create_memory(%{scope: :repository, content: "team note"}, user)
      assert Exception.message(error) =~ "repo_key"
    end

    test "requires an actor (created_by is mandatory)" do
      assert {:error, _} =
               Memory
               |> Ash.Changeset.for_create(:create, %{scope: :global, content: "x"})
               |> Ash.create()
    end
  end

  describe "ResolveRepo change" do
    test "normalizes a variety of repo_key shapes to lowercase owner/name" do
      user = seed_user(:user)

      for raw <- [
            "https://github.com/Org/Repo.git",
            "git@github.com:Org/Repo.git",
            "github.com/Org/Repo",
            "Org/Repo",
            "  Org/Repo/  "
          ] do
        memory = create_memory!(%{scope: :repository, repo_key: raw, content: "note"}, user)
        assert memory.repo_key == "org/repo", "expected #{raw} -> org/repo"
      end
    end

    test "clears repo_key for non-repository scopes" do
      user = seed_user(:user)
      memory = create_memory!(%{scope: :global, repo_key: "org/repo", content: "n"}, user)
      assert is_nil(memory.repo_key)
    end
  end

  describe "SetEmbedding change" do
    test "skips re-embedding when content is unchanged on update" do
      user = seed_user(:user)
      memory = create_memory!(%{scope: :user, content: "stable text"}, user)

      updated =
        memory
        |> Ash.Changeset.for_update(:update, %{content: "stable text"}, actor: user)
        |> Ash.update!()

      assert updated.content_hash == memory.content_hash
      assert updated.embedding == memory.embedding
    end

    test "re-embeds when content changes on update" do
      user = seed_user(:user)
      memory = create_memory!(%{scope: :user, content: "first"}, user)

      updated =
        memory
        |> Ash.Changeset.for_update(:update, %{content: "second, different"}, actor: user)
        |> Ash.update!()

      refute updated.content_hash == memory.content_hash
      refute updated.embedding == memory.embedding
    end
  end

  describe "read visibility policy" do
    test "user-scoped memories are visible only to their owner" do
      owner = seed_user(:user)
      other = seed_user(:user)
      memory = create_memory!(%{scope: :user, content: "private"}, owner)

      assert {:ok, _} = Ash.get(Memory, memory.id, actor: owner)
      assert {:error, _} = Ash.get(Memory, memory.id, actor: other)
    end

    test "global and repository memories are visible to any authenticated user" do
      author = seed_user(:user)
      reader = seed_user(:user)

      g = create_memory!(%{scope: :global, content: "shared global"}, author)

      r =
        create_memory!(
          %{scope: :repository, repo_key: "org/repo", content: "shared repo"},
          author
        )

      assert {:ok, _} = Ash.get(Memory, g.id, actor: reader)
      assert {:ok, _} = Ash.get(Memory, r.id, actor: reader)
    end

    test "an app-admin can read another user's private memory" do
      owner = seed_user(:user)
      admin = seed_user(:admin)
      memory = create_memory!(%{scope: :user, content: "private"}, owner)

      assert {:ok, _} = Ash.get(Memory, memory.id, actor: admin)
    end

    test "the get_memory action fetches a visible memory by id" do
      owner = seed_user(:user)
      memory = create_memory!(%{scope: :user, content: "mine"}, owner)

      assert {:ok, fetched} =
               Memory
               |> Ash.Query.for_read(:get_memory, %{id: memory.id}, actor: owner)
               |> Ash.read_one()

      assert fetched.id == memory.id
    end
  end

  describe "update/delete policy" do
    test "non-owner, non-admin cannot update or delete" do
      owner = seed_user(:user)
      other = seed_user(:user)
      memory = create_memory!(%{scope: :global, content: "team note"}, owner)

      assert {:error, _} =
               memory
               |> Ash.Changeset.for_update(:update, %{content: "hijack"}, actor: other)
               |> Ash.update()

      assert {:error, _} =
               memory
               |> Ash.Changeset.for_destroy(:delete, %{}, actor: other)
               |> Ash.destroy()
    end

    test "owner can update and delete" do
      owner = seed_user(:user)
      memory = create_memory!(%{scope: :user, content: "mine"}, owner)

      assert {:ok, _} =
               memory
               |> Ash.Changeset.for_update(:update, %{content: "edited"}, actor: owner)
               |> Ash.update()

      assert :ok =
               memory
               |> Ash.Changeset.for_destroy(:delete, %{}, actor: owner)
               |> Ash.destroy()
    end

    test "an app-admin can update/delete any memory" do
      owner = seed_user(:user)
      admin = seed_user(:admin)
      memory = create_memory!(%{scope: :global, content: "team"}, owner)

      assert {:ok, _} =
               memory
               |> Ash.Changeset.for_update(:update, %{content: "moderated"}, actor: admin)
               |> Ash.update()
    end
  end

  describe "list_memories keyword search" do
    test "filters by content phrase and by scope" do
      user = seed_user(:user)
      create_memory!(%{scope: :global, content: "uses DATABASE_URL for config"}, user)
      create_memory!(%{scope: :global, content: "unrelated note about colors"}, user)

      {:ok, results} =
        Memory
        |> Ash.Query.for_read(:list_memories, %{search: "DATABASE_URL"}, actor: user)
        |> Ash.read()

      contents = Enum.map(results, & &1.content)
      assert Enum.any?(contents, &(&1 =~ "DATABASE_URL"))
      refute Enum.any?(contents, &(&1 =~ "colors"))
    end
  end

  describe "search_memories semantic search" do
    test "returns visible memories and excludes other users' private ones" do
      owner = seed_user(:user)
      other = seed_user(:user)

      visible_global = create_memory!(%{scope: :global, content: "deploy runbook alpha"}, other)
      own_private = create_memory!(%{scope: :user, content: "deploy runbook beta"}, owner)
      hidden_private = create_memory!(%{scope: :user, content: "deploy runbook gamma"}, other)

      {:ok, results} =
        Memory
        |> Ash.Query.for_read(:search_memories, %{query: "deploy runbook"}, actor: owner)
        |> Ash.read()

      ids = Enum.map(results, & &1.id)
      assert visible_global.id in ids
      assert own_private.id in ids
      refute hidden_private.id in ids
    end

    test "rejects a blank query (a semantic search needs a query)" do
      user = seed_user(:user)
      create_memory!(%{scope: :global, content: "something"}, user)

      # Ash trims string arguments and treats the empty result as nil, so a
      # whitespace-only query trips the required-argument validation.
      assert {:error, _} =
               Memory
               |> Ash.Query.for_read(:search_memories, %{query: "   "}, actor: user)
               |> Ash.read()
    end
  end
end
