# The time lapse film: Toronto's harbour and downtown from 1800 to 2025, seen from one fixed place in the air and
# drawn as a blue-ink sketch on old paper.
#
#   blender -b --factory-startup -P tools/blender/timelapse.py -- <moments.json> <lines.json> <frames folder>
#           [--years 1800 1900 2025]   test pictures for those years (named y1800.jpg ...), and one of the closing plan
#           [--from 0 --to 1920]       render that run of frames (so a stopped render can be picked up where it stopped)
#           [--encode film.mp4]        join the finished frames into the film
#
# <moments.json> is written by tools/blender/export-moments.js (ground, shores, buildings), <lines.json> by
# tools/blender/export-timelapse.js (roads, railways, subway).
#
# WHAT RESTS ON THE RECORD
#   The ground and the shore of 1802, the shore of 1834 and today's shore; today's building footprints and heights;
#   today's main roads, railways and subway tracks; the years of the landmarks in LANDMARKS; the first railway
#   (1853); the storm that cut the peninsula into islands (1858); the years the subway lines opened.
# WHAT IS A MODEL, NOT A RECORD (the page says so too)
#   The year any ordinary building appears. The data has no construction dates, so each building is given a year
#   from how far it stands from the first town, how tall it is, and the dates the city's edge reached that distance.
#   The small houses of the 1800s (none survive in the data): where each stands and when it is pulled down.
#   How fast the forest was cut, the year each piece of made land was filled between 1834 and today, the year each
#   road appears. The subway is underground and is drawn on the surface, in red, the way a plan would mark it.
import bpy, bmesh, json, math, os, sys
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def flag(name, default=None, many=False):
    if name not in argv: return default
    i = argv.index(name) + 1; vals = []
    while i < len(argv) and not argv[i].startswith('--'): vals.append(argv[i]); i += 1
    return vals if many else (vals[0] if vals else True)
DATA, LINES, OUT = argv[0], argv[1], argv[2]
FPS, RUN, END = 24, 1728, 192            # 72 seconds for 1800 to 2025, then 8 seconds rising to a plan
Y0, Y1 = 1800.0, 2025.0
W, H = 960, 540
os.makedirs(OUT, exist_ok=True)

# ---------- joining the frames into the film ----------
if flag('--encode'):
    bpy.ops.wm.read_factory_settings(use_empty=True); scene = bpy.context.scene
    names = sorted(n for n in os.listdir(OUT) if n.startswith('f') and n.endswith('.jpg'))
    se = scene.sequence_editor_create(); strips = se.strips if hasattr(se, 'strips') else se.sequences
    st = strips.new_image('film', os.path.join(OUT, names[0]), 1, 1)
    for n in names[1:]: st.elements.append(n)
    scene.frame_start, scene.frame_end, scene.render.fps = 1, len(names), FPS
    scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = W, H, 100
    scene.view_settings.view_transform = 'Standard'
    try: scene.render.image_settings.media_type = 'VIDEO'
    except Exception: pass
    scene.render.image_settings.file_format = 'FFMPEG'; scene.render.ffmpeg.format = 'MPEG4'; scene.render.ffmpeg.codec = 'H264'; scene.render.ffmpeg.constant_rate_factor = 'LOW'; scene.render.ffmpeg.gopsize = 48
    scene.render.filepath = flag('--encode'); bpy.ops.render.render(animation=True); print('film', scene.render.filepath, len(names), 'frames'); sys.exit(0)

D = json.load(open(DATA)); L = json.load(open(LINES)); F, STEP, NX, NY = D['F'], D['step'], D['nx'], D['ny']
rng = np.random.default_rng(1834)
grid = lambda m, k, t: np.array(D[m][k], dtype=t).reshape(NY, NX)
kF, kC, kT = grid('first', 'kind', np.uint8), grid('city', 'kind', np.uint8), grid('today', 'kind', np.uint8)
landF, landC, landT = kF != 1, kC != 1, kT == 0
zF = np.where(landF, np.maximum(grid('first', 'z', np.float32) / 10, 0.6), -3.0); zT = np.where(landT, np.maximum(grid('today', 'z', np.float32) / 10, 0.6), -3.0)
gx = F['x0'] + np.arange(NX) * STEP; gy = F['y0'] + np.arange(NY) * STEP
GX, GY = np.meshgrid(gx, gy)
cell = lambda x, y: (np.clip(np.round((np.asarray(y) - F['y0']) / STEP).astype(int), 0, NY - 1), np.clip(np.round((np.asarray(x) - F['x0']) / STEP).astype(int), 0, NX - 1))
ingrid = lambda x, y: (np.asarray(x) >= F['x0']) & (np.asarray(x) <= F['x1']) & (np.asarray(y) >= F['y0']) & (np.asarray(y) <= F['y1'])

