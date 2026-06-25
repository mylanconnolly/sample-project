defmodule SampleProject.Search do
  @moduledoc """
  Phrase-aware Ash filtering built on `PhraseUtils`.

  `phrase_filter/3` splits a raw query string into phrases (honoring double-quoted
  phrases and a `-` exclusion prefix), then narrows the query so that:

    * each phrase must match in *at least one* of the given fields (OR across fields), and
    * *all* phrases must match (AND across phrases).

  A `-phrase` token is an exclusion: rows matching it in *any* field are removed.
  Matching is case-insensitive substring matching via `ILIKE '%phrase%'` (so it
  ignores case regardless of the column type, unlike `contains/2` which only
  folds case on `:ci_string`/citext columns).

  Fields may be plain attributes or expression calculations, since the filter is
  built with Ash expressions.
  """
  require Ash.Query
  import Ash.Expr

  @doc """
  Applies the phrase filter for `search` over `fields` to `query`.

  ## Options

    * `:on_empty` - what to do when the query yields no usable phrases (blank input,
      non-binary search, or whitespace/quotes only). `:all` (default) leaves `query`
      untouched; `:none` narrows it to match nothing (`filter(false)`), which suits a
      global search that should return results only for an actual query.
  """
  @spec phrase_filter(Ash.Query.t(), term(), [atom()], keyword()) :: Ash.Query.t()
  def phrase_filter(query, search, fields, opts \\ [])

  def phrase_filter(query, search, fields, opts) when is_binary(search) and fields != [] do
    phrases =
      search
      |> PhraseUtils.split()
      |> Enum.map(&classify/1)
      |> Enum.reject(fn {_sign, phrase} -> phrase == "" end)

    case phrases do
      [] ->
        on_empty(query, opts)

      phrases ->
        Enum.reduce(phrases, query, fn {sign, phrase}, q ->
          Ash.Query.filter(q, ^phrase_clause(sign, phrase, fields))
        end)
    end
  end

  def phrase_filter(query, _search, _fields, opts), do: on_empty(query, opts)

  defp on_empty(query, opts) do
    case Keyword.get(opts, :on_empty, :all) do
      :none -> Ash.Query.filter(query, false)
      :all -> query
    end
  end

  defp classify("-" <> rest), do: {:exclude, rest}
  defp classify(token), do: {:include, token}

  # include: the phrase must appear in at least one field (OR across fields).
  defp phrase_clause(:include, phrase, fields) do
    pattern = like_pattern(phrase)

    Enum.reduce(fields, nil, fn field, acc ->
      clause = expr(ilike(^ref(field), ^pattern))
      if acc, do: expr(^acc or ^clause), else: clause
    end)
  end

  # exclude: the phrase must appear in no field (AND of per-field negations). The
  # `is_nil/1` guard keeps rows with a nil field (e.g. an empty body) from being
  # wrongly dropped, since `not ilike(nil, _)` is NULL rather than true.
  defp phrase_clause(:exclude, phrase, fields) do
    pattern = like_pattern(phrase)

    Enum.reduce(fields, nil, fn field, acc ->
      clause = expr(is_nil(^ref(field)) or not ilike(^ref(field), ^pattern))
      if acc, do: expr(^acc and ^clause), else: clause
    end)
  end

  # Wrap the phrase as a substring pattern, escaping the ILIKE wildcards so a
  # literal `%`, `_`, or `\` in the user's query matches itself.
  defp like_pattern(phrase) do
    escaped =
      phrase
      |> String.replace("\\", "\\\\")
      |> String.replace("%", "\\%")
      |> String.replace("_", "\\_")

    "%" <> escaped <> "%"
  end
end
