defmodule SampleProjectWeb.McpRouterTest do
  @moduledoc """
  The `/mcp` route exposes the Memories domain `tools` over MCP, authenticated by
  an Ash Authentication API key. These tests cover the auth boundary and that a
  tool runs as the key's user with the resource policies enforced.
  """
  use SampleProjectWeb.ConnCase, async: false

  alias SampleProject.Accounts.ApiKey
  alias SampleProject.Accounts.User

  defp seed_user(role) do
    Ash.Seed.seed!(User, %{
      email: "mcp-#{System.unique_integer([:positive])}@t.io",
      role: role
    })
  end

  defp api_key_for(user) do
    {:ok, key} =
      ApiKey
      |> Ash.Changeset.for_create(
        :generate,
        %{expires_at: DateTime.add(DateTime.utc_now(), 3600, :second)},
        actor: user
      )
      |> Ash.create()

    key.__metadata__.plaintext_api_key
  end

  defp rpc(conn, key, body) do
    conn =
      conn
      |> put_req_header("content-type", "application/json")
      |> put_req_header("accept", "application/json")

    conn = if key, do: put_req_header(conn, "authorization", "Bearer " <> key), else: conn
    post(conn, "/mcp", Jason.encode!(body))
  end

  test "rejects requests without an API key", %{conn: conn} do
    conn = rpc(conn, nil, %{jsonrpc: "2.0", id: 1, method: "tools/list"})
    assert conn.status == 401
  end

  test "lists the memory tools for an authenticated key", %{conn: conn} do
    key = api_key_for(seed_user(:user))

    conn = rpc(conn, key, %{jsonrpc: "2.0", id: 1, method: "tools/list"})

    assert %{"result" => %{"tools" => tools}} = json_response(conn, 200)
    names = Enum.map(tools, & &1["name"])
    assert "create_memory" in names
    assert "search_memories" in names
    assert "list_memories" in names
    assert "get_memory" in names
  end

  test "create_memory runs as the key's user and search finds it; private memories stay private",
       %{conn: conn} do
    owner = seed_user(:user)
    other = seed_user(:user)

    conn =
      rpc(conn, api_key_for(owner), %{
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: %{
          name: "create_memory",
          arguments: %{input: %{scope: "user", content: "remember the staging deploy token"}}
        }
      })

    assert json_response(conn, 200)

    # The owner can recall it semantically.
    owner_conn =
      rpc(build_conn(), api_key_for(owner), %{
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: %{name: "search_memories", arguments: %{input: %{query: "staging deploy token"}}}
      })

    assert inspect(json_response(owner_conn, 200)) =~ "staging deploy token"

    # Another user must not see the owner's private memory.
    other_conn =
      rpc(build_conn(), api_key_for(other), %{
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: %{name: "search_memories", arguments: %{input: %{query: "staging deploy token"}}}
      })

    refute inspect(json_response(other_conn, 200)) =~ "staging deploy token"
  end
end
