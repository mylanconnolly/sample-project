defmodule SampleProject.Embeddings.StubAdapter do
  @moduledoc """
  Deterministic, model-free embedding adapter for tests and (by default) local dev.

  Produces a normalized pseudo-vector seeded by the text's hash: the same text
  always yields the same vector (so content-hash skip logic and similarity ranking
  are testable), while different texts yield different vectors. It loads no model
  and no EXLA, keeping the test suite and CI fast.

  This adapter has no `child_spec/1`; it is never added to the supervision tree.
  """

  @behaviour SampleProject.Embeddings

  @dims SampleProject.Embeddings.dims()

  @impl true
  def embed_many(texts) when is_list(texts) do
    {:ok, Enum.map(texts, &fake_vector/1)}
  end

  defp fake_vector(text) do
    seed = :erlang.phash2(text)

    raw =
      Enum.map(0..(@dims - 1), fn i ->
        :math.sin(seed * 1.0e-6 + i * 0.31)
      end)

    norm = :math.sqrt(Enum.reduce(raw, 0.0, fn x, acc -> acc + x * x end))
    Enum.map(raw, &(&1 / (norm + 1.0e-9)))
  end
end
