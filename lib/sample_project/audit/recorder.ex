defmodule SampleProject.Audit.Recorder do
  @moduledoc """
  Shared helpers for the access-logging hooks (`SampleProject.Audit.LogRead` /
  `SampleProject.Audit.LogWrite`): turn an accessed record plus the action context into a
  JSON-serializable log entry, and enqueue a batch for `SampleProject.Audit.LogWriter`.

  Entries use string keys because they ride through an Oban job's `args` (JSON). The
  actor and request metadata are best-effort: actor is `nil` for system access, and
  the IP/User-Agent/request-id are present only when the access came through an HTTP
  request that ran the `put_audit_context` plug.
  """
  require Logger

  @doc """
  A short, stable name for a resource module, e.g. `SampleProject.Accounts.User` -> "user".
  """
  def resource_type(resource) when is_atom(resource) do
    resource |> Module.split() |> List.last() |> Macro.underscore()
  end

  @doc """
  Pull the request-metadata map out of an action context map.

  The `put_audit_context` plug stores it under `:shared` (so it survives nested
  relationship loads); Ash also hoists `:shared` contents to the top level, so we
  check both — `:shared` first, then the top level — and fall back to an empty map.
  """
  def audit(context) when is_map(context) do
    shared = Map.get(context, :shared) || %{}
    Map.get(shared, :audit) || Map.get(context, :audit) || %{}
  end

  def audit(_), do: %{}

  @doc """
  Build one log entry (string-keyed map) for `record` accessed via `action_type`/
  `action_name`. `actor` is the acting user (or nil for system access) and `audit` is
  the request-metadata map set by the `put_audit_context` plug (or nil/empty when the
  access didn't originate from an HTTP request).
  """
  def entry(record, action_type, action_name, resource, actor, audit) do
    audit = audit || %{}

    %{
      "action_type" => to_string(action_type),
      "action_name" => to_string(action_name),
      "resource_type" => resource_type(resource),
      "record_id" => stringify(Map.get(record, :id)),
      "project_id" => stringify(Map.get(record, :project_id)),
      "actor_id" => actor && stringify(Map.get(actor, :id)),
      "actor_email" => actor && stringify(Map.get(actor, :email)),
      "ip_address" => Map.get(audit, :ip_address),
      "user_agent" => Map.get(audit, :user_agent),
      "request_id" => Map.get(audit, :request_id),
      "request_path" => Map.get(audit, :request_path),
      "page_view_id" => Map.get(audit, :page_view_id),
      "occurred_at" => DateTime.utc_now() |> DateTime.to_iso8601()
    }
  end

  @doc """
  Enqueue a batch of entries for asynchronous writing. Best-effort: a failure here is
  logged but never propagated, so access logging can't break the access it records.
  """
  def enqueue([]), do: :ok

  def enqueue(entries) when is_list(entries) do
    %{"entries" => entries}
    |> SampleProject.Audit.LogWriter.new()
    |> Oban.insert()
    |> case do
      {:ok, _job} -> :ok
      {:error, reason} -> log_failure(reason)
    end
  rescue
    error -> log_failure(error)
  end

  # A read action may select only a subset of fields, so an attribute like
  # `project_id` can come back unloaded (or forbidden by policy). Treat those as
  # absent rather than trying to stringify the placeholder struct.
  defp stringify(nil), do: nil
  defp stringify(%Ash.NotLoaded{}), do: nil
  defp stringify(%Ash.ForbiddenField{}), do: nil
  defp stringify(value) when is_binary(value), do: value
  defp stringify(value), do: to_string(value)

  defp log_failure(reason) do
    Logger.error("Failed to enqueue access log entry: #{inspect(reason)}")
    :ok
  end
end