def steps_from(mask, limit=400):   # how many cells each cell is from the nearest marked one
    d = np.where(mask, 0, 9999).astype(np.int32); cur = mask.copy()
    for k in range(1, limit):
        grow = cur.copy(); grow[1:] |= cur[:-1]; grow[:-1] |= cur[1:]; grow[:, 1:] |= cur[:, :-1]; grow[:, :-1] |= cur[:, 1:]
        new = grow & ~cur
        if not new.any(): break
        d[new] = k; cur = grow
    return d

# The year each piece of ground becomes land (0: it always was) and the year it is lost to the water (9999: never).
# Recorded: land in 1802, in 1834, today. Between 1834 and today the filling is spread outward from the 1834 shore.
dC = steps_from(landF | landC).astype(np.float32); made = landT & ~landF
far = max(1.0, float(dC[made].max())) if made.any() else 1.0
FILL = np.zeros((NY, NX), dtype=np.float32)
FILL[made & landC] = 1812 + 20 * rng.random(int((made & landC).sum()))
late = made & ~landC; FILL[late] = 1855 + 112 * (dC[late] / far) ** 0.75
LOSS = np.where(landF & ~landT, 1858.0, 9999.0).astype(np.float32)   # the storm of 1858 that cut the peninsula through

# How far the built-up city reached from the first town, by year (a model fitted to the population counts and the
# annexations: 10 blocks in 1800, the 1834 limits, then outward with the streetcar).
TOWN = (685.0, 1714.0)                                              # King and Frederick streets, the middle of the first ten blocks
REACH_R = np.array([0, 220, 380, 850, 1350, 1750, 2350, 2950, 3600, 4600, 5900, 9000, 14000], dtype=np.float32)
REACH_Y = np.array([1797, 1800, 1815, 1834, 1850, 1861, 1881, 1891, 1901, 1911, 1921, 1951, 1975], dtype=np.float32)
dist = lambda x, y: np.hypot(np.asarray(x) - TOWN[0], np.asarray(y) - TOWN[1])
reach = lambda d: np.interp(d, REACH_R, REACH_Y)
def ground_at(x, y, year=None):   # height of today's ground there (1 m where the film has no ground data)
    j, i = cell(x, y); return np.where(ingrid(x, y), np.where(landT[j, i], zT[j, i], zF[j, i]), 1.0)
def fill_at(x, y):
    j, i = cell(x, y); return np.where(ingrid(x, y), FILL[j, i], 0.0)
def wet_at(x, y):
    j, i = cell(x, y); return ingrid(x, y) & ~landT[j, i] & ~landF[j, i]

# Landmarks whose year is known. (lat, lon, year): the building standing there today takes that year.
ORIGIN = (43.635, -79.378); MX, MY = 80567.9, 110574.0
# The fourth number is roughly how tall it is, in metres, so the right building is picked where several stand close.
LANDMARKS = [(43.6503, -79.3722, 1850, 25, 'St Lawrence Hall'), (43.6504, -79.3740, 1853, 92, 'St James Cathedral'), (43.6484, -79.3743, 1892, 20, 'Gooderham Building'),
             (43.6525, -79.3817, 1899, 100, 'Old City Hall'), (43.6453, -79.3806, 1927, 30, 'Union Station'), (43.6459, -79.3816, 1929, 124, 'Royal York Hotel'),
             (43.6483, -79.3787, 1931, 145, 'Bank of Commerce'), (43.6479, -79.3797, 1972, 239, 'Commerce Court West'), (43.6534, -79.3841, 1965, 99, 'City Hall'),
             (43.6475, -79.3813, 1967, 223, 'Toronto-Dominion Centre'), (43.6488, -79.3817, 1975, 298, 'First Canadian Place'), (43.6495, -79.3797, 1988, 275, 'Scotia Plaza'),
             (43.6414, -79.3894, 1989, 86, 'SkyDome'), (43.6435, -79.3791, 1999, 55, 'Air Canada Centre')]
