defmodule SampleProject.Vault do
  @moduledoc """
  Cloak vault used to encrypt sensitive attributes at rest.

  Currently this protects the Anthropic API key stored on
  `SampleProject.Settings.AnthropicConfig`. The encryption key is supplied through
  configuration: see `config/dev.exs` and `config/test.exs` for the
  development/test keys, and `config/runtime.exs` (the `CLOAK_KEY` environment
  variable) for production.
  """
  use Cloak.Vault, otp_app: :sample_project
end
