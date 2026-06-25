defmodule SampleProject.Embeddings.Chunker do
  @moduledoc """
  Splits a body of text into chunks small enough to embed without truncation.

  bge-small-en-v1.5 accepts up to 512 tokens; we keep chunks well under that by
  character count (`@max_chars`). Bodies are split on blank lines (paragraphs);
  any paragraph still over the limit falls back to greedy sentence packing, and a
  single oversize sentence is hard-sliced so nothing exceeds `@max_chars`.

  Comments are short and embedded as a single chunk by the caller — they do not go
  through this module.
  """

  # ~1500 chars leaves comfortable headroom below the 512-token limit (English
  # averages well under 4 chars/token, but punctuation/markdown inflate token
  # counts, so we stay conservative).
  @max_chars 1500

  @doc """
  Splits `text` into trimmed, non-empty chunks. Returns `[]` for nil/blank input.
  """
  @spec chunk_text(String.t() | nil) :: [String.t()]
  def chunk_text(nil), do: []

  def chunk_text(text) when is_binary(text) do
    text
    |> String.split(~r/\n\s*\n/, trim: true)
    |> Enum.flat_map(&split_long_paragraph/1)
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
  end

  defp split_long_paragraph(paragraph) when byte_size(paragraph) <= @max_chars,
    do: [paragraph]

  defp split_long_paragraph(paragraph) do
    paragraph
    |> String.split(~r/(?<=[.!?])\s+/, trim: true)
    |> Enum.flat_map(&hard_slice/1)
    |> pack_sentences()
  end

  # Greedily pack consecutive sentences into chunks of at most @max_chars.
  defp pack_sentences(sentences) do
    {chunks, current} =
      Enum.reduce(sentences, {[], ""}, fn sentence, {chunks, current} ->
        candidate = join(current, sentence)

        if byte_size(candidate) <= @max_chars do
          {chunks, candidate}
        else
          {[current | chunks], sentence}
        end
      end)

    [current | chunks]
    |> Enum.reverse()
    |> Enum.reject(&(&1 == ""))
  end

  defp join("", sentence), do: sentence
  defp join(current, sentence), do: current <> " " <> sentence

  # A single sentence longer than the limit is split into fixed-size slices so it
  # can never blow past @max_chars.
  defp hard_slice(sentence) when byte_size(sentence) <= @max_chars, do: [sentence]

  defp hard_slice(sentence) do
    sentence
    |> String.graphemes()
    |> Enum.chunk_every(@max_chars)
    |> Enum.map(&Enum.join/1)
  end
end