CN = ((-79.3871 - ORIGIN[1]) * MX, (43.6426 - ORIGIN[0]) * MY)      # the CN Tower: built 1973 to 1976, 553 m

bpy.ops.wm.read_factory_settings(use_empty=True); scene = bpy.context.scene
def add(name, verts, faces, colour):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update(); ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); ob.color = colour; return ob
# each kind of thing is rendered in its own tint so the pen can tell them apart: water blue, trees green, anything built yellow, the subway red
WATER, LAND, WALL, TREE, ROAD, RAIL, RED = (0.50, 0.66, 0.90, 1), (0.93, 0.93, 0.93, 1), (1.0, 0.9, 0.62, 1), (0.50, 0.78, 0.42, 1), (0.74, 0.74, 0.74, 1), (0.30, 0.30, 0.30, 1), (1.0, 0.05, 0.05, 1)

# ---------- ground and water ----------
idx = np.arange(NY * NX).reshape(NY, NX)
ground = add('ground', np.stack([GX, GY, zF], axis=-1).reshape(-1, 3).tolist(), np.stack([idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]], axis=-1).reshape(-1, 4).tolist(), LAND)
ground.data.polygons.foreach_set('use_smooth', [True] * len(ground.data.polygons))
gco = np.stack([GX, GY, zF], axis=-1).reshape(-1, 3).astype(np.float32)
add('lake', [(-90000, -90000, 0), (90000, -90000, 0), (90000, F['y1'] - 20, 0), (-90000, F['y1'] - 20, 0)], [(0, 1, 2, 3)], WATER)
add('north', [(-90000, F['y1'] - 30, 1.2), (90000, F['y1'] - 30, 1.2), (90000, 90000, 1.2), (-90000, 90000, 1.2)], [(0, 1, 2, 3)], LAND)   # the country going on to the north
def ground_z(year):
    up = np.where(landF, np.where(year < LOSS, zF, -3.0), np.where(landT & (year >= FILL), -3.0 + (zT + 3.0) * np.clip((year - FILL) / 3.0, 0, 1), -3.0))
    return np.where(landF & landT & (year > 1900), zT, up)       # by 1900 the old ground has been graded to today's

# ---------- the forest ----------
ts = 36.0; tx, ty = np.meshgrid(np.arange(F['x0'] + ts / 2, F['x1'], ts), np.arange(F['y0'] + ts / 2, F['y1'], ts)); tx = (tx + (rng.random(tx.shape) - 0.5) * ts).ravel(); ty = (ty + (rng.random(ty.shape) - 0.5) * ts).ravel()
j, i = cell(tx, ty); keep = landF[j, i] & (zF[j, i] > 1.0) & (kF[j, i] == 0); tx, ty, tz = tx[keep], ty[keep], zF[j, i][keep]
td = dist(tx, ty); t_cut = reach(td) - 8 + rng.random(len(tx)) * 12; t_cut[td < 260] = 1793 + rng.random(int((td < 260).sum())) * 6
stay = rng.random(len(tx)) < np.where(ty < 250, 0.5, 0.045); t_cut[stay] = 9999; jj, ii = cell(tx, ty); t_cut = np.minimum(t_cut, LOSS[jj, ii])
def tree_shape(name, sort, h):
    bm = bmesh.new()
    if sort == 'pine':
        for base, r, hh in ((0.12, 0.34, 0.45), (0.42, 0.24, 0.4), (0.68, 0.14, 0.34)): g = bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=r * h * 0.5, radius2=0, depth=hh * h)['verts']; bmesh.ops.translate(bm, verts=g, vec=(0, 0, (base + hh / 2) * h))
    else:
        g = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=h * 0.36)['verts']; bmesh.ops.scale(bm, verts=g, vec=(1, 1, 1.15)); bmesh.ops.translate(bm, verts=g, vec=(0, 0, h * 0.6))
        g = bmesh.ops.create_cone(bm, cap_ends=False, segments=5, radius1=h * 0.04, radius2=h * 0.03, depth=h * 0.4)['verts']; bmesh.ops.translate(bm, verts=g, vec=(0, 0, h * 0.2))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); ob.color = TREE; return ob
