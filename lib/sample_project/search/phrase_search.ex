defmodule SampleProject.Search.PhraseSearch do
  @moduledoc """
  Reusable read preparation that applies a phrase-aware search filter.

  Configure with the action argument that carries the query string and the list of
  fields to match against:

      prepare {SampleProject.Search.PhraseSearch,
               argument: :search, fields: [:reference, :subject, :body]}

  Pass `require_match?: true` for a search-only action that should return nothing
  for a blank query (rather than every accessible row):

      prepare {SampleProject.Search.PhraseSearch,
               argument: :search, fields: [:reference, :subject, :body], require_match?: true}

  Delegates the actual filtering to `SampleProject.Search.phrase_filter/4`.
  """
  use Ash.Resource.Preparation

  @impl true
  def init(opts) do
    cond do
      not is_atom(opts[:argument]) ->
        {:error, "#{inspect(__MODULE__)}: `argument` must be an atom"}

      not (is_list(opts[:fields]) and opts[:fields] != [] and Enum.all?(opts[:fields], &is_atom/1)) ->
        {:error, "#{inspect(__MODULE__)}: `fields` must be a non-empty list of atoms"}

      true ->
        {:ok, opts}
    end
  end

  @impl true
  def prepare(query, opts, _context) do
    search = Ash.Query.get_argument(query, opts[:argument])
    on_empty = if opts[:require_match?], do: :none, else: :all
    SampleProject.Search.phrase_filter(query, search, opts[:fields], on_empty: on_empty)
  end
end
