defmodule SampleProject.Accounts.User.Senders.SendMagicLinkEmail do
  @moduledoc """
  Sends a magic link email.

  Used for both invited (brand-new) users and existing users signing in — in
  both cases clicking the link signs the recipient in, so the copy stays generic.
  The HTML is a table-based, inline-styled layout (the only thing email clients
  reliably render) themed to match the app: warm canvas, ember accent, Geist Mono
  wordmark. A plaintext part is included for deliverability and text-only clients.
  """

  use AshAuthentication.Sender
  use SampleProjectWeb, :verified_routes

  import Swoosh.Email
  alias SampleProject.Mailer

  @impl true
  def send(user_or_email, token, _) do
    # If you get a user, it's for a user that already exists.
    # If you get an email, then the user does not yet exist.
    email =
      case user_or_email do
        %{email: email} -> email
        email -> email
      end

    magic_link_url = url(~p"/magic_link/#{token}")

    new()
    # TODO: Replace the from address with your verified sending domain.
    |> from({"SampleProject", "noreply@sampleproject.app"})
    |> to(to_string(email))
    |> subject("Sign in to SampleProject")
    |> html_body(render_html(to_string(email), magic_link_url))
    |> text_body(render_text(to_string(email), magic_link_url))
    |> Mailer.deliver!()
  end

  # --- HTML ------------------------------------------------------------------

  defp render_html(email, magic_link_url) do
    safe_email = email |> Phoenix.HTML.html_escape() |> Phoenix.HTML.safe_to_string()
    year = Date.utc_today().year

    """
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>Sign in to SampleProject</title>
        <style>
          @media only screen and (max-width: 540px) {
            .hp-card { padding: 24px !important; }
          }
        </style>
      </head>
      <body style="margin:0; padding:0; background-color:#FBFAF6;">
        <!-- preheader (hidden) -->
        <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#FBFAF6;">
          Your secure sign-in link for SampleProject. It works once and expires shortly.
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FBFAF6;">
          <tr>
            <td align="center" style="padding:40px 16px;">
              <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:520px; max-width:100%;">

                <!-- brand -->
                <tr>
                  <td style="padding:0 4px 22px 4px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="36" height="36" align="center" valign="middle" bgcolor="#C2410C" style="width:36px; height:36px; background-color:#C2410C; border-radius:10px;">
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                          </svg>
                        </td>
                        <td valign="middle" style="padding-left:10px; font-family:'Geist Mono Variable', ui-monospace, SFMono-Regular, Menlo, monospace; font-size:18px; font-weight:600; letter-spacing:-0.02em; color:#252525;">
                          SampleProject
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- card -->
                <tr>
                  <td class="hp-card" style="background-color:#FFFFFF; border:1px solid #E8E6E0; border-radius:14px; padding:32px;">
                    <h1 style="margin:0 0 12px 0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:22px; line-height:1.3; font-weight:600; color:#252525;">
                      Sign in to SampleProject
                    </h1>
                    <p style="margin:0 0 24px 0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:15px; line-height:1.6; color:#52525B;">
                      Hi #{safe_email}, use the button below to sign in. For your security, this link works only once and expires shortly.
                    </p>

                    <!-- button -->
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="#{magic_link_url}" style="height:46px; v-text-anchor:middle; width:210px;" arcsize="22%" fillcolor="#C2410C" stroke="f">
                      <w:anchorlock/>
                      <center style="color:#FFFFFF; font-family:sans-serif; font-size:15px; font-weight:bold;">Sign in to SampleProject</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#C2410C" style="background-color:#C2410C; border-radius:10px;">
                          <a href="#{magic_link_url}" target="_blank" style="display:inline-block; padding:13px 26px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:15px; font-weight:600; line-height:1; color:#FFFFFF; text-decoration:none; border-radius:10px;">
                            Sign in to SampleProject
                          </a>
                        </td>
                      </tr>
                    </table>
                    <!--<![endif]-->

                    <p style="margin:24px 0 8px 0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:13px; line-height:1.5; color:#6F6F6F;">
                      Button not working? Copy and paste this URL into your browser:
                    </p>
                    <p style="margin:0; font-family:'Geist Mono Variable', ui-monospace, SFMono-Regular, Menlo, monospace; font-size:12px; line-height:1.5; color:#6F6F6F; word-break:break-all; background-color:#FBFAF6; border:1px solid #E8E6E0; border-radius:8px; padding:12px;">
                      #{magic_link_url}
                    </p>
                  </td>
                </tr>

                <!-- footer -->
                <tr>
                  <td style="padding:22px 4px 0 4px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:12px; line-height:1.6; color:#9A968E;">
                    <p style="margin:0 0 4px 0;">If you didn't request this email, you can safely ignore it — no one can sign in without the link above.</p>
                    <p style="margin:0;">&copy; #{year} SampleProject</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """
  end

  # --- Plaintext fallback ----------------------------------------------------

  defp render_text(email, magic_link_url) do
    """
    Sign in to SampleProject

    Hi #{email}, use the link below to sign in. For your security, it works only
    once and expires shortly:

    #{magic_link_url}

    If you didn't request this email, you can safely ignore it — no one can sign
    in without the link above.

    © #{Date.utc_today().year} SampleProject
    """
  end
end
