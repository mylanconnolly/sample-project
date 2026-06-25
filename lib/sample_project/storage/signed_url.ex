defmodule SampleProject.Storage.SignedUrl do
  @moduledoc """
  Generates [V4 signed URLs](https://cloud.google.com/storage/docs/access-control/signed-urls)
  for private Google Cloud Storage objects.

  A signed URL grants time-limited `GET` access to a single object without any
  further authentication, so a client (e.g. an MCP host fetching an attachment)
  can download the bytes directly from GCS. Signing is pure local crypto using
  the service account's RSA private key — there is no GCS round-trip.

  This module is intentionally credential-agnostic: callers pass the bucket,
  object key, and the service account's `client_email`/`private_key`. The
  higher-level `SampleProject.Storage.signed_get_url/2` reads those from the configured
  `SampleProject.Settings.GcsConfig` and delegates here.
  """

  @host "storage.googleapis.com"
  @algorithm "GOOG4-RSA-SHA256"
  @default_expires_in 900

  @doc """
  Builds a signed `GET` URL for `key` in `bucket`.

  Options:

    * `:expires_in` — lifetime in seconds (default `#{@default_expires_in}`,
      GCS allows up to 604800 / 7 days).
    * `:now` — the `DateTime` to sign against (defaults to `DateTime.utc_now/0`);
      injectable for deterministic tests.

  Returns `%{url: String.t(), expires_at: DateTime.t()}`.
  """
  @spec generate(String.t(), String.t(), String.t(), String.t(), keyword()) ::
          %{url: String.t(), expires_at: DateTime.t()}
  def generate(bucket, key, client_email, private_key_pem, opts \\ []) do
    expires_in = Keyword.get(opts, :expires_in, @default_expires_in)
    now = opts |> Keyword.get(:now, DateTime.utc_now()) |> DateTime.truncate(:second)

    timestamp = Calendar.strftime(now, "%Y%m%dT%H%M%SZ")
    date = Calendar.strftime(now, "%Y%m%d")
    scope = "#{date}/auto/storage/goog4_request"

    # The path keeps "/" literal; the key may contain slashes.
    canonical_uri = "/" <> encode(bucket, false) <> "/" <> encode(key, false)

    canonical_query =
      [
        {"X-Goog-Algorithm", @algorithm},
        {"X-Goog-Credential", client_email <> "/" <> scope},
        {"X-Goog-Date", timestamp},
        {"X-Goog-Expires", Integer.to_string(expires_in)},
        {"X-Goog-SignedHeaders", "host"}
      ]
      |> Enum.map(fn {k, v} -> {encode(k, true), encode(v, true)} end)
      |> Enum.sort()
      |> Enum.map_join("&", fn {k, v} -> "#{k}=#{v}" end)

    canonical_request =
      Enum.join(
        ["GET", canonical_uri, canonical_query, "host:#{@host}\n", "host", "UNSIGNED-PAYLOAD"],
        "\n"
      )

    hashed_request = :sha256 |> :crypto.hash(canonical_request) |> Base.encode16(case: :lower)
    string_to_sign = Enum.join([@algorithm, timestamp, scope, hashed_request], "\n")
    signature = sign(string_to_sign, private_key_pem)

    %{
      url: "https://#{@host}#{canonical_uri}?#{canonical_query}&X-Goog-Signature=#{signature}",
      expires_at: DateTime.add(now, expires_in, :second)
    }
  end

  # RSA PKCS#1 v1.5 over SHA-256, hex-encoded (the form GCS expects).
  defp sign(string_to_sign, private_key_pem) do
    [pem_entry] = :public_key.pem_decode(private_key_pem)

    string_to_sign
    |> :public_key.sign(:sha256, :public_key.pem_entry_decode(pem_entry))
    |> Base.encode16(case: :lower)
  end

  # RFC 3986 percent-encoding. Unreserved chars (and, in paths, "/") pass through;
  # everything else is encoded with uppercase hex, as the V4 canonical form requires.
  defp encode(string, encode_slash?) do
    URI.encode(string, fn
      ?/ -> not encode_slash?
      char -> URI.char_unreserved?(char)
    end)
  end
end
