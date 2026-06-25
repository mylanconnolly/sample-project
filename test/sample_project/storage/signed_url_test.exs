defmodule SampleProject.Storage.SignedUrlTest do
  use ExUnit.Case, async: true

  alias SampleProject.Storage.SignedUrl

  @email "svc@my-project.iam.gserviceaccount.com"
  @now ~U[2026-01-02 03:04:05Z]

  setup_all do
    # A throwaway RSA keypair so signing actually runs (the real key never leaves
    # the configured GcsConfig). PKCS#1 PEM; the signer also handles PKCS#8.
    rsa = :public_key.generate_key({:rsa, 2048, 65537})
    pem = :public_key.pem_encode([:public_key.pem_entry_encode(:RSAPrivateKey, rsa)])
    %{pem: pem}
  end

  test "builds a well-formed V4 GET URL", %{pem: pem} do
    %{url: url, expires_at: expires_at} =
      SignedUrl.generate("my-bucket", "attachments/t/file.txt", @email, pem,
        now: @now,
        expires_in: 900
      )

    assert String.starts_with?(
             url,
             "https://storage.googleapis.com/my-bucket/attachments/t/file.txt?"
           )

    assert url =~ "X-Goog-Algorithm=GOOG4-RSA-SHA256"
    assert url =~ "X-Goog-Date=20260102T030405Z"
    assert url =~ "X-Goog-Expires=900"
    assert url =~ "X-Goog-SignedHeaders=host"
    # The credential's "/" separators are percent-encoded in the query string.
    assert url =~ "X-Goog-Credential="
    assert url =~ "%2F20260102%2Fauto%2Fstorage%2Fgoog4_request"
    # Signature is appended last, lowercase hex.
    assert [_, sig] = String.split(url, "X-Goog-Signature=")
    assert sig =~ ~r/\A[0-9a-f]+\z/

    assert expires_at == DateTime.add(@now, 900, :second)
  end

  test "defaults to a 15 minute lifetime", %{pem: pem} do
    %{url: url, expires_at: expires_at} =
      SignedUrl.generate("b", "k", @email, pem, now: @now)

    assert url =~ "X-Goog-Expires=900"
    assert expires_at == DateTime.add(@now, 900, :second)
  end

  test "is deterministic for the same inputs (verifiable signature)", %{pem: pem} do
    opts = [now: @now, expires_in: 900]

    assert SignedUrl.generate("b", "k", @email, pem, opts) ==
             SignedUrl.generate("b", "k", @email, pem, opts)
  end

  test "encodes special characters in the object key", %{pem: pem} do
    %{url: url} = SignedUrl.generate("b", "a b/c+d.txt", @email, pem, now: @now)

    # "/" stays literal in the path; space and "+" are percent-encoded.
    assert url =~ "/b/a%20b/c%2Bd.txt?"
  end
end
