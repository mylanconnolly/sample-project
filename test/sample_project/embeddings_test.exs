defmodule SampleProject.EmbeddingsTest do
  use ExUnit.Case, async: true

  alias SampleProject.Embeddings
  alias SampleProject.Embeddings.Chunker

  describe "adapter wiring" do
    test "test env uses the model-free stub adapter" do
      assert Application.fetch_env!(:sample_project, :embeddings)[:adapter] ==
               SampleProject.Embeddings.StubAdapter
    end
  end

  describe "embed/1 and embed_many/1" do
    test "embed/1 returns a single vector of the right dimensionality" do
      assert {:ok, vector} = Embeddings.embed("a broken login button")
      assert length(vector) == Embeddings.dims()
      assert Enum.all?(vector, &is_float/1)
    end

    test "embed_many/1 preserves order and count" do
      texts = ["first", "second", "third"]
      assert {:ok, vectors} = Embeddings.embed_many(texts)
      assert length(vectors) == 3
      # Distinct texts produce distinct vectors.
      assert Enum.uniq(vectors) == vectors
    end

    test "embed_many/1 on an empty list short-circuits" do
      assert {:ok, []} = Embeddings.embed_many([])
    end

    test "stub is deterministic: same text → same vector" do
      assert {:ok, [v1]} = Embeddings.embed_many(["identical"])
      assert {:ok, [v2]} = Embeddings.embed_many(["identical"])
      assert v1 == v2
    end

    test "stub vectors are L2-normalized" do
      assert {:ok, vector} = Embeddings.embed("normalize me")
      magnitude = :math.sqrt(Enum.reduce(vector, 0.0, fn x, acc -> acc + x * x end))
      assert_in_delta magnitude, 1.0, 1.0e-6
    end
  end

  describe "query_instruction/1" do
    test "prefixes the bge retrieval instruction" do
      assert Embeddings.query_instruction("login fails") =~ "login fails"
      refute Embeddings.query_instruction("login fails") == "login fails"
    end
  end

  describe "chunk_text/1" do
    test "nil and blank produce no chunks" do
      assert Chunker.chunk_text(nil) == []
      assert Chunker.chunk_text("   \n\n  ") == []
    end

    test "splits on blank lines into trimmed paragraphs" do
      text = "First paragraph.\n\nSecond paragraph.\n\n\nThird."
      assert Chunker.chunk_text(text) == ["First paragraph.", "Second paragraph.", "Third."]
    end

    test "a short single paragraph is one chunk" do
      assert Chunker.chunk_text("just one line") == ["just one line"]
    end

    test "a paragraph longer than the limit is split, and every chunk stays under it" do
      sentence = String.duplicate("This is a sentence with several words. ", 80)
      chunks = Chunker.chunk_text(sentence)

      assert length(chunks) > 1
      assert Enum.all?(chunks, &(byte_size(&1) <= 1500))
    end

    test "an oversize single token/sentence is hard-sliced" do
      blob = String.duplicate("x", 4000)
      chunks = Chunker.chunk_text(blob)

      assert length(chunks) >= 3
      assert Enum.all?(chunks, &(byte_size(&1) <= 1500))
    end
  end
end
