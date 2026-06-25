defmodule SampleProjectWeb.Vite do
  @moduledoc """
  Renders Vite asset tags for an entry point.

  In development, when `config :sample_project, :vite_dev_server` is set, modules are
  loaded from the Vite dev server (HMR). React entries also get the React
  Refresh preamble. In production the build manifest under
  `priv/static/assets/.vite/manifest.json` is read once to emit content-hashed
  `<script>`/`<link>` tags.

  Usage in a layout:

      <SampleProjectWeb.Vite.assets entry="js/index.tsx" react />
      <SampleProjectWeb.Vite.assets entry="js/app.js" />
  """
  use Phoenix.Component

  # Must match `base` in vite.config.ts and Plug.Static's `/assets` mount.
  @base "/assets/"

  attr :entry, :string, required: true, doc: ~s(Vite input key, e.g. "js/index.tsx")
  attr :react, :boolean, default: false, doc: "Inject the React Refresh preamble in dev"

  def assets(assigns) do
    ~H"{Phoenix.HTML.raw(tags(@entry, @react))}"
  end

  defp tags(entry, react) do
    case dev_server() do
      nil -> prod_tags(entry)
      dev -> dev_tags(dev, entry, react)
    end
  end

  defp dev_server, do: Application.get_env(:sample_project, :vite_dev_server)

  defp dev_tags(dev, entry, react) do
    preamble = if react, do: react_preamble(dev), else: ""

    preamble <>
      ~s(<script type="module" src="#{dev}#{@base}@vite/client"></script>) <>
      ~s(<script type="module" src="#{dev}#{@base}#{entry}"></script>)
  end

  defp react_preamble(dev) do
    """
    <script type="module">
      import RefreshRuntime from "#{dev}#{@base}@react-refresh"
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
    """
  end

  defp prod_tags(entry) do
    man = manifest()
    chunk = Map.fetch!(man, entry)

    # CSS can live on the entry chunk or on chunks it imports (Vite hoists
    # shared CSS), so walk the import graph to collect every stylesheet.
    links =
      man
      |> collect_css(entry, MapSet.new())
      |> Enum.uniq()
      |> Enum.map(&~s(<link rel="stylesheet" href="#{@base}#{&1}" />))

    Enum.join(links ++ [~s(<script type="module" src="#{@base}#{chunk["file"]}"></script>)], "\n")
  end

  defp collect_css(man, key, seen) do
    if MapSet.member?(seen, key) do
      []
    else
      chunk = Map.get(man, key, %{})
      seen = MapSet.put(seen, key)

      imported_css =
        chunk
        |> Map.get("imports", [])
        |> Enum.flat_map(&collect_css(man, &1, seen))

      Map.get(chunk, "css", []) ++ imported_css
    end
  end

  defp manifest do
    case :persistent_term.get({__MODULE__, :manifest}, nil) do
      nil ->
        data =
          :sample_project
          |> :code.priv_dir()
          |> Path.join("static/assets/.vite/manifest.json")
          |> File.read!()
          |> Jason.decode!()

        :persistent_term.put({__MODULE__, :manifest}, data)
        data

      data ->
        data
    end
  end
end
