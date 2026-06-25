defmodule SampleProject.Accounts.User do
  use Ash.Resource,
    otp_app: :sample_project,
    domain: SampleProject.Accounts,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer],
    notifiers: [Ash.Notifier.PubSub],
    extensions: [AshAuthentication, AshTypescript.Resource]

  authentication do
    add_ons do
      log_out_everywhere do
        apply_on_password_change? true
      end
    end

    tokens do
      enabled? true
      token_resource SampleProject.Accounts.Token
      signing_secret SampleProject.Secrets
      store_all_tokens? true
      require_token_presence_for_authentication? true
    end

    strategies do
      magic_link do
        identity_field :email
        # Registration is disabled: signing in only works for users that
        # already exist (i.e. were invited). Requesting a magic link for an
        # unknown email silently no-ops, and the sign-in action becomes a read.
        registration_enabled? false
        require_interaction? true

        sender SampleProject.Accounts.User.Senders.SendMagicLinkEmail
      end

      remember_me :remember_me

      api_key :api_key do
        api_key_relationship :valid_api_keys
        api_key_hash_attribute :api_key_hash
      end
    end
  end

  postgres do
    table "users"
    repo SampleProject.Repo
  end

  typescript do
    type_name "User"
  end

  actions do
    defaults [:read]

    read :get_by_subject do
      description "Get a user by the subject claim in a JWT"
      argument :subject, :string, allow_nil?: false
      get? true
      prepare AshAuthentication.Preparations.FilterBySubject
    end

    read :get_by_email do
      description "Looks up a user by their email"
      get_by :email
    end

    read :me do
      description "Returns the current actor (the signed-in user)."
      get? true
      filter expr(id == ^actor(:id))
    end

    update :update do
      accept [:email]
    end

    # Registration is disabled, so signing in with a magic link is a read action
    # that only matches existing (invited) users. See the AshAuthentication
    # magic-link + remember-me tutorials.
    read :sign_in_with_magic_link do
      description "Sign in a user with magic link."

      argument :token, :string do
        description "The token from the magic link that was sent to the user"
        allow_nil? false
      end

      argument :remember_me, :boolean do
        description "Whether to generate a remember me token"
        allow_nil? true
      end

      # Only active users may sign in. This ANDs with the subject filter added by
      # SignInPreparation, so a valid magic-link token for a deactivated user
      # resolves to no record and the sign-in fails.
      filter expr(active == true)

      # Uses the information from the token to sign in the user
      prepare AshAuthentication.Strategy.MagicLink.SignInPreparation

      prepare AshAuthentication.Strategy.RememberMe.MaybeGenerateTokenPreparation

      metadata :token, :string do
        allow_nil? false
      end

      metadata :remember_me, :map do
        allow_nil? true
      end

      get? true
    end

    action :request_magic_link do
      argument :email, :ci_string do
        allow_nil? false
      end

      run AshAuthentication.Strategy.MagicLink.Request
    end

    read :list_users do
      description "Admin listing of users, paginated/sortable/searchable by email."

      # No default sort: callers (the admin table) always pass an explicit sort
      # with an `id` tiebreaker. A default sort here would become the *primary*
      # sort (RPC sort is appended), silently overriding the requested column.
      argument :search, :string do
        description "Phrase-aware search over the email address (e.g. \"mc iotrak\")."
        allow_nil? true
      end

      prepare {SampleProject.Search.PhraseSearch, argument: :search, fields: [:email]}

      pagination do
        keyset? true
        default_limit 25
        countable true
        required? false
      end
    end

    read :get_user do
      description "Fetch a single user by id (admin)."
      get_by :id
    end

    update :update_user do
      description "Admin update of a user's email, role, and display name."
      accept [:email, :role, :name]
    end

    update :update_profile do
      description "Self-service update of the signed-in user's own profile (display name)."
      accept [:name]
    end

    create :invite do
      description "Invite a new user: create the account and email them a magic link."
      accept [:email, :role]

      change SampleProject.Accounts.User.Changes.SendInviteMagicLink
    end

    update :deactivate do
      description "Mark a user inactive, preventing them from signing in."
      accept []
      change set_attribute(:active, false)
    end

    update :activate do
      description "Re-activate a previously deactivated user."
      accept []
      change set_attribute(:active, true)
    end

    read :sign_in_with_api_key do
      argument :api_key, :string, allow_nil?: false
      prepare AshAuthentication.Strategy.ApiKey.SignInPreparation
    end
  end

  policies do
    bypass AshAuthentication.Checks.AshAuthenticationInteraction do
      authorize_if always()
    end

    policy action(:me) do
      authorize_if actor_present()
    end

    # Requesting a magic link is a public, pre-auth action (anyone may request
    # one for their email). The AshAuthenticationInteraction bypass above only
    # applies once the action is running, so an explicit allow is needed for the
    # RPC-invoked policy check.
    policy action(:request_magic_link) do
      authorize_if always()
    end

    # The primary read backs the admin listings' record lookups and the record
    # lookup performed by every update (update_user runs as a bulk update;
    # update_profile likewise looks the record up via the primary read). Admins
    # can read everyone; anyone can read themselves (which is what lets them run
    # update_profile). `:read` is not exposed over RPC, so this only affects
    # internal lookups and relationship loads.
    policy action(:read) do
      authorize_if actor_attribute_equals(:role, :admin)
      authorize_if expr(id == ^actor(:id))
    end

    # Admin-only management actions.
    policy action([:list_users, :get_user, :update_user, :invite, :activate, :deactivate]) do
      authorize_if actor_attribute_equals(:role, :admin)
    end

    # Anyone may update their own profile (currently just the display name).
    policy action(:update_profile) do
      authorize_if expr(id == ^actor(:id))
    end
  end

  pub_sub do
    module SampleProjectWeb.Endpoint
    prefix "user"

    publish :update, [:id], event: :user_updated, public?: true, transform: :user_summary

    publish :update_user, [:id], event: :user_updated, public?: true, transform: :user_summary
  end

  attributes do
    uuid_primary_key :id

    attribute :email, :ci_string do
      allow_nil? false
      public? true
    end

    attribute :name, :string do
      description "Optional display name; the UI falls back to email when blank."
      allow_nil? true
      public? true
    end

    attribute :role, SampleProject.Accounts.User.Role do
      description "Authorization role. Admins can access the admin section."
      default :user
      allow_nil? false
      public? true
    end

    attribute :active, :boolean do
      description "Inactive users cannot sign in. Toggled only via the activate/deactivate actions."
      default true
      allow_nil? false
      public? true
    end

    timestamps do
      public? true
    end
  end

  relationships do
    has_many :valid_api_keys, SampleProject.Accounts.ApiKey do
      filter expr(valid)
    end
  end

  calculations do
    calculate :user_summary, :map, expr(%{id: id, email: email, name: name}) do
      description "Compact payload broadcast on the user_updated channel event."
      public? true

      constraints fields: [
                    id: [type: :uuid, allow_nil?: false],
                    email: [type: :ci_string, allow_nil?: false],
                    name: [type: :string, allow_nil?: true]
                  ]
    end
  end

  identities do
    identity :unique_email, [:email]
  end
end
