defmodule SampleProject.Storage do
  @moduledoc """
  Thin wrapper over `ReqGCS` for storing and retrieving objects in Google Cloud
  Storage.

  Credentials and the target bucket come from the singleton
  `SampleProject.Settings.GcsConfig` (see `SampleProject.Settings.gcs_config/0`). `ReqGCS`
  uses inline credentials and manages/caches its own Goth token process per
  credential set, so there's nothing to add to the supervision tree.

  Objects are private: reads should go through `download/1` behind an
  authenticated, authorized controller action, never a public GCS URL.

  All functions return `:error`-style tuples rather than raising:

    * `{:error, :not_configured}` when GCS settings are missing/unparseable
    * `{:error, {:gcs, status, body}}` when GCS responds with a non-2xx status
    * `{:error, exception}` when the request itself fails
  """
  alias SampleProject.Settings

  @doc """
  Uploads `body` to `key` in the configured bucket with the given content type.
  Returns `:ok` on success.
  """
  @spec upload(String.t(), binary(), String.t() | nil) :: :ok | {:error, term()}
  def upload(key, body, content_type) do
    with_client(fn req, bucket ->
      opts = if content_type, do: [content_type: content_type], else: []

      req
      |> ReqGCS.upload_object(bucket, key, body, opts)
      |> normalize(:ok)
    end)
  end

  @doc """
  Downloads the object at `key`, returning `{:ok, binary}`.
  """
  @spec download(String.t()) :: {:ok, binary()} | {:error, term()}
  def download(key) do
    with_client(fn req, bucket ->
      req
      |> ReqGCS.download_object(bucket, key)
      |> normalize(:body)
    end)
  end

  @doc """
  Builds a time-limited V4 signed `GET` URL for the object at `key`.

  Lets a client download the (private) bytes directly from GCS without going
  through the app — used by the MCP `get_attachment` tool so an agent's host can
  fetch attachment content. See `SampleProject.Storage.SignedUrl`.

  Options are passed through to `SampleProject.Storage.SignedUrl.generate/5` (notably
  `:expires_in`, default 15 minutes). Returns
  `{:ok, %{url: String.t(), expires_at: DateTime.t()}}`, or
  `{:error, :not_configured}` when storage credentials are missing.
  """
  @spec signed_get_url(String.t(), keyword()) ::
          {:ok, %{url: String.t(), expires_at: DateTime.t()}} | {:error, :not_configured}
  def signed_get_url(key, opts \\ []) do
    case Settings.gcs_config() do
      {:ok, %{credentials: %{"client_email" => email, "private_key" => pem}, bucket: bucket}} ->
        {:ok, SampleProject.Storage.SignedUrl.generate(bucket, key, email, pem, opts)}

      _ ->
        {:error, :not_configured}
    end
  end

  @doc """
  Deletes the object at `key`. Returns `:ok` (also treats an already-absent
  object as success).
  """
  @spec delete(String.t()) :: :ok | {:error, term()}
  def delete(key) do
    with_client(fn req, bucket ->
      case ReqGCS.delete_object(req, bucket, key) do
        {:ok, %Req.Response{status: 404}} -> :ok
        other -> normalize(other, :ok)
      end
    end)
  end

  defp with_client(fun) do
    case Settings.gcs_config() do
      {:ok, %{credentials: credentials, bucket: bucket}} ->
        req = Req.new(req_options()) |> ReqGCS.attach(gcs_credentials: credentials)
        fun.(req, bucket)

      :error ->
        {:error, :not_configured}
    end
  end

  # Extra Req options merged into the client. Used in tests to route requests to a
  # `Req.Test` stub (and preset `:auth`, which makes ReqGCS skip its OAuth step).
  defp req_options do
    Application.get_env(:sample_project, __MODULE__, [])[:req_options] || []
  end

  defp normalize({:ok, %Req.Response{status: status} = resp}, return) when status in 200..299 do
    case return do
      :ok -> :ok
      :body -> {:ok, resp.body}
    end
  end

  defp normalize({:ok, %Req.Response{status: status, body: body}}, _return) do
    {:error, {:gcs, status, body}}
  end

  defp normalize({:error, exception}, _return) do
    {:error, exception}
  end
end
