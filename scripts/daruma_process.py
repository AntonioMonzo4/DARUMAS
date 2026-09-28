from PIL import Image, ImageDraw
import numpy as np
import os
from collections import deque

SRC = os.path.join(os.path.dirname(__file__), '..', 'daruma.jpg')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'daruma')
PREV = os.path.join(os.path.dirname(__file__), 'preview-eyes.png')
TARGET_W = 512
SRC_W, SRC_H = 1150, 1200

# Eye centers in original 1150x1200
LEFT_EYE = (410, 422)
RIGHT_EYE = (726, 422)
R_BLACK = 51
R_OUTER = 72

COLORS = {
    'shu': None,
    'kin': 40,
    'ai': 210,
    'matsu': 140,
    'murasaki': 270,
    'kaki': 18,
}


def remove_background(arr):
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int32)
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    rng = mx - mn
    cand = (rng < 55) & (mx > 65)

    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if cand[y, x]:
                visited[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if cand[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))

    while q:
        y, x = q.popleft()
        if y > 0 and cand[y - 1, x] and not visited[y - 1, x]:
            visited[y - 1, x] = True
            q.append((y - 1, x))
        if y + 1 < h and cand[y + 1, x] and not visited[y + 1, x]:
            visited[y + 1, x] = True
            q.append((y + 1, x))
        if x > 0 and cand[y, x - 1] and not visited[y, x - 1]:
            visited[y, x - 1] = True
            q.append((y, x - 1))
        if x + 1 < w and cand[y, x + 1] and not visited[y, x + 1]:
            visited[y, x + 1] = True
            q.append((y, x + 1))

    out = arr.copy()
    out[visited, 3] = 0
    return out


def find_kanji_bbox(arr):
    h, w = arr.shape[:2]
    R, G, B = arr[:, :, 0].astype(int), arr[:, :, 1].astype(int), arr[:, :, 2].astype(int)
    A = arr[:, :, 3]
    gold = (R > 170) & (G > 110) & (B < 120) & (R - B > 70) & (A > 100)
    ys, xs = np.where(gold)
    mask = ys > int(h * 0.60)
    ys, xs = ys[mask], xs[mask]
    if len(xs) == 0:
        return None
    # center column only — exclude gold side stripes
    lo, hi = w * 0.36, w * 0.64
    keep = (xs > lo) & (xs < hi)
    ys, xs = ys[keep], xs[keep]
    if len(xs) == 0:
        return None
    # asymmetric pad: keep top clear of the face/beard
    return (int(xs.min()) - 28, int(ys.min()) - 10,
            int(xs.max()) + 28, int(ys.max()) + 32)


def erase_kanji(arr, bbox):
    if bbox is None:
        return arr
    x0, y0, x1, y1 = bbox
    h, w = arr.shape[:2]
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(w, x1), min(h, y1)

    region = arr[y0:y1, x0:x1].copy()
    R = region[:, :, 0].astype(int)
    G = region[:, :, 1].astype(int)
    B = region[:, :, 2].astype(int)
    A = region[:, :, 3]
    # gold/orange kanji strokes + anti-aliased fringe
    gold = (A > 60) & (R > 110) & (G > 45) & (B < 180) & ((R - B) > 35) & (G < 240)

    try:
        from scipy import ndimage as _ndi
        m = _ndi.binary_closing(gold, iterations=2)
        # dilate enough to cover embossed outline around strokes
        m = _ndi.binary_dilation(m, iterations=8)
        if not m.any():
            return arr
        # inpaint strokes from nearest clean body pixel
        ind = _ndi.distance_transform_edt(m, return_indices=True, return_distances=False)
        fill_rgb = region[ind[0], ind[1], :3].astype(np.float32)
        out = region.copy()
        out[:, :, :3] = np.clip(fill_rgb, 0, 255).astype(np.uint8)
        # soften only patched pixels to blend AA edges
        wgt = _ndi.gaussian_filter(m.astype(np.float32), sigma=3.0)
        wgt = np.clip(wgt, 0, 1)[:, :, None]
        soft = out.astype(np.float32)
        for c in range(3):
            soft[:, :, c] = _ndi.gaussian_filter(soft[:, :, c], sigma=1.5)
        out[:, :, :3] = np.clip(
            region.astype(np.float32)[:, :, :3] * (1 - wgt) + soft[:, :, :3] * wgt,
            0, 255,
        ).astype(np.uint8)
        region = out
    except Exception:
        return arr

    arr[y0:y1, x0:x1] = region
    return arr


