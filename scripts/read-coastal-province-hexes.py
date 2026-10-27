"""Read the backend province H3 sidecar as compact JSON for the JS generator."""

import json
import sys

import duckdb


def main() -> None:
    parquet_path = sys.argv[1]
    connection = duckdb.connect(":memory:")
    rows = connection.execute(
        """
        SELECT country_iso, province, h3_index
        FROM read_parquet(?)
        ORDER BY country_iso, province, h3_index
        """,
        [parquet_path],
    ).fetchall()

    grouped: dict[str, dict[str, list[str]]] = {}
    for country_iso, province, h3_index in rows:
        grouped.setdefault(country_iso, {}).setdefault(province, []).append(h3_index)

    json.dump(grouped, sys.stdout, separators=(",", ":"))
    connection.close()


if __name__ == "__main__":
    main()
