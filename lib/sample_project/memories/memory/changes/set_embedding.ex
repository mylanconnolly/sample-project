defmodule SampleProject.Memories.Memory.Changes.SetEmbedding do
  @moduledoc """
  Embeds a memory's `content` inline and stores the vector on the same row.

  A `content_hash` lets an `:update` that doesn't change the text skip re-embedding.
  Documents are embedded raw — only *search queries* get the bge retrieval
  instruction (see `SampleProject.Embeddings`).

  Fail-open: if the embedding model errors, the memory is still saved with a nil
  `embedding` (it stays findable via the keyword `:list_memories` search, and a
  backfill can re-embed it later) rather than blocking the write on an unavailable
  serving.
  """
  use Ash.Resource.Change

  alias SampleProject.Embeddings

  @impl true
  def change(changeset, _opts, _context) do
    content = Ash.Changeset.get_attribute(changeset, :content)

    cond do
      is_nil(content) ->
        changeset

      # No-op update: text unchanged and we already have an embedding.
      unchanged?(changeset, content) ->
        changeset

      true ->
        changeset
        |> Ash.Changeset.change_attribute(:content_hash, hash(content))
        |> embed_content(content)
    end
  end

  defp unchanged?(changeset, content) do
    hash(content) == Ash.Changeset.get_data(changeset, :content_hash) and
      not is_nil(Ash.Changeset.get_data(changeset, :embedding))
  end

  defp embed_content(changeset, content) do
    case Embeddings.embed(content) do
      {:ok, vector} ->
        Ash.Changeset.change_attribute(changeset, :embedding, vector)

      {:error, _reason} ->
        # Fail-open: save without an embedding rather than failing the write.
        Ash.Changeset.change_attribute(changeset, :embedding, nil)
    end
  end

  defp hash(content), do: :crypto.hash(:sha256, content) |> Base.encode16(case: :lower)
end
