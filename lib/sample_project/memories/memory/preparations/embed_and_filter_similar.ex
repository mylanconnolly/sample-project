defmodule SampleProject.Memories.Memory.Preparations.EmbedAndFilterSimilar do
  @moduledoc """
  Preparation backing the `:search_memories` read.

  Embeds the typed query server-side (with the bge retrieval instruction), ranks
  memories by vector similarity (see `SampleProject.Memories.Memory.FindSimilar`), then
  constrains the read to the nearest candidate ids and reorders the loaded rows by
  distance. The action's own filter (scope/repo_key) and the resource's read policy
  flow through the normal Ash read, so visibility is enforced there — other users'
  private `:user` memories are ranked but never returned.

  Degrades quietly: a blank query or an embedding failure yields no results (a
  recall must never error because the similarity backend is unavailable).
  """
  use Ash.Resource.Preparation

  require Ash.Query

  alias SampleProject.Embeddings
  alias SampleProject.Memories.Memory.FindSimilar

  @impl true
  def prepare(query, _opts, _context) do
    text = query |> Ash.Query.get_argument(:query) |> to_string() |> String.trim()
    limit = Ash.Query.get_argument(query, :limit) || 10

    ranked =
      with true <- text != "",
           {:ok, vector} <- Embeddings.embed(Embeddings.query_instruction(text)) do
        # Over-fetch so the scope policy and scope/repo_key narrowing still leave
        # enough candidates to fill the limit.
        FindSimilar.candidate_distances(vector, max(limit * 5, 50))
      else
        _ -> []
      end

    ids = Enum.map(ranked, & &1.id)
    order = ids |> Enum.with_index() |> Map.new()

    query
    # `id in []` returns nothing when there's no usable query / no matches.
    |> Ash.Query.filter(id in ^ids)
    |> Ash.Query.after_action(fn _query, memories ->
      sorted =
        memories
        |> Enum.sort_by(&Map.fetch!(order, &1.id))
        |> Enum.take(limit)

      {:ok, sorted}
    end)
  end
end
