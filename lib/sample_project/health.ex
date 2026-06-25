defmodule SampleProject.Health do
  @moduledoc """
  Collects app status for Kubernetes health checks.

  These callbacks back `KubernetesHealthCheck.Plug`, mounted at the top of
  `SampleProjectWeb.Endpoint`. Kubernetes distinguishes three probes:

    * `startup/0` — has the app finished booting? Polled until it succeeds, then
      Kubernetes stops calling it. We treat the app as started once there are no
      pending database migrations.
    * `liveness/0` — is the app alive and able to reach the database? Called
      frequently; failures (past the configured threshold) cause Kubernetes to
      kill and restart the container.
    * `readiness/0` — should the app receive traffic? Failures stop traffic
      being routed to the pod without restarting it.

  See https://www.cogini.com/blog/kubernetes-health-checks-for-elixir-apps/.
  """

  alias SampleProject.Repo

  @type check_return ::
          :ok
          | {:error, {status_code :: non_neg_integer(), reason :: binary()}}
          | {:error, reason :: binary()}

  @doc """
  Reports whether the app has finished booting (Kubernetes `startupProbe`).

  Returns an error while there are migrations that have not been run, so the
  pod is only considered started once the schema is up to date. After startup
  succeeds Kubernetes switches to the liveness and readiness probes.
  """
  @spec startup :: check_return()
  def startup do
    case Ecto.Migrator.migrations(Repo) do
      migrations when is_list(migrations) ->
        if Enum.any?(migrations, fn {status, _version, _name} -> status == :down end) do
          {:error, "Database not migrated"}
        else
          liveness()
        end
    end
  rescue
    e ->
      {:error, inspect(e)}
  end

  @doc """
  Reports whether the app is alive and can reach the database (`livenessProbe`).

  Kept lightweight: it issues a trivial `SELECT 1` so a hung or unreachable
  database surfaces as a failure.
  """
  @spec liveness :: check_return()
  def liveness do
    case Ecto.Adapters.SQL.query(Repo, "SELECT 1") do
      {:ok, %{num_rows: 1, rows: [[1]]}} ->
        :ok

      {:error, reason} ->
        {:error, inspect(reason)}
    end
  rescue
    e ->
      {:error, inspect(e)}
  end

  @doc """
  Reports whether the app should serve traffic (Kubernetes `readinessProbe`).

  Currently mirrors the liveness check; override here to shed traffic during
  overload or transient back-end problems without triggering a restart.
  """
  @spec readiness :: check_return()
  def readiness do
    liveness()
  end

  @doc """
  Basic liveness with no dependency checks, for a bare "is the server up" probe.
  """
  @spec basic :: check_return()
  def basic do
    :ok
  end
end
