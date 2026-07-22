import re
import sys
from urllib.request import urlopen


def parse_table_rows(html: str) -> list[tuple[int, str, int]]:
    cells = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.IGNORECASE | re.DOTALL):
        row_cells = [
            re.sub(r"<[^>]+>", "", cell).strip()
            for cell in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.IGNORECASE | re.DOTALL)
        ]
        if len(row_cells) != 3 or row_cells[0] == "x-coordinate":
            continue
        try:
            x, y = int(row_cells[0]), int(row_cells[2])
        except ValueError:
            continue
        cells.append((x, row_cells[1], y))
    return cells


def decode_secret_message(url: str) -> None:
    with urlopen(url) as response:
        html = response.read().decode("utf-8")

    cells = parse_table_rows(html)
    if not cells:
        raise ValueError("No coordinate data found in document")

    max_x = max(x for x, _, _ in cells)
    max_y = max(y for _, _, y in cells)

    grid = [[" "] * (max_x + 1) for _ in range(max_y + 1)]
    for x, char, y in cells:
        grid[y][x] = char

    # y=0 is bottom; print top-to-bottom for upright letters
    for y in range(max_y, -1, -1):
        print("".join(grid[y]))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python decode_secret_message.py <google-doc-url>", file=sys.stderr)
        sys.exit(1)
    decode_secret_message(sys.argv[1])