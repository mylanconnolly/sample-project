defmodule SampleProjectWeb.PageControllerTest do
  use SampleProjectWeb.ConnCase

  test "GET / serves the React SPA shell", %{conn: conn} do
    conn = get(conn, ~p"/")
    response = html_response(conn, 200)

    # The root path renders the SPA shell (client-side routing takes over).
    assert response =~ ~s(id="app")
    assert response =~ "SampleProject"
  end
end
