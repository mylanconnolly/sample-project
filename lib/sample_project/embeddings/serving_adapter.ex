defmodule SampleProject.Embeddings.ServingAdapter do
  @moduledoc """
  Real embedding adapter: an in-BEAM `Nx.Serving` running `BAAI/bge-small-en-v1.5`
  via Bumblebee with the EXLA compiler.

  Added to the supervision tree only in dev/prod (see `SampleProject.Application`); tests
  use `SampleProject.Embeddings.StubAdapter` instead so they never load EXLA.

  ## Pooling

  bge-small-en-v1.5 is trained with **CLS pooling** (the first token of the last
  hidden state) followed by L2 normalization — see its sentence-transformers
  `1_Pooling/config.json` (`pooling_mode_cls_token: true`). We configure the
  serving to match; L2-normalized vectors make cosine distance (the pgvector
  `<=>` operator and our `vector_cosine_ops` index) equivalent to inner product.
  """

  @behaviour SampleProject.Embeddings

  @serving_name SampleProject.Embeddings.Serving

  # Static shapes EXLA compiles against. Chunks are kept under the 512-token limit
  # by SampleProject.Embeddings.Chunker.
  @batch_size 16
  @sequence_length 512

  @impl true
  def embed_many(texts) when is_list(texts) do
    results = Nx.Serving.batched_run(@serving_name, texts)
    {:ok, Enum.map(results, fn %{embedding: tensor} -> Nx.to_flat_list(tensor) end)}
  rescue
    error -> {:error, error}
  end

  @doc """
  Child spec for the supervision tree. Loads the model + tokenizer and builds the
  batched `Nx.Serving`. Model weights are downloaded by Bumblebee on first use and
  cached (bake them into the image + set `BUMBLEBEE_OFFLINE=true` in prod).
  """
  def child_spec(_opts) do
    repo = Application.fetch_env!(:sample_project, :embeddings)[:repo]

    {:ok, model_info} = Bumblebee.load_model({:hf, repo})
    {:ok, tokenizer} = Bumblebee.load_tokenizer({:hf, repo})

    serving =
      Bumblebee.Text.text_embedding(model_info, tokenizer,
        output_attribute: :hidden_state,
        output_pool: :cls_token_pooling,
        embedding_processor: :l2_norm,
        compile: [batch_size: @batch_size, sequence_length: @sequence_length],
        defn_options: [compiler: EXLA]
      )

    Nx.Serving.child_spec(
      serving: serving,
      name: @serving_name,
      batch_size: @batch_size,
      batch_timeout: 50
    )
  end
end
