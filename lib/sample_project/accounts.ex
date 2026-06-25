defmodule SampleProject.Accounts do
  use Ash.Domain,
    otp_app: :sample_project,
    extensions: [AshTypescript.Rpc]

  typescript_rpc do
    resource SampleProject.Accounts.User do
      rpc_action :get_current_user, :me
      rpc_action :update_profile, :update_profile
      rpc_action :request_magic_link, :request_magic_link

      rpc_action :list_users, :list_users
      rpc_action :get_user, :get_user
      rpc_action :update_user, :update_user
      rpc_action :invite_user, :invite
      rpc_action :activate_user, :activate
      rpc_action :deactivate_user, :deactivate
    end

    resource SampleProject.Accounts.ApiKey do
      # The full key is returned (once) via the action's plaintext_api_key
      # metadata; the frontend reads it from the create result's metadata.
      rpc_action :generate_api_key, :generate
      rpc_action :list_api_keys, :list_for_actor
      rpc_action :destroy_api_key, :destroy
    end
  end

  resources do
    resource SampleProject.Accounts.Token

    resource SampleProject.Accounts.User do
      # Used by the invite flow (and seeds) to email a magic link to an existing
      # user. `request_magic_link` runs as a public, side-effecting action.
      define :request_magic_link, action: :request_magic_link, args: [:email]
    end

    resource SampleProject.Accounts.ApiKey
  end
end
