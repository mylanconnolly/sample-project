defmodule SampleProjectWeb.AuthOverrides do
  @moduledoc """
  UI overrides for the server-rendered AshAuthentication pages (magic-link
  sign-in, sign-out, and confirmation).

  These pages load `app.css`, so we style them with the same shadcn design tokens
  as the rest of the app: warm `bg-background` canvas, ember `bg-primary` buttons,
  `text-foreground`/`text-muted-foreground` copy, and the SampleProject wordmark in
  place of the default Ash Framework banner. Tailwind scans this file (it's under
  the configured `@source` path), so the utility classes below get compiled.

  Applied alongside `AshAuthentication.Phoenix.Overrides.Default` (see the router)
  — anything not set here falls back to the default.
  """

  use AshAuthentication.Phoenix.Overrides

  alias AshAuthentication.Phoenix.{
    Components,
    ConfirmLive,
    MagicSignInLive,
    SignOutLive
  }

  # Primary (ember) button — mirrors the app's shadcn primary button.
  @button_class """
  w-full inline-flex justify-center items-center rounded-md bg-primary px-4 py-2
  text-sm font-medium text-primary-foreground shadow-sm transition-colors
  hover:bg-primary/90 focus:outline-none focus-visible:ring-2
  focus-visible:ring-ring focus-visible:ring-offset-2
  focus-visible:ring-offset-background
  """

  @heading_class "mt-2 mb-4 text-2xl font-bold tracking-tight text-foreground"
  @info_class "text-sm text-muted-foreground mb-4"

  # --- Page backgrounds: warm canvas instead of the default dark:bg-gray-900 ---

  override SignOutLive do
    set :root_class, "grid h-screen place-items-center bg-background px-4"
  end

  override MagicSignInLive do
    set :root_class, "grid h-screen place-items-center bg-background px-4"
  end

  override ConfirmLive do
    set :root_class, "grid h-screen place-items-center bg-background px-4"
  end

  # --- Banner: SampleProject wordmark in place of the Ash Framework logo -------------

  override Components.Banner do
    set :root_class, "w-full flex items-center justify-center gap-2.5 py-2"
    # No link wrapper — keep the banner as static branding.
    set :href_url, nil
    set :image_url, "/images/sampleproject-mark.svg"
    set :image_class, "h-8 w-8"
    # The mark reads on both light and dark, so we don't need a separate dark img.
    set :dark_image_url, nil
    set :dark_image_class, nil
    set :text, "SampleProject"
    set :text_class, "font-mono text-lg font-semibold tracking-tight text-foreground"
  end

  # --- Sign out ----------------------------------------------------------------

  override Components.SignOut do
    set :h2_class, @heading_class
    set :info_text_class, @info_class
    set :button_class, @button_class
  end

  # --- Magic link sign-in ------------------------------------------------------

  override Components.MagicLink do
    set :label_class, @heading_class
  end

  override Components.MagicLink.Input do
    set :submit_class, @button_class <> " mt-4 mb-4"
    set :remember_me_class, "flex items-center gap-2 mt-2 mb-2 text-foreground"
    set :checkbox_class, "mr-2 accent-primary"
    set :checkbox_label_class, "text-sm font-medium text-foreground"
  end

  # --- Confirmation ------------------------------------------------------------

  override Components.Confirm.Input do
    set :submit_class, @button_class <> " mt-4 mb-4"
  end

  # --- Shared bits: divider + flashes ------------------------------------------

  override Components.HorizontalRule do
    set :root_class, "relative my-2"
    set :hr_outer_class, "absolute inset-0 flex items-center"
    set :hr_inner_class, "w-full border-t border-border"
    set :text_outer_class, "relative flex justify-center text-sm"
    set :text_inner_class, "px-2 bg-background text-muted-foreground font-medium"
    set :text, "or"
  end

  override Components.Flash do
    set :message_class_info, """
    fixed top-2 right-2 mr-2 w-80 sm:w-96 z-50 rounded-lg p-3 text-sm
    bg-emerald-50 text-emerald-800 border border-emerald-200
    """

    set :message_class_error, """
    fixed top-2 right-2 mr-2 w-80 sm:w-96 z-50 rounded-lg p-3 text-sm
    bg-destructive/10 text-destructive border border-destructive/30
    """
  end
end
