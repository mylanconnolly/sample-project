defmodule SampleProject.Settings do
  @moduledoc """
  Application-wide settings.

  Holds singleton configuration that isn't scoped to a single user or project —
  currently the Anthropic/Claude integration credentials used by the
  LLM-enhanced features.
  """
  use Ash.Domain, otp_app: :sample_project, extensions: [AshTypescript.Rpc]

  alias SampleProject.Settings.AnthropicConfig
  alias SampleProject.Settings.GcsConfig

  typescript_rpc do
    resource AnthropicConfig do
      rpc_action :get_anthropic_config, :current
      rpc_action :set_anthropic_config, :upsert
      rpc_action :list_anthropic_models, :list_models
    end

    resource GcsConfig do
      rpc_action :get_gcs_config, :current
      rpc_action :set_gcs_config, :upsert
    end
  end

  resources do
    resource AnthropicConfig do
      define :set_anthropic_config, action: :upsert
    end

    resource GcsConfig do
      define :set_gcs_config, action: :upsert
    end
  end

  @doc """
  Returns the configured Anthropic API key, or `nil` if none has been set.

  This loads (and decrypts) the singleton `AnthropicConfig` row. It runs without
  authorization because it is intended for system/internal use at the point an
  Anthropic request is made — pass the result as the `:api_key` option to
  `ReqAnthropic` calls.
  """
  @spec anthropic_api_key() :: String.t() | nil
  def anthropic_api_key do
    case Ash.read_one(AnthropicConfig, action: :current, authorize?: false) do
      {:ok, nil} ->
        nil

      {:ok, config} ->
        config
        |> Ash.load!(:api_key, authorize?: false)
        |> Map.get(:api_key)

      {:error, _} ->
        nil
    end
  end

  @doc """
  Like `anthropic_api_key/0` but raises if no API key has been configured.
  """
  @spec anthropic_api_key!() :: String.t()
  def anthropic_api_key! do
    anthropic_api_key() ||
      raise """
      No Anthropic API key is configured.

      Set one via `SampleProject.Settings.set_anthropic_config/2` (or the admin UI)
      before invoking LLM-enhanced functionality.
      """
  end

  @doc """
  Returns the configured default Claude model, or `nil` if none has been set.

  Reads the singleton `AnthropicConfig` without authorization (system/internal
  use). Callers should fall back to a sensible default model when this is `nil`.
  """
  @spec anthropic_default_model() :: String.t() | nil
  def anthropic_default_model do
    case Ash.read_one(AnthropicConfig, action: :current, authorize?: false) do
      {:ok, %{default_model: model}} when is_binary(model) and model != "" -> model
      _ -> nil
    end
  end

  @doc """
  Returns the configured GCS credentials and bucket, or `:error` if storage
  isn't configured yet.

  This loads (and decrypts) the singleton `GcsConfig` row, parses the service
  account JSON, and returns `{:ok, %{credentials: map, bucket: String.t()}}`.
  It runs without authorization because it's intended for system/internal use
  at the point a storage request is made (see `SampleProject.Storage`). The parsed
  credentials map is passed straight to `ReqGCS.attach(gcs_credentials: ...)`.
  """
  @spec gcs_config() :: {:ok, %{credentials: map(), bucket: String.t()}} | :error
  def gcs_config do
    with {:ok, %GcsConfig{bucket_name: bucket} = config} when is_binary(bucket) and bucket != "" <-
           Ash.read_one(GcsConfig, action: :current, authorize?: false),
         %GcsConfig{service_account_json: json} when is_binary(json) <-
           Ash.load!(config, :service_account_json, authorize?: false),
         {:ok, credentials} <- Jason.decode(json) do
      {:ok, %{credentials: credentials, bucket: bucket}}
    else
      _ -> :error
    end
  end
end
