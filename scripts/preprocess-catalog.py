#!/usr/bin/env python3
"""
Preprocess old_raw_data/ CSVs into catalog-data.json for Medusa import.

Run from repo root:
    python3 scripts/preprocess-catalog.py
"""

import csv
import json
import re
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "old_raw_data"
OUT_FILE = Path(__file__).parent / "catalog-data.json"

# Normalize known subcategory spelling variants to one canonical name
ALIASES: dict[str, str] = {
    "ELF BAR": "ELFBAR",
    "GEEK VAPE": "GEEKVAPE",
    "Adaliya": "Adalya",
    "Adaliya ": "Adalya",
    "Alfakher": "Al Fakher",
}

CSV_FILES = [
    "Снюс.csv",
    "Жидкости.csv",
    "Одноразовые ЭС.csv",
    "Под-Системы.csv",
    "IQOS.csv",
    "Расходники.csv",
    "Табаки и Угли.csv",
    "Кальяны и Комплектующие.csv",
    "Никобустеры.csv",
    "Пластинки.csv",
    "Энергетика и Чипсы.csv",
]


def normalize_subcat(name: str) -> str:
    name = name.strip()
    return ALIASES.get(name, name)


def parse_variants(text: str) -> list[str]:
    """Extract items from a numbered list like '1) mint\\n2) cola\\n3) grape'."""
    if not text.strip():
        return []
    variants: list[str] = []
    for line in text.split("\n"):
        line = line.strip()
        m = re.match(r"^\d+[.)]\s*(.+)$", line)
        if m:
            variants.append(m.group(1).strip())
    return variants


def parse_price(text: str) -> float | None:
    text = text.strip().replace("\xa0", "").replace(" ", "").replace(",", ".")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


categories: dict[str, set[str]] = {}
products: list[dict] = []
skipped = 0

for fname in CSV_FILES:
    fpath = DATA_DIR / fname
    with open(fpath, encoding="utf-8-sig") as fh:
        rows = list(csv.reader(fh))

    # Row 0: title row — category name is in col 2
    # Row 1: header row
    # Row 2+: data
    cat_name = rows[0][2].strip() if rows and len(rows[0]) > 2 else fname.replace(".csv", "")
    if not cat_name:
        cat_name = fname.replace(".csv", "")

    if cat_name not in categories:
        categories[cat_name] = set()

    for row in rows[2:]:
        if not any(r.strip() for r in row):
            continue

        row = row + [""] * max(0, 16 - len(row))

        title = row[5].strip()
        if not title:
            skipped += 1
            continue

        subcat = normalize_subcat(row[4])
        if subcat:
            categories[cat_name].add(subcat)

        variants = parse_variants(row[6])
        capital = parse_price(row[7])  # Vốn (штуки) — import/cost price only
        img_url = row[15].strip() or None
        img_name = row[14].strip() or None

        products.append({
            "category": cat_name,
            "subcategory": subcat or None,
            "title": title,
            "variants": variants,
            "capital": capital,
            "img_url": img_url,
            "img_name": img_name,
        })

cat_list = [
    {"name": name, "subcategories": sorted(subcats)}
    for name, subcats in categories.items()
]

output = {
    "categories": cat_list,
    "products": products,
    "stats": {
        "total_products": len(products),
        "skipped_empty_title": skipped,
        "products_with_variants": sum(1 for p in products if p["variants"]),
        "products_with_capital": sum(1 for p in products if p["capital"] is not None),
        "products_with_images": sum(1 for p in products if p["img_url"]),
        "total_categories": len(cat_list),
        "total_subcategories": sum(len(c["subcategories"]) for c in cat_list),
    },
}

with open(OUT_FILE, "w", encoding="utf-8") as fh:
    json.dump(output, fh, ensure_ascii=False, indent=2)

print(f"Output: {OUT_FILE}")
for k, v in output["stats"].items():
    print(f"  {k}: {v}")
