// Wrapper that ties Vite's lifetime to this process's stdin.
//
// Phoenix runs watchers through an Erlang port. When the endpoint stops, the
// BEAM closes the port — which closes our stdin — but it does NOT signal the OS
// process, so a plain `vite` watcher is orphaned and keeps holding port 5173.
// The Hex esbuild/tailwind watchers avoid this by exiting on stdin EOF; Vite
// doesn't, so we replicate that here: spawn Vite, and kill it when stdin ends.
import { spawn } from "node:child_process"

const vite = spawn("node_modules/.bin/vite", process.argv.slice(2), {
  stdio: ["ignore", "inherit", "inherit"],
})

let shuttingDown = false
function shutdown(code) {
  if (!shuttingDown) {
    shuttingDown = true
    if (vite.exitCode === null) vite.kill("SIGTERM")
  }
  process.exit(code ?? 0)
}

// Phoenix closes our stdin when the endpoint stops — that's the exit signal.
process.stdin.on("end", () => shutdown(0))
process.stdin.on("close", () => shutdown(0))
process.stdin.resume()

// Propagate direct signals, and mirror Vite's own exit back to Phoenix.
process.on("SIGTERM", () => shutdown(0))
process.on("SIGINT", () => shutdown(0))
vite.on("exit", (code) => shutdown(code ?? 0))
