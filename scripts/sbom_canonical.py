"""Print an SBOM with its run-varying fields removed.

Two CycloneDX documents generated from the same module differ on every run:
serialNumber is a fresh UUID, metadata.timestamp is the moment of generation,
and metadata.tools records the generator build. None of those describe the
product, so comparing raw files would report a stale SBOM on every CI run and
the check would be turned off within a week.

Used by the CI SBOM job, and runnable by hand for the same comparison:

    python scripts/sbom_canonical.py sbom.json
"""

import json
import sys


def canonical(path: str) -> str:
    with open(path, encoding="utf-8") as fh:
        doc = json.load(fh)

    doc.pop("serialNumber", None)
    metadata = doc.get("metadata", {})
    metadata.pop("timestamp", None)
    metadata.pop("tools", None)

    return json.dumps(doc, indent=2, sort_keys=True)


def main() -> int:
    if len(sys.argv) != 2:
        print(f"usage: {sys.argv[0]} <sbom.json>", file=sys.stderr)
        return 2
    print(canonical(sys.argv[1]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
