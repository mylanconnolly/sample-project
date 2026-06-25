defmodule SampleProject.Application do
  # See https://elixir.hexdocs.pm/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children =
      [
        SampleProjectWeb.Telemetry,
        SampleProject.Vault,
        SampleProject.Repo,
        {DNSCluster, query: Application.get_env(:sample_project, :dns_cluster_query) || :ignore},
        {Oban,
         AshOban.config(
           Application.fetch_env!(:sample_project, :ash_domains),
           Application.fetch_env!(:sample_project, Oban)
         )},
        {Phoenix.PubSub, name: SampleProject.PubSub}
        # Start a worker by calling: SampleProject.Worker.start_link(arg)
        # {SampleProject.Worker, arg},
      ] ++
        embedding_children() ++
        [
          # Start to serve requests, typically the last entry
          SampleProjectWeb.Endpoint,
          {AshAuthentication.Supervisor, [otp_app: :sample_project]}
        ]

    # See https://elixir.hexdocs.pm/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: SampleProject.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    SampleProjectWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  # The embedding `Nx.Serving` is only supervised when the real adapter is
  # configured (dev/prod). Tests use SampleProject.Embeddings.StubAdapter, which loads
  # no model, so the serving must not start there.
  defp embedding_children do
    case Application.fetch_env!(:sample_project, :embeddings)[:adapter] do
      SampleProject.Embeddings.ServingAdapter -> [SampleProject.Embeddings.ServingAdapter]
      _other -> []
    end
  end
end
