defmodule SampleProject.Settings.AnthropicConfig.Actions.ListModels do
  @moduledoc """
  Generic action implementation that lists the Claude models available to the
  configured API key.

  The underlying `ReqAnthropic.Models.list/1` caches results in ETS with a 1-hour
  TTL (configurable via `config :req_anthropic, models_cache_ttl:`), so repeated
  calls don't hit the Anthropic API. Returns an empty list when no key is
  configured or the request fails, so the admin UI degrades gracefully.
  """
  use Ash.Resource.Actions.Implementation

  require Logger

  alias SampleProject.Settings

  @impl true
  def run(_input, _opts, _context) do
    case Settings.anthropic_api_key() do
      nil ->
        {:ok, []}

      key ->
        case ReqAnthropic.Models.list(api_key: key) do
          {:ok, models} ->
            {:ok, Enum.map(models, &to_model/1)}

          {:error, reason} ->
            Logger.warning("Failed to list Anthropic models: #{inspect(reason)}")
            {:ok, []}
        end
    end
  end

  defp to_model(%ReqAnthropic.Model{id: id, display_name: display_name}) do
    %{id: id, display_name: display_name || id}
  end
end
