defmodule SampleProject.Memories.Memory.FindSimilar do
  @moduledoc """
  Cosine-similarity ranking over the `memories.embedding` pgvector column.

  Each memory carries exactly one embedding (notes are short), so the distance is a
  direct `embedding <=> query`. `candidate_distances/2` returns the nearest ids + distances; the
  caller re-loads them through the Ash read so the scope policy and any
  scope/repo_key narrowing apply (rows the actor may not see are dropped there).
  """

  import Ecto.Query

  alias SampleProject.Repo

  @doc """
  Returns the `limit` nearest memories to `query_embedding` as
  `[%{id: id, distance: float}]`, ordered nearest-first. Skips rows whose embedding
  failed to generate. Not visibility-filtered — callers load the ids through Ash.
  """
  def candidate_distances(query_embedding, limit) do
    vector = to_ash_vector(query_embedding)

    from(m in "memories",
      where: not is_nil(m.embedding),
      select: %{
        id: type(m.id, Ecto.UUID),
        distance: selected_as(fragment("? <=> ?", m.embedding, ^vector), :distance)
      },
      order_by: [asc: selected_as(:distance)],
      limit: ^limit
    )
    |> Repo.all()
  end

  # The query vector is passed as an Ash.Vector struct so the registered Postgrex
  # Vector extension encodes it as a real `vector` value. (A text literal cast with
  # `::vector` is mis-encoded byte-by-byte by that same extension.)
  defp to_ash_vector(%Ash.Vector{} = vector), do: vector

  defp to_ash_vector(list) when is_list(list) do
    {:ok, vector} = Ash.Vector.new(list)
    vector
  end
end