kinds = [tree_shape('oak', 'leaf', 30), tree_shape('maple', 'leaf', 25), tree_shape('pine', 'pine', 38)]
lot = rng.integers(0, len(kinds), len(tx)); stands = []
for k, tr in enumerate(kinds):
    sel = lot == k; pts = np.stack([tx[sel], ty[sel], tz[sel]], axis=-1).astype(np.float32); me = bpy.data.meshes.new('stand%d' % k); me.from_pydata(pts.tolist(), [], []); holder = bpy.data.objects.new(me.name, me); scene.collection.objects.link(holder); tr.parent = holder; holder.instance_type = 'VERTS'; stands.append((me, pts, t_cut[sel]))

# ---------- today's buildings, each given a year ----------
B = D['buildings']; bh = np.array([b[1] for b in B], dtype=np.float32); cen = np.array([[np.mean(b[2][0::2]), np.mean(b[2][1::2])] for b in B], dtype=np.float32)
bd = dist(cen[:, 0], cen[:, 1]); r1, r2 = rng.random(len(B)), rng.random(len(B)); base = reach(bd)
by = np.where(bh <= 12, np.clip(base + 4 + r1 * 55, 1845, 1995),
     np.where(bh <= 35, np.clip(np.maximum(base, 1880) + r1 * 75, 1880, 2015),
     np.where(bh <= 90, np.where(r2 < 0.14, 1924 + r1 * 10, np.where(r2 < 0.26, 1954 + r1 * 12, 1966 + r1 * 57)), 1967 + 57 * r1 ** 0.6)))
by = np.where(bh > 180, np.maximum(by, 1972), by); by = np.maximum(by, fill_at(cen[:, 0], cen[:, 1]) + 4)
for lat, lon, yr, tall, name in LANDMARKS:
    x, y = (lon - ORIGIN[1]) * MX, (lat - ORIGIN[0]) * MY; off = np.hypot(cen[:, 0] - x, cen[:, 1] - y); near = np.where(off < 130)[0]
    if len(near): k = near[np.argmin(np.abs(bh[near] - tall) + off[near] * 0.25)]; by[k] = yr; print('landmark', name, yr, 'height', float(bh[k]), 'expected', tall, 'off', int(off[k]))
    else: print('landmark NOT FOUND', name)
verts, faces, v_base, v_rel, v_year = [], [], [], [], []
for b, yr, (cx, cy) in zip(B, by, cen):
    p = np.array(b[2], dtype=np.float32).reshape(-1, 2)
    if len(p) > 3 and np.allclose(p[0], p[-1]): p = p[:-1]
    n = len(p)
    if n < 3: continue
    g = float(ground_at(cx, cy)); o = len(verts)
    for x, y in p: verts.append((float(x), float(y), g)); v_base.append(g); v_rel.append(0.0); v_year.append(yr)
    for x, y in p: verts.append((float(x), float(y), g + b[1])); v_base.append(g); v_rel.append(b[1]); v_year.append(yr)
    for k in range(n): faces.append((o + k, o + (k + 1) % n, o + n + (k + 1) % n, o + n + k))
    faces.append(tuple(range(o + n, o + 2 * n)))
city = add('city', verts, faces, WALL); c_co = np.array(verts, dtype=np.float32); c_base, c_rel, c_year = np.array(v_base, dtype=np.float32), np.array(v_rel, dtype=np.float32), np.array(v_year, dtype=np.float32)
print('buildings', len(B), 'years', int(by.min()), 'to', int(by.max()))
# the year the building standing on each cell today went up (0: no building there today)
BUILT = np.zeros((NY, NX), dtype=np.float32)
for b, yr in zip(B, by):
    xs, ys = b[2][0::2], b[2][1::2]; j0, i0 = cell(min(xs), min(ys)); j1, i1 = cell(max(xs), max(ys)); BUILT[j0:j1 + 1, i0:i1 + 1] = yr
BOX = (min(c[0] for c in cen), max(c[0] for c in cen), min(c[1] for c in cen), max(c[1] for c in cen))   # the part of the city the building data covers

