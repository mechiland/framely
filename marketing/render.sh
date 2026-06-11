#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

render() {
  local name="$1" w="$2" h="$3"
  # Chrome headless reserves 87px of bottom chrome on macOS — render taller and crop.
  local h_render=$((h + 87))
  echo "Rendering $name (${w}x${h})..."
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --window-size="${w},${h_render}" \
    --screenshot="${name}.png" \
    "file://$(pwd)/${name}.html" 2>/dev/null
  # Crop bottom 87px and convert to 24-bit PNG (no alpha) for Chrome Web Store
  python3 - "$name.png" "$w" "$h" <<'PY'
import sys
from PIL import Image
path, w, h = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
im = Image.open(path).convert('RGB')
im.crop((0, 0, w, h)).save(path, 'PNG')
PY
}

render screenshot-1 1280 800
render screenshot-2 1280 800
render screenshot-3 1280 800
render screenshot-4 1280 800
render screenshot-5 1280 800
render promo-small 440 280
render promo-marquee 1400 560
echo "Done."
