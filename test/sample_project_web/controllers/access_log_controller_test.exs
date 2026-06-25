defmodule SampleProjectWeb.AccessLogControllerTest do
  @moduledoc """
  Exercises the CSV export action directly with the Ash actor set on the conn, so the
  focus is the controller's own logic — the app-admin gate, filter mapping, and CSV
  output — rather than the router pipeline.
  """
  use SampleProjectWeb.ConnCase, async: false

  alias SampleProject.Accounts.User
  alias SampleProject.Audit.AccessLog
  alias SampleProjectWeb.AccessLogController

  defp seed_user(role) do
    Ash.Seed.seed!(User, %{
      email: "#{role}-#{System.unique_integer([:positive])}@test.io",
      role: role
    })
  end

  defp seed_log(attrs) do
    defaults = %{
      action_type: :create,
      action_name: "create",
      resource_type: "user",
      record_id: Ash.UUID.generate(),
      actor_email: "someone@test.io",
      occurred_at: DateTime.utc_now()
    }

    Ash.Seed.seed!(AccessLog, Map.merge(defaults, attrs))
  end

  defp as(conn, user), do: Ash.PlugHelpers.set_actor(conn, user)

  test "an app-admin gets a CSV attachment with the header and a row", %{conn: conn} do
    admin = seed_user(:admin)
    log = seed_log(%{action_type: :create, action_name: "create"})

    conn = AccessLogController.export(as(conn, admin), %{})

    assert conn.status == 200
    assert get_resp_header(conn, "content-type") |> hd() =~ "text/csv"
    assert get_resp_header(conn, "content-disposition") |> hd() =~ "attachment"

    [header | _] = String.split(conn.resp_body, "\r\n", trim: true)

    assert header ==
             "occurred_at,action_type,action_name,resource_type,record_id," <>
               "project_id,actor_id,actor_email,ip_address,user_agent,request_id," <>
               "request_path,page_view_id"

    assert conn.resp_body =~ log.record_id
    assert conn.resp_body =~ "create"
  end

  test "filters are applied to the export", %{conn: conn} do
    admin = seed_user(:admin)
    created = seed_log(%{action_type: :create, action_name: "create"})

    # Only :read rows requested — the :create row must be excluded.
    conn = AccessLogController.export(as(conn, admin), %{"actionType" => "read"})

    assert conn.status == 200
    rows = String.split(conn.resp_body, "\r\n", trim: true) |> tl()
    refute Enum.any?(rows, &(&1 =~ created.record_id and &1 =~ ",create,"))
  end

  test "a non-admin is forbidden", %{conn: conn} do
    regular = seed_user(:user)

    conn = AccessLogController.export(as(conn, regular), %{})

    assert conn.status == 403
  end

  test "an anonymous request is forbidden", %{conn: conn} do
    conn = AccessLogController.export(conn, %{})

    assert conn.status == 403
  end
end