def shift_red_hue(arr, hue_deg):
    if hue_deg is None:
        return arr
    out = arr.copy()
    rgb = out[:, :, :3].astype(np.float32) / 255.0
    a = out[:, :, 3]
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    rng = mx - mn
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    safe = np.where(rng < 1e-6, 1e-6, rng)
    # correct HSV hue
    h6 = np.where(
        mx == r, ((g - b) / safe) % 6,
        np.where(mx == g, ((b - r) / safe) + 2, ((r - g) / safe) + 4),
    )
    hue = (h6 * 60) % 360
    sat = np.where(mx > 0, rng / np.where(mx == 0, 1, mx), 0)

    # keep cream face + warm eye/nose glow unshifted
    h_img, w_img = arr.shape[:2]
    s = w_img / float(SRC_W)
    cx, cy = 575.0 * s, 450.0 * s
    rx, ry = 330.0 * s, 255.0 * s
    yy, xx = np.ogrid[:h_img, :w_img]
    face = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1.0

    # only red-dominant saturated body pixels (protect cream face & gold)
    red_mask = (
        (a > 100)
        & (sat > 0.40)
        & (mx == r)
        & ((hue > 330) | (hue < 25))
        & (mx > 0.15)
        & ~face
    )
    idx = np.where(red_mask)
    if len(idx[0]) == 0:
        return out

    h0 = hue[idx] / 360.0
    s0 = sat[idx]
    v0 = mx[idx]
    delta = hue_deg / 360.0
    h1 = (h0 + delta) % 1.0

    i = np.floor(h1 * 6).astype(int) % 6
    f = h1 * 6 - np.floor(h1 * 6)
    p = v0 * (1 - s0)
    q = v0 * (1 - f * s0)
    t = v0 * (1 - (1 - f) * s0)
    v = v0
    r1 = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [v, q, p, p, t, v])
    g1 = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [t, v, v, q, p, p])
    b1 = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [p, p, t, v, v, q])

    out[idx[0], idx[1], 0] = np.clip(r1 * 255, 0, 255).astype(np.uint8)
    out[idx[0], idx[1], 1] = np.clip(g1 * 255, 0, 255).astype(np.uint8)
    out[idx[0], idx[1], 2] = np.clip(b1 * 255, 0, 255).astype(np.uint8)
    return out


def draw_eyes(arr, state, to_target):
    """state 0/1/2. to_target scales original coords -> target image coords."""
    img = Image.fromarray(arr, 'RGBA')
    ss = 4
    big = img.resize((img.width * ss, img.height * ss), Image.LANCZOS)
    d = ImageDraw.Draw(big)

    lx = int(LEFT_EYE[0] * to_target * ss)
    ly = int(LEFT_EYE[1] * to_target * ss)
    rx = int(RIGHT_EYE[0] * to_target * ss)
    ry = int(RIGHT_EYE[1] * to_target * ss)
    rb = max(4, int(R_BLACK * to_target * ss))
    ro = max(6, int(R_OUTER * to_target * ss))
    cream = (254, 248, 226, 255)
    black = (22, 18, 14, 255)
    gold = (245, 200, 66, 255)

    if state == 0:
        d.ellipse([rx - ro - 3, ry - ro - 3, rx + ro + 3, ry + ro + 3], fill=cream)
    elif state == 2:
        d.ellipse([lx - ro, ly - ro, lx + ro, ly + ro], fill=cream)
        d.ellipse([lx - rb, ly - rb, lx + rb, ly + rb], fill=black)
        d.ellipse([lx - ro + 3, ly - ro + 3, lx + ro - 3, ly + ro - 3],
                  outline=gold, width=max(4, int(6 * to_target * ss)))

    big = big.resize(img.size, Image.LANCZOS)
    return np.array(big)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    img = Image.open(SRC).convert('RGBA')
    arr = np.array(img)
    print('source', arr.shape)

    print('removing background...')
    arr = remove_background(arr)

    bbox = find_kanji_bbox(arr)
    print('kanji bbox', bbox)
    arr = erase_kanji(arr, bbox)

    scale = TARGET_W / SRC_W
    im = Image.fromarray(arr)
    im = im.resize((TARGET_W, int(round(arr.shape[0] * scale))), Image.LANCZOS)
    base = np.array(im)
    print('resized', base.shape)

    thumbs = []
    for cname, hue in COLORS.items():
        cdir = os.path.join(OUT_DIR, cname)
        os.makedirs(cdir, exist_ok=True)
        colored = shift_red_hue(base, hue)
        for state in (0, 1, 2):
            out = draw_eyes(colored, state, scale)
            path = os.path.join(cdir, f'eyes-{state}.png')
            Image.fromarray(out).save(path, optimize=True)
            print('saved', path)
            if cname == 'shu':
                thumbs.append(Image.open(path))

    strip = Image.new('RGBA',
                      (sum(t.width for t in thumbs), max(t.height for t in thumbs)),
                      (30, 24, 20, 255))
    x = 0
    for t in thumbs:
        strip.paste(t, (x, 0), t)
        x += t.width
    strip.thumbnail((1400, 480))
    strip.save(PREV)
    print('preview', PREV)


if __name__ == '__main__':
    main()
