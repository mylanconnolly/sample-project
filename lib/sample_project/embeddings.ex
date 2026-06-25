defmodule SampleProject.Embeddings do
  @moduledoc """
  Text → embedding vectors for semantic similarity search.

  Embeddings are produced locally, inside the BEAM, by the `BAAI/bge-small-en-v1.5`
  model (384-dim). The concrete backend is chosen at runtime via the
  `config :sample_project, :embeddings, adapter: …` setting so that dev/prod run the real
  `Nx.Serving` while tests/CI use a deterministic stub and never load EXLA.

  ## Query vs. document text

  bge models expect *retrieval queries* to be prefixed with an instruction, while
  the *documents* being indexed are embedded raw. Mixing these up collapses recall,
  so the rule is:

    * indexing a stored document → embed the raw text
    * embedding a search query    → wrap it in `query_instruction/1` first

  See `query_instruction/1`.
  """

  @dims 384

  # bge-small-en-v1.5's recommended retrieval-query instruction. Only queries get
  # this prefix; stored documents never do (see the moduledoc).
  @query_instruction "Represent this sentence for searching relevant passages: "

  @doc """
  Embeds a batch of texts, returning `{:ok, vectors}` where each vector is a list
  of #{@dims} floats, in the same order as the input. Implemented by the adapter.
  """
  @callback embed_many([String.t()]) :: {:ok, [[float()]]} | {:error, term()}

  @doc "The embedding dimensionality (#{@dims})."
  @spec dims() :: pos_integer()
  def dims, do: @dims

  @doc "Embeds a single text → `{:ok, vector}` (a list of #{@dims} floats)."
  @spec embed(String.t()) :: {:ok, [float()]} | {:error, term()}
  def embed(text) when is_binary(text) do
    case embed_many([text]) do
      {:ok, [vector]} -> {:ok, vector}
      {:ok, _other} -> {:error, :unexpected_result}
      {:error, _} = error -> error
    end
  end

  @doc """
  Embeds many texts → `{:ok, vectors}`, preserving order. Funnels through the
  adapter so a batch becomes a single serving call.
  """
  @spec embed_many([String.t()]) :: {:ok, [[float()]]} | {:error, term()}
  def embed_many([]), do: {:ok, []}
  def embed_many(texts) when is_list(texts), do: adapter().embed_many(texts)

  @doc """
  Wraps a search query in the bge retrieval instruction. Apply this to query text
  (form input, an AI search phrase) before embedding — never to stored documents.
  """
  @spec query_instruction(String.t()) :: String.t()
  def query_instruction(query) when is_binary(query), do: @query_instruction <> query

  @doc """
  Splits a body of text into embeddable chunks (paragraphs, with sentence/length
  fallbacks) so long bodies are never truncated. See `SampleProject.Embeddings.Chunker`.
  """
  defdelegate chunk_text(text), to: SampleProject.Embeddings.Chunker

  defp adapter, do: Application.fetch_env!(:sample_project, :embeddings)[:adapter]
end
