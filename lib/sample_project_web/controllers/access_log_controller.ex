defmodule SampleProjectWeb.AccessLogController do
  @moduledoc """
  CSV export of the PHI access log for app admins.

  The browsable UI lives in the React SPA and reads via the `list_access_logs` RPC;
  a file download can't go through RPC, so the export lives here. It applies the same
  facets the UI exposes (passed as query-string params), reuses the resource's
  `:list_access_logs` read action — so the app-admin read policy still gates the data —
  and streams the rows with `Ash.stream!/2` to avoid loading a large log into memory.
  """
  use SampleProjectWeb, :controller

  require Ash.Query

  alias SampleProject.Audit.AccessLog

  @columns ~w(occurred_at action_type action_name resource_type record_id project_id
              actor_id actor_email ip_address user_agent request_id request_path
              page_view_id)a

  def export(conn, params) do
    actor = Ash.PlugHelpers.get_actor(conn)

    # App-admin only. The resource read policy enforces this too, but a non-admin
    # should get a clear 403 rather than an empty CSV.
    if actor && actor.role == :admin do
      stream_csv(conn, actor, params)
    else
      send_resp(conn, 403, "forbidden")
    end
  end

  defp stream_csv(conn, actor, params) do
    query =
      AccessLog
      |> Ash.Query.for_read(:list_access_logs, read_input(params), actor: actor)
      |> filter_resource_type(params["resourceType"])
      |> filter_page_view_id(params["pageViewId"])

    conn =
      conn
      |> put_resp_content_type("text/csv")
      |> put_resp_header("content-disposition", ~s(attachment; filename="access-log.csv"))
      |> send_chunked(200)

    {:ok, conn} = chunk(conn, csv_row(Enum.map(@columns, &to_string/1)))

    query
    |> Ash.stream!(actor: actor)
    |> Enum.reduce_while(conn, fn log, conn ->
      case chunk(conn, csv_row(Enum.map(@columns, &field(log, &1)))) do
        {:ok, conn} -> {:cont, conn}
        {:error, :closed} -> {:halt, conn}
      end
    end)
  end

  # Map the UI's query-string facets onto the read action's arguments. Blank values
  # are dropped so they don't over-constrain the query.
  defp read_input(params) do
    %{
      actor_email: present(params["q"]),
      action_type: present(params["actionType"]),
      actor_id: present(params["actorId"]),
      record_id: present(params["recordId"]),
      project_id: present(params["projectId"]),
      from: day_start(params["from"]),
      to: day_end(params["to"])
    }
    |> Enum.reject(fn {_k, v} -> is_nil(v) end)
    |> Map.new()
  end

  defp filter_resource_type(query, value) do
    case present(value) do
      nil -> query
      type -> Ash.Query.filter(query, resource_type == ^type)
    end
  end

  defp filter_page_view_id(query, value) do
    case present(value) do
      nil -> query
      id -> Ash.Query.filter(query, page_view_id == ^id)
    end
  end

  defp field(log, key) do
    case Map.get(log, key) do
      nil -> ""
      %DateTime{} = dt -> DateTime.to_iso8601(dt)
      value -> to_string(value)
    end
  end

  # RFC-4180-ish CSV line: quote any field containing a comma, quote, or newline,
  # doubling embedded quotes.
  defp csv_row(fields) do
    fields
    |> Enum.map_join(",", &csv_escape/1)
    |> Kernel.<>("\r\n")
  end

  defp csv_escape(value) do
    if String.contains?(value, [",", "\"", "\n", "\r"]) do
      ~s("#{String.replace(value, "\"", "\"\"")}")
    else
      value
    end
  end

  defp present(nil), do: nil

  defp present(value) when is_binary(value),
    do: if(String.trim(value) == "", do: nil, else: value)

  defp present(value), do: value

  defp day_start(value), do: day_boundary(value, ~T[00:00:00.000000])
  defp day_end(value), do: day_boundary(value, ~T[23:59:59.999999])

  defp day_boundary(value, time) do
    with date_string when is_binary(date_string) <- present(value),
         {:ok, date} <- Date.from_iso8601(date_string) do
      DateTime.new!(date, time, "Etc/UTC")
    else
      _ -> nil
    end
  end
end