# ---------- the houses of the 1800s: a model, none of them is in the data ----------
A = math.radians(16.7); ux, uy, vx, vy = math.cos(A), math.sin(A), -math.sin(A), math.cos(A)       # the way Toronto's street grid is turned
us, vs = np.meshgrid(np.arange(-7000, 7000, 19.0), np.arange(-2600, 6400, 27.0)); us, vs = us.ravel(), vs.ravel()
ok = ((us % 112) > 17) & ((vs % 92) > 15) & (rng.random(len(us)) < 0.8); us, vs = us[ok], vs[ok]
hx, hy = TOWN[0] + us * ux + vs * vx, TOWN[1] + us * uy + vs * vy; hd = dist(hx, hy)
ok = ingrid(hx, hy) & (hd < 5600); hx, hy, hd = hx[ok], hy[ok], hd[ok]; j, i = cell(hx, hy); ok = (landF[j, i] | landT[j, i]); hx, hy, hd = hx[ok], hy[ok], hd[ok]
h_year = np.maximum(reach(hd) + rng.random(len(hx)) * 26 - 2, fill_at(hx, hy) + 3); j, i = cell(hx, hy)
inbox = (hx > BOX[0]) & (hx < BOX[1]) & (hy > BOX[2]) & (hy < BOX[3]); built_here = BUILT[j, i]
h_gone = np.where(inbox, np.where(built_here > 0, built_here - 1, 1948 + rng.random(len(hx)) * 34), 9999.0); h_gone = np.minimum(h_gone, LOSS[j, i])
ok = (h_year < 1938) & (h_gone > h_year + 12); hx, hy, h_year, h_gone = hx[ok], hy[ok], h_year[ok], h_gone[ok]
verts, faces, v_base, v_rel, v_year, v_gone = [], [], [], [], [], []
hz = ground_at(hx, hy)
for x, y, g, yr, gone in zip(hx, hy, hz, h_year, h_gone):
    wide, deep = rng.uniform(10, 15), rng.uniform(9, 13); tall = (rng.uniform(3.5, 6.5) + max(0.0, yr - 1840) * 0.05) * 1.5; roof = tall + rng.uniform(3, 5)   # half as tall again as life, so a house can be seen from the air; o = len(verts)
    if rng.random() < 0.5: ax, ay, bx, by_ = ux, uy, vx, vy
    else: ax, ay, bx, by_ = vx, vy, ux, uy
    for zz in (0.0, tall):
        for su, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1)): verts.append((x + su * wide / 2 * ax + sv * deep / 2 * bx, y + su * wide / 2 * ay + sv * deep / 2 * by_, g)); v_base.append(g); v_rel.append(zz); v_year.append(yr); v_gone.append(gone)
    for su in (-1, 1): verts.append((x + su * wide / 2 * ax, y + su * wide / 2 * ay, g)); v_base.append(g); v_rel.append(roof); v_year.append(yr); v_gone.append(gone)
    faces += [(o, o + 1, o + 5, o + 4), (o + 2, o + 3, o + 7, o + 6), (o + 1, o + 2, o + 6, o + 9, o + 5), (o + 3, o, o + 4, o + 8, o + 7), (o + 4, o + 5, o + 9, o + 8), (o + 6, o + 7, o + 8, o + 9)]
old = add('houses', verts, faces, WALL); o_co = np.array(verts, dtype=np.float32); o_base, o_rel, o_year, o_gone = (np.array(a, dtype=np.float32) for a in (v_base, v_rel, v_year, v_gone))
print('houses of the 1800s', len(hx))

# ---------- roads, railways, subway: flat ribbons, each stretch with the year it appears ----------
def ribbons(name, items, colour, lift):
    verts, faces, yrs, zs = [], [], [], []
    for line, width, year_of in items:
        p = np.array(line, dtype=np.float32)
        for a, b in zip(p[:-1], p[1:]):
            d = b - a; n = float(np.hypot(*d))
            if n < 1: continue
            nx_, ny_ = -d[1] / n * width / 2, d[0] / n * width / 2; mid = (a + b) / 2; g = float(ground_at(mid[0], mid[1])) + lift; yr = float(year_of(mid)); o = len(verts)
            for q in ((a[0] + nx_, a[1] + ny_), (b[0] + nx_, b[1] + ny_), (b[0] - nx_, b[1] - ny_), (a[0] - nx_, a[1] - ny_)): verts.append((float(q[0]), float(q[1]), g)); yrs.append(yr); zs.append(g)
            faces.append((o, o + 1, o + 2, o + 3))
    ob = add(name, verts, faces, colour); return ob, np.array(verts, dtype=np.float32), np.array(zs, dtype=np.float32), np.array(yrs, dtype=np.float32)
