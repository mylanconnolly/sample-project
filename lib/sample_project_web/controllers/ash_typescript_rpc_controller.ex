defmodule SampleProjectWeb.AshTypescriptRpcController do
  use SampleProjectWeb, :controller

  def run(conn, params) do
    result = AshTypescript.Rpc.run_action(:sample_project, conn, params)
    json(conn, result)
  end

  def validate(conn, params) do
    result = AshTypescript.Rpc.validate_action(:sample_project, conn, params)
    json(conn, result)
  end
end
