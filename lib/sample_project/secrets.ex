defmodule SampleProject.Secrets do
  use AshAuthentication.Secret

  def secret_for(
        [:authentication, :tokens, :signing_secret],
        SampleProject.Accounts.User,
        _opts,
        _context
      ) do
    Application.fetch_env(:sample_project, :token_signing_secret)
  end
end