def road_year(r):
    n = r['name']
    if r['cls'] == 'motorway': return lambda m: 1962.0 if 'Gardiner' in n else 1964.0 if 'Don Valley' in n else 1960.0
    return lambda m: max(float(reach(dist(m[0], m[1]))) - 5, float(fill_at(m[0], m[1])) + 2, 1797.0)
roads = ribbons('roads', [(r['line'], 26 if r['cls'] == 'motorway' else 17 if r['cls'] in ('primary', 'trunk') else 13, road_year(r)) for r in L['roads']], ROAD, 0.5)
rails = ribbons('rail', [(l, 15, lambda m: max(1853.0 + (abs(m[0]) % 5), float(fill_at(m[0], m[1])) + 1)) for l in L['rail']], RAIL, 0.9)
def sub_year(s):
    if s['ref'] == '1': return lambda m: 1954.0 if m[0] > -420 and m[1] < 6600 else 1963.0 if m[1] < 4200 else 1978.0   # Yonge 1954, University 1963, Spadina 1978
    return lambda m: 1966.0                                                                                              # Bloor-Danforth
subs = ribbons('subway', [(s['line'], 16, sub_year(s)) for s in L['subway'] if s['ref'] in ('1', '2')], RED, 2.5)

# the CN Tower, built 1973 to 1976
bm = bmesh.new(); g = bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=34, radius2=6, depth=553)['verts']; bmesh.ops.translate(bm, verts=g, vec=(0, 0, 276.5))
g = bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=30, radius2=36, depth=40)['verts']; bmesh.ops.translate(bm, verts=g, vec=(0, 0, 345))
me = bpy.data.meshes.new('cn'); bm.to_mesh(me); bm.free(); cn = bpy.data.objects.new('cn', me); scene.collection.objects.link(cn); cn.color = WALL; cn_g = float(ground_at(CN[0], CN[1]))

# ---------- camera, light, the plain render ----------
cam = bpy.data.objects.new('camera', bpy.data.cameras.new('camera')); scene.collection.objects.link(cam); scene.camera = cam; cam.data.lens = 38; cam.data.clip_start = 300; cam.data.clip_end = 60000
VIEW = (Vector((-1250, -3150, 1350)), Vector((-150, 1150, 60)))     # from over the lake, south-west of the islands, looking across them to the town
PLAN = (Vector((-200, 700, 6400)), Vector((-200, 900, 0)))          # straight down on the middle of the city, like a plan on a drawing board
def place(f):
    t = 0.0 if f <= RUN else min(1.0, (f - RUN) / (END * 0.85)); t = t * t * (3 - 2 * t)
    at = VIEW[0].lerp(PLAN[0], t); look = VIEW[1].lerp(PLAN[1], t); cam.location = at; cam.rotation_euler = (look - at).to_track_quat('-Z', 'Y').to_euler()
scene.render.engine = 'BLENDER_WORKBENCH'; scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = W, H, 100
sh = scene.display.shading; sh.light = 'STUDIO'; sh.color_type = 'OBJECT'; sh.show_shadows = True; sh.shadow_intensity = 0.5; sh.show_cavity = False; sh.show_object_outline = False   # no cavity or outline: both read the depth of the picture, which is too coarse from this far off and comes out in stripes
try: sh.show_specular_highlight = False
except Exception: pass
scene.display.light_direction = Vector((0.55, -0.25, 0.8)).normalized(); scene.display.render_aa = 'FXAA'; scene.view_settings.view_transform = 'Standard'
world = bpy.data.worlds.new('paper'); world.color = (0.93, 0.93, 0.93); scene.world = world
scene.render.image_settings.file_format = 'PNG'; RAW = os.path.join(OUT, '_raw.png')

