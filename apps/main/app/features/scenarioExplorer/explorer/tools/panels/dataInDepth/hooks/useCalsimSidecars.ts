"use client"

/**
 * Loads precomputed CalSim sidecars (annual series reduced offline from the raw
 * CSV; see tools/extract_calsim_sidecar.py) for the given scenario codes.
 *
 * Sidecars are static JSON under `public/data-in-depth/calsim/<code>.json` and
 * are fetched once per code and cached at module scope. A missing file (404) is
 * remembered so the explorer simply falls back to synthetic for that scenario —
 * this is the interim source until the API serves the raw series.
 */

import { useEffect, useState } from "react"
import type { CalsimSidecar } from "../data/inDepthDataSource"

const SIDECAR_BASE = "/data-in-depth/calsim"

// code -> sidecar (loaded), null (known-missing), or a pending promise.
const cache = new Map<string, CalsimSidecar | null>()
const inflight = new Map<string, Promise<void>>()

function load(code: string): Promise<void> {
  const existing = inflight.get(code)
  if (existing) return existing
  const p = fetch(`${SIDECAR_BASE}/${code}.json`)
    .then((res) => (res.ok ? (res.json() as Promise<CalsimSidecar>) : null))
    .then((data) => {
      cache.set(code, data)
    })
    .catch(() => {
      cache.set(code, null)
    })
    .finally(() => {
      inflight.delete(code)
    })
  inflight.set(code, p)
  return p
}

/** Map of code -> sidecar for the codes that have one. Re-renders as they load. */
export function useCalsimSidecars(
  codes: string[],
): Record<string, CalsimSidecar | undefined> {
  const key = [...codes].sort().join(",")
  const [, bump] = useState(0)

  useEffect(() => {
    if (typeof window === "undefined") return
    const pending = codes.filter((c) => !cache.has(c))
    if (pending.length === 0) return
    let cancelled = false
    Promise.all(pending.map(load)).then(() => {
      if (!cancelled) bump((n) => n + 1)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const out: Record<string, CalsimSidecar | undefined> = {}
  for (const code of codes) {
    const entry = cache.get(code)
    if (entry) out[code] = entry
  }
  return out
}
