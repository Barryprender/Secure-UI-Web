"""Print an SBOM with its run-varying fields removed.

Two CycloneDX documents generated from the same module differ on every run, in
ways that say nothing about what the product depends on:

  * serialNumber is a fresh UUID and metadata.timestamp is the moment of
    generation;
  * metadata.tools records the generator build;
  * the main module has no released version, so cyclonedx-gomod gives it a
    pseudo-version derived from the last commit — v0.0.0-<utc>-<sha>. That
    string changes on **every commit**, and it appears in the component's
    version, purl and bom-ref. Left in, the freshness check would fail on every
    run after the one that generated the file, which is the fastest way to get a
    check switched off.

The main module's own version is therefore normalised to a placeholder rather
than compared. A dependency's version changing is exactly what this check exists
to catch; the product's own commit hash is not.

Used by the CI SBOM job, and runnable by hand for the same comparison:

    python scripts/sbom_canonical.py sbom.json
"""

import json
import sys

MAIN_VERSION_PLACEHOLDER = "0.0.0-main"


def canonical(path: str) -> str:
    with open(path, encoding="utf-8") as fh:
        doc = json.load(fh)

    doc.pop("serialNumber", None)
    metadata = doc.get("metadata", {})
    metadata.pop("timestamp", None)
    metadata.pop("tools", None)

    text = json.dumps(doc, indent=2, sort_keys=True)

    # Substituted across the whole document, because the pseudo-version is
    # embedded in purl and bom-ref strings as well as in the version field.
    main_version = metadata.get("component", {}).get("version")
    if main_version:
        text = text.replace(main_version, MAIN_VERSION_PLACEHOLDER)

    return text


def main() -> int:
    if len(sys.argv) != 2:
        print(f"usage: {sys.argv[0]} <sbom.json>", file=sys.stderr)
        return 2
    print(canonical(sys.argv[1]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