def set_year(year):
    g = gco.copy(); g[:, 2] = ground_z(year).ravel(); ground.data.vertices.foreach_set('co', g.ravel()); ground.data.update()
    for me, pts, cut in stands:
        p = pts.copy(); p[cut <= year, 2] = -900; me.vertices.foreach_set('co', p.ravel()); me.update()
    for ob, co, base_, rel, yrs, gone in ((city, c_co, c_base, c_rel, c_year, None), (old, o_co, o_base, o_rel, o_year, o_gone)):
        s = np.clip((year - yrs) / 1.6, 0, 1)
        if gone is not None: s = np.where(year >= gone, 0, s)
        c = co.copy(); c[:, 2] = np.where(s > 0, base_ + rel * s, -80.0); ob.data.vertices.foreach_set('co', c.ravel()); ob.data.update()
    for ob, co, zs, yrs in (roads, rails, subs):
        c = co.copy(); c[:, 2] = np.where(year >= yrs, zs, -70.0); ob.data.vertices.foreach_set('co', c.ravel()); ob.data.update()
    s = min(1.0, max(0.0, (year - 1973) / 3.0)); cn.location = (CN[0], CN[1], cn_g if s > 0 else -2000); cn.scale = (1, 1, max(s, 0.001))

# ---------- the pen: turning the plain render into ink on paper ----------
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32); prng = np.random.default_rng(7)
def soft(a, n):
    for _ in range(n): a = (a + np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1)) / 5
    return a
