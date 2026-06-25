defmodule SampleProject.Audit do
  @moduledoc """
  Access logging for PHI-bearing records.

  Holds `SampleProject.Audit.AccessLog`, an append-only trail of who accessed which record,
  when, and from where — covering reads (which paper-trail versioning does not) as well
  as writes. See `SampleProject.Audit.AccessLog` for the full design.
  """
  use Ash.Domain,
    otp_app: :sample_project,
    extensions: [AshTypescript.Rpc]

  typescript_rpc do
    resource SampleProject.Audit.AccessLog do
      rpc_action :list_access_logs, :list_access_logs
    end
  end

  resources do
    resource SampleProject.Audit.AccessLog
  end
end
