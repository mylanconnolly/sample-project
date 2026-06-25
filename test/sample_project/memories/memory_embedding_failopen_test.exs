defmodule SampleProject.Memories.MemoryEmbeddingFailOpenTest do
  @moduledoc """
  The embedding step is fail-open: if the model serving is unavailable, a memory
  must still save (with a nil embedding) rather than blocking the write. This swaps
  the global embedding adapter, so it runs `async: false`.
  """
  use SampleProject.DataCase, async: false

  alias SampleProject.Accounts.User
  alias SampleProject.Memories.Memory

  defmodule ErrorAdapter do
    @behaviour SampleProject.Embeddings
    @impl true
    def embed_many(_texts), do: {:error, :unavailable}
  end

  setup do
    original = Application.fetch_env!(:sample_project, :embeddings)
    Application.put_env(:sample_project, :embeddings, adapter: ErrorAdapter)
    on_exit(fn -> Application.put_env(:sample_project, :embeddings, original) end)
    :ok
  end

  test "saves the memory with a nil embedding when embedding fails" do
    user =
      Ash.Seed.seed!(User, %{email: "fo-#{System.unique_integer([:positive])}@t.io", role: :user})

    memory =
      Memory
      |> Ash.Changeset.for_create(:create, %{scope: :user, content: "note"}, actor: user)
      |> Ash.create!()

    assert is_nil(memory.embedding)
    # The note still saved and is fetchable.
    assert {:ok, _} = Ash.get(Memory, memory.id, actor: user)
  end
end