wob = soft(prng.random((H, W)).astype(np.float32), 6) * 10
HATCH1 = (((xx + yy + wob) % 6) < 1.15).astype(np.float32); HATCH2 = (((xx - 0.6 * yy + wob) % 7) < 1.1).astype(np.float32); HATCH3 = (((xx + 0.35 * yy + wob * 2) % 5) < 1.0).astype(np.float32)
row = (yy // 7).astype(np.int32); shift = prng.integers(0, 40, H // 7 + 2)[row]; WAVES = (((yy % 7) < 1) & (((xx + shift) % 31) < 12)).astype(np.float32)
PAPER = np.array([0.93, 0.87, 0.71], dtype=np.float32) * (0.9 + 0.2 * soft(prng.random((H, W)).astype(np.float32), 10)[..., None])
PAPER = PAPER * (1 - 0.2 * (((xx / W - 0.5) * 2) ** 2 + ((yy / H - 0.5) * 2) ** 2))[..., None]
for cx_, cy_, r_ in ((0.07, 0.86, 0.085), (0.94, 0.14, 0.055)):
    d_ = np.hypot((xx / W - cx_) * W / H, yy / H - cy_); ring = np.exp(-((d_ - r_) / 0.006) ** 2) * 0.3 + (d_ < r_) * 0.05; PAPER = PAPER * (1 - ring[..., None] * np.array([0.45, 0.6, 0.85], dtype=np.float32))
RULE = np.zeros((H, W), dtype=np.float32)                               # the draughtsman's setting-out lines, ruled in red
for k in range(6):
    x0, y0, a_ = prng.uniform(0, W), prng.uniform(0, H), prng.uniform(-0.45, 0.45); t_ = np.arange(-W, W); xs_ = (x0 + t_).astype(int); ys_ = (y0 + a_ * t_).astype(int); ok_ = (xs_ >= 0) & (xs_ < W) & (ys_ >= 0) & (ys_ < H); RULE[ys_[ok_], xs_[ok_]] = prng.uniform(0.18, 0.4)
for c_ in prng.integers(40, W - 40, 3): RULE[:, c_] = prng.uniform(0.12, 0.26)
EDGEFADE = np.clip(np.minimum(np.minimum(xx, W - 1 - xx) / 70, np.minimum(yy, H - 1 - yy) / 55), 0, 1) ** 0.8   # the drawing trails off toward the edge of the sheet
BLUE, CRIMSON, WASH = np.array([0.08, 0.14, 0.46], dtype=np.float32), np.array([0.78, 0.13, 0.12], dtype=np.float32), np.array([0.62, 0.74, 0.86], dtype=np.float32)
out_img = bpy.data.images.new('ink', W, H, alpha=False)
REF = [None]   # how bright plain open ground comes out of the render: measured once, on the first picture, so the pen presses the same in every frame
def ink(dest):
    img = bpy.data.images.load(RAW, check_existing=False); px = np.empty(W * H * 4, dtype=np.float32); img.pixels.foreach_get(px); bpy.data.images.remove(img); px = px.reshape(H, W, 4)
    r, g, b = px[..., 0], px[..., 1], px[..., 2]; lum = 0.3 * r + 0.59 * g + 0.11 * b
    if REF[0] is None: REF[0] = float(np.percentile(lum[(np.abs(b - r) < 0.02) & (np.abs(g - b) < 0.02)], 90)); print('open ground reads', REF[0])
    if dest is None: return
    water = np.clip((b - r) * 14 - 0.5, 0, 1); red = np.clip((r - g) * 8 - 0.8, 0, 1); green = np.clip((g - r) * 10 - 0.5, 0, 1) * (1 - red); built = np.clip((r - b) * 9 - 0.5, 0, 1) * (1 - red)
    gx_ = np.roll(lum, -1, 1) - np.roll(lum, 1, 1); gy_ = np.roll(lum, -1, 0) - np.roll(lum, 1, 0); tint = b - r; sat = (np.roll(tint, -1, 1) - np.roll(tint, 1, 1)) ** 2 + (np.roll(tint, -1, 0) - np.roll(tint, 1, 0)) ** 2
    edge = np.clip((np.hypot(gx_, gy_) + np.sqrt(sat) * 2.2) * 5.0 - 0.16, 0, 1) * (1 - red)
    dark = np.clip(1 - lum / REF[0], 0, 1) * (1 - water) * (1 - red) * (1 - green * 0.6)
    shade = HATCH1 * np.clip((dark - 0.16) * 5, 0, 1) + HATCH2 * np.clip((dark - 0.34) * 5, 0, 1) + HATCH3 * green * 0.45 + HATCH2 * built * 0.35
    a = np.clip(edge * 0.9 + shade * 0.62 + WAVES * water * 0.3, 0, 1) * EDGEFADE
    res = PAPER * (1 - RULE[..., None]) + CRIMSON * RULE[..., None]
    res = res * (1 - 0.16 * (water * EDGEFADE)[..., None]) + WASH * 0.16 * (water * EDGEFADE)[..., None]
    res = res * (1 - a[..., None]) + BLUE * a[..., None]
    rr = np.clip(red * 1.2, 0, 1) * EDGEFADE; res = res * (1 - rr[..., None]) + CRIMSON * rr[..., None]
    out_img.pixels.foreach_set(np.concatenate([np.clip(res, 0, 1), np.ones((H, W, 1), dtype=np.float32)], axis=-1).astype(np.float32).ravel())
    out_img.filepath_raw = dest; out_img.file_format = 'JPEG'; out_img.save(quality=90)

import time
CLOCK = [0.0, 0.0, 0.0]
def shoot(year, f, dest):
    t = time.time(); set_year(year); place(f); t1 = time.time(); scene.render.filepath = RAW; bpy.ops.render.render(write_still=True); t2 = time.time(); ink(dest); CLOCK[0] += t1 - t; CLOCK[1] += t2 - t1; CLOCK[2] += time.time() - t2
shoot(Y1, RUN + END, None); CLOCK[:] = [0.0, 0.0, 0.0]   # the plan of today's city is mostly open ground and roofs: the measure for REF

if flag('--years'):
    for y in flag('--years', many=True): shoot(float(y), 0, os.path.join(OUT, 'y%s.jpg' % y)); print('test', y)
    shoot(Y1, RUN + END, os.path.join(OUT, 'plan.jpg'))
    print('seconds: moving the model %.1f, rendering %.1f, inking %.1f' % tuple(CLOCK))
else:
    a, b = int(flag('--from', 0)), int(flag('--to', RUN + END)); t0 = time.time()
    for f in range(a, b + 1):
        dest = os.path.join(OUT, 'f%04d.jpg' % f)
        if os.path.exists(dest): continue
        shoot(Y0 + (Y1 - Y0) * min(1.0, f / RUN), f, dest)
        if f % 24 == 0: print('frame', f, 'of', b, round(time.time() - t0), 's', flush=True)
    print('frames done')
