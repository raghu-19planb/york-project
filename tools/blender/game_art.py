# The pictures for Next Stop, Toronto, made in Blender. The game slides them past each other; nothing is drawn live.
#
#   blender -b --factory-startup -P tools/blender/game_art.py -- <out folder> <job> [--scale 100] [--samples 48] [--paint 3] [--only 2]
#
#   job "shore":  the north shore of the lake from 1690 to 1861 as one long picture, in four pieces side by side.
#                 It is a diorama seen square-on from the lake, tipped down a little so the water shows.
#   job "canoe":  the canoe and its three paddlers, eight moments of one stroke, on a clear ground.
#   job "props":  the rock and the drifting log.
#   job "street": the north side of a street from 1861 to 1892, in two pieces (see the note above build_street).
#   job "horsecar": the horsecar and its horse, eight moments of one stride.   job "goods": the barrel and the crate.
#   job "town":   the same street from 1892 to 1954, in three pieces (see the note above build_town).
#   job "streetcar": the electric streetcar, six pictures (the last with a spark at the wire).
#   job "metro":  the street from 1954 to today with the open cut in front, in three pieces (see build_metro).
#   job "subway": the subway car, red and silver.   job "works": the cone and the barrier.
#
# WHERE THINGS STAND. The game's clock is distance, and the shore slides at 0.35 of the canoe's speed, so a year is
# 5.37 m of shore and a thing dated to a year stands where the canoe passes it in that year (year_x below).
#
# WHAT IS SOURCED: only that six things existed by their year, as scenery.js records with its sources: the garrison
# (1793), Worts's windmill (1833), Montgomery's Tavern (1837), gas lamps (1841), St. Lawrence Hall (1850), the first
# train (1853) and University College (1859). They did not all stand on the waterfront; the game lines the city's
# history up along one shore, as it always has.
# WHAT IS DRAWING: everything else. The shape and colour of every building, including those six; the ordinary cabins,
# houses, churches, wharves and ships and where they stand; every tree; the light and the weather. The forest is
# unbroken to the water until the garrison, then cleared in stages: an impression of a town growing, not a survey.
import bpy, bmesh, math, os, sys, random
import numpy as np
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
FLAGS = {'--scale': 100, '--samples': 48, '--paint': 0, '--only': -1}
for k in FLAGS:
    if k in argv: FLAGS[k] = int(argv[argv.index(k) + 1])
plain = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or argv[i - 1] not in FLAGS)]
OUT, JOB = plain[0], plain[1]
random.seed(5)

PITCH = math.radians(10)                      # how far the view is tipped down
SUN = Vector((0.7, 0.62, -0.32)).normalized()  # the way the light travels: from the south-west, behind the viewer's left shoulder
year_x = lambda y: (y - 1690) * 92 * 0.35 / 6 + 196 / 6   # metres along the shore where the canoe is in a given year

def rgb(hexcode, a=1.0):
    v = [int(hexcode[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple((c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4) for c in v) + (a,)
def blend(c1, c2, k):
    a, b = [int(c1[i:i + 2], 16) for i in (1, 3, 5)], [int(c2[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join('%02x' % round(a[i] * (1 - k) + b[i] * k) for i in range(3))

MATS = {}
def mat(colour, rough=0.85, vary=0.0, emit=0.0, sub=0.0):
    key = (colour, rough, vary, emit, sub)
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new(colour); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes.get('Principled BSDF'); b.inputs['Base Color'].default_value = rgb(colour); b.inputs['Roughness'].default_value = rough
    if vary:
        info = nt.nodes.new('ShaderNodeObjectInfo'); hsv = nt.nodes.new('ShaderNodeHueSaturation'); span = nt.nodes.new('ShaderNodeMapRange')
        span.inputs['To Min'].default_value = 1 - vary; span.inputs['To Max'].default_value = 1 + vary
        nt.links.new(info.outputs['Random'], span.inputs['Value']); nt.links.new(span.outputs['Result'], hsv.inputs['Value']); hsv.inputs['Color'].default_value = rgb(colour); nt.links.new(hsv.outputs['Color'], b.inputs['Base Color'])
    if emit:
        for k in ('Emission Color', 'Emission'):
            if k in b.inputs: b.inputs[k].default_value = rgb(colour); break
        b.inputs['Emission Strength'].default_value = emit
    if sub and 'Subsurface Weight' in b.inputs: b.inputs['Subsurface Weight'].default_value = sub
    MATS[key] = m; return m

class Make:
    """One object built from simple solids, each in its own colour."""
    def __init__(s, name): s.bm = bmesh.new(); s.slots = []; s.name = name
    def paint(s, verts, colour, rough=0.85, **kw):
        m = mat(colour, rough, **kw)
        if m not in s.slots: s.slots.append(m)
        i = s.slots.index(m)
        for f in {f for v in verts for f in v.link_faces}: f.material_index = i
        return verts
    def box(s, at, size, colour, turn=0.0, **kw):          # at is the middle of the base
        g = bmesh.ops.create_cube(s.bm, size=1.0)['verts']
        bmesh.ops.scale(s.bm, verts=g, vec=size); bmesh.ops.translate(s.bm, verts=g, vec=(0, 0, size[2] / 2))
        if turn: bmesh.ops.rotate(s.bm, verts=g, cent=(0, 0, 0), matrix=Matrix.Rotation(turn, 3, 'Z'))
        bmesh.ops.translate(s.bm, verts=g, vec=at); return s.paint(g, colour, **kw)
    def cyl(s, at, r, h, colour, r2=None, seg=14, **kw):   # upright, standing on at
        g = bmesh.ops.create_cone(s.bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)['verts']
        bmesh.ops.translate(s.bm, verts=g, vec=(at[0], at[1], at[2] + h / 2)); return s.paint(g, colour, **kw)
    def rod(s, a, b, r, colour, seg=8, **kw):              # a round bar from a to b
        a, b = Vector(a), Vector(b); d = b - a
        g = bmesh.ops.create_cone(s.bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=d.length)['verts']
        bmesh.ops.rotate(s.bm, verts=g, cent=(0, 0, 0), matrix=d.to_track_quat('Z', 'Y').to_matrix()); bmesh.ops.translate(s.bm, verts=g, vec=(a + b) / 2); return s.paint(g, colour, **kw)
    def ball(s, at, r, colour, scale=(1, 1, 1), seg=16, **kw):
        g = bmesh.ops.create_uvsphere(s.bm, u_segments=seg, v_segments=max(6, seg // 2), radius=r)['verts']
        bmesh.ops.scale(s.bm, verts=g, vec=scale); bmesh.ops.translate(s.bm, verts=g, vec=at); return s.paint(g, colour, **kw)
    def gable(s, at, w, d, h, colour, over=0.35, along='x', **kw):   # a pitched roof on a w by d rectangle; the ridge runs along x or y
        w2, d2 = w / 2 + over, d / 2 + over
        if along == 'x': pts = [(-w2, -d2, 0), (w2, -d2, 0), (w2, d2, 0), (-w2, d2, 0), (-w2, 0, h), (w2, 0, h)]; faces = [(0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)]
        else: pts = [(-w2, -d2, 0), (w2, -d2, 0), (w2, d2, 0), (-w2, d2, 0), (0, -d2, h), (0, d2, h)]; faces = [(1, 2, 5, 4), (3, 0, 4, 5), (0, 1, 4), (2, 3, 5), (0, 3, 2, 1)]
        vs = [s.bm.verts.new((at[0] + p[0], at[1] + p[1], at[2] + p[2])) for p in pts]
        for f in faces: s.bm.faces.new([vs[i] for i in f])
        return s.paint(vs, colour, **kw)
    def hip(s, at, w, d, h, colour, over=0.35, **kw):      # a roof sloping on all four sides
        g = bmesh.ops.create_cone(s.bm, cap_ends=True, segments=4, radius1=math.sqrt(2) / 2, radius2=0.12, depth=1)['verts']
        bmesh.ops.rotate(s.bm, verts=g, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 4, 3, 'Z')); bmesh.ops.scale(s.bm, verts=g, vec=(w + 2 * over, d + 2 * over, h))
        bmesh.ops.translate(s.bm, verts=g, vec=(at[0], at[1], at[2] + h / 2)); return s.paint(g, colour, **kw)
    def windows(s, x0, x1, y, z, n, w, h, colour='#2f3a44', frame='#efe8d8'):   # a row of n windows on a south wall at depth y
        for i in range(n):
            x = x0 + (x1 - x0) * (i + 0.5) / n
            s.box((x, y - 0.03, z - 0.06), (w + 0.2, 0.06, h + 0.16), frame); s.box((x, y - 0.06, z), (w, 0.06, h), colour, rough=0.25)
    def clump(s, at, r, colour, squash=0.8, **kw):          # a rough handful of leaves
        g = bmesh.ops.create_icosphere(s.bm, subdivisions=2, radius=r)['verts']
        for v in g: v.co *= random.uniform(0.72, 1.28); v.co.z *= squash
        bmesh.ops.translate(s.bm, verts=g, vec=at); return s.paint(g, colour, **kw)
    def done(s, at=(0, 0, 0), turn=0.0, smooth=False, parent=None):
        s.bm.normal_update(); me = bpy.data.meshes.new(s.name); s.bm.to_mesh(me); s.bm.free()
        for m in s.slots: me.materials.append(m)
        me.polygons.foreach_set('use_smooth', [smooth] * len(me.polygons))
        o = bpy.data.objects.new(s.name, me); bpy.context.collection.objects.link(o); o.location = at; o.rotation_euler = (0, 0, turn)
        if parent: o.parent = parent
        return o

def stage(width_m, height_m, centre, res, clear=False):
    """An empty scene with the light and a square-on camera whose picture is width_m by height_m, centred on centre."""
    scene = bpy.context.scene
    world = bpy.data.worlds.new('air'); scene.world = world; world.use_nodes = True
    bg = world.node_tree.nodes.get('Background'); bg.inputs['Color'].default_value = rgb('#cfe0f0'); bg.inputs['Strength'].default_value = 1.0
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); scene.collection.objects.link(sun)
    sun.data.energy = 5.5; sun.data.angle = math.radians(5); sun.data.color = (1.0, 0.86, 0.68); sun.rotation_euler = SUN.to_track_quat('-Z', 'Y').to_euler()
    cam = bpy.data.objects.new('camera', bpy.data.cameras.new('camera')); scene.collection.objects.link(cam); scene.camera = cam
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = max(width_m, height_m * res[0] / res[1]); cam.data.clip_start = 1; cam.data.clip_end = 2000
    look = Vector((0, math.cos(PITCH), -math.sin(PITCH))); cam.location = Vector(centre) - look * 400; cam.rotation_euler = look.to_track_quat('-Z', 'Y').to_euler()
    scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = FLAGS['--samples']; scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = res[0], res[1], FLAGS['--scale']
    scene.render.film_transparent = clear; scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA' if clear else 'RGB'
    scene.view_settings.exposure = 0.3
    for name in ('AgX - Medium High Contrast', 'Medium High Contrast'):
        try: scene.view_settings.look = name; break
        except Exception: pass
    return scene, cam

def painted(path, r, out=None):   # the painted finish: each small patch takes the colour of its calmest corner
    img = bpy.data.images.load(path); w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(px); a = px.reshape(h, w, 4); cols = a[..., :3].astype(np.float64); alpha = a[..., 3]
    if alpha.min() < 0.99:        # a picture with a clear ground: spread the colours outward first, so the edges do not pick up black
        known = alpha > 0.5
        for _ in range(r * 3):
            p = np.pad(cols * known[..., None], ((1, 1), (1, 1), (0, 0))); k = np.pad(known.astype(np.float64), 1)
            ssum = sum(p[1 + dy:h + 1 + dy, 1 + dx:w + 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1)); cnt = sum(k[1 + dy:h + 1 + dy, 1 + dx:w + 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1))
            fill = (~known) & (cnt > 0); cols[fill] = ssum[fill] / cnt[fill][:, None]; known = known | fill
    lum = cols.mean(axis=2); pad = r + 1
    def window(v, dy0, dy1, dx0, dx1):
        p = np.pad(v, ((pad, pad), (pad, pad)) + ((0, 0),) * (v.ndim - 2), mode='edge'); I = p.cumsum(0).cumsum(1); ys, xs = np.arange(h) + pad, np.arange(w) + pad
        return (I[ys + dy1][:, xs + dx1] - I[ys + dy0 - 1][:, xs + dx1] - I[ys + dy1][:, xs + dx0 - 1] + I[ys + dy0 - 1][:, xs + dx0 - 1]) / ((dy1 - dy0 + 1) * (dx1 - dx0 + 1))
    best = calm = None
    for q in ((-r, 0, -r, 0), (-r, 0, 0, r), (0, r, -r, 0), (0, r, 0, r)):
        mean = window(cols, *q); var = window(lum * lum, *q) - window(lum, *q) ** 2
        if best is None: best, calm = mean, var
        else: pick = var < calm; best = np.where(pick[..., None], mean, best); calm = np.where(pick, var, calm)
    a[..., :3] = best.astype(np.float32); img.pixels.foreach_set(a.ravel()); out = out or path
    img.filepath_raw = out; img.file_format = 'JPEG' if out.endswith('.jpg') else 'PNG'; img.save(); bpy.data.images.remove(img); return out

# =====================================================================================================================
# trees
# =====================================================================================================================
def broadleaf(name, h, green):
    t = Make(name); t.cyl((0, 0, 0), h * 0.03, h * 0.55, '#5a4333', r2=h * 0.016, seg=7)
    for k in range(26):
        ang = random.uniform(0, math.tau); z = random.uniform(0.4, 1.0); r = random.uniform(0.0, 0.34) * h * (1.25 - z)
        lit = (math.cos(ang) < -0.1 or z > 0.8) and random.random() < 0.75
        t.clump((math.cos(ang) * r, math.sin(ang) * r, z * h), random.uniform(0.09, 0.17) * h, blend(green, '#e6d27a', 0.36) if lit else green if random.random() < 0.6 else blend(green, '#1f3320', 0.45), rough=0.95, vary=0.14)
    return t.done()
def pine(name, h, green):
    t = Make(name); t.cyl((0, 0, 0), h * 0.02, h * 0.97, '#4a3628', r2=h * 0.005, seg=7)
    for k in range(12):
        z = h * (0.26 + 0.7 * k / 12); reach = h * (0.2 * (1 - k / 12) ** 0.75 + 0.025)
        for b in range(random.randint(4, 6)):
            ang = random.uniform(0, math.tau); r = reach * random.uniform(0.55, 1.1)
            t.clump((math.cos(ang) * r * 0.55, math.sin(ang) * r * 0.55, z - r * 0.12), r * 0.48, blend(green, '#c9c06a', 0.22) if math.cos(ang) < 0 and random.random() < 0.7 else blend(green, '#12241b', 0.4), squash=0.36, rough=0.95, vary=0.12)
    return t.done()
def forest(points):
    kinds = [broadleaf('oak', 21, '#55783a'), broadleaf('maple', 18, '#6d8c3c'), broadleaf('beech', 24, '#4a6e34'), broadleaf('ash', 16, '#7e9544'), pine('pine', 33, '#33553a'), pine('pine2', 27, '#3c5e3c'), pine('hemlock', 21, '#2d4d3a')]
    lots = [[] for _ in kinds]
    for p in points: lots[random.choice((0, 0, 1, 1, 2, 3, 4, 4, 5, 6))].append(p)
    for k, t in enumerate(kinds):
        me = bpy.data.meshes.new('stand%d' % k); me.from_pydata(lots[k], [], []); holder = bpy.data.objects.new(me.name, me); bpy.context.collection.objects.link(holder); t.parent = holder; holder.instance_type = 'VERTS'

# =====================================================================================================================
# buildings (all drawing; see the note at the top)
# =====================================================================================================================
SHINGLE, SLATE, STONE = '#5b4a3c', '#474b55', '#b9b2a3'
def cabin(x, y, turn=0.0):
    b = Make('cabin'); w, d, h = random.uniform(5.5, 7), 4.6, 2.5
    b.box((0, 0, 0), (w, d, h), '#7c5c3e')
    for i in range(6): b.box((0, -d / 2 - 0.02, 0.2 + i * 0.4), (w + 0.3, 0.08, 0.07), '#4f3826')     # the gaps between the logs
    b.gable((0, 0, h), w, d, 1.7, SHINGLE); b.box((w / 2 - 0.6, 0.6, h), (0.9, 0.9, 2.6), '#8f8779')
    b.box((-w * 0.2, -d / 2 - 0.05, 0), (0.9, 0.08, 1.8), '#3f2b1e'); b.windows(0.3, w / 2 - 0.3, -d / 2, 1.0, 1, 0.7, 0.8)
    return b.done((x, y, 0.4 + y * 0.02), turn)
def frame_house(x, y, turn=0.0, storeys=2, colour=None, w=None):
    b = Make('frame'); w = w or random.uniform(7, 10); d = 6.5; h = 2.9 * storeys; colour = colour or random.choice(['#ece5d2', '#d9b872', '#a9b6b8', '#9c5040', '#c9c0a8', '#7f8f84'])
    b.box((0, 0, 0), (w, d, h), colour)
    for i in range(int(h / 0.45)): b.box((0, -d / 2 - 0.01, 0.2 + i * 0.45), (w, 0.03, 0.03), blend(colour, '#000000', 0.25))   # clapboards
    b.gable((0, 0, h), w, d, 2.4, SHINGLE if random.random() < 0.6 else SLATE); b.box((w * 0.3, 0, h + 0.8), (0.8, 0.8, 2.6), '#8a5a48')
    n = max(2, int(w / 2.6))
    for s in range(storeys): b.windows(-w / 2 + 0.5, w / 2 - 0.5, -d / 2, 0.9 + s * 2.9, n, 0.85, 1.35)
    b.box((0, -d / 2 - 0.05, 0), (1.0, 0.1, 2.0), '#3a2c22')
    return b.done((x, y, 0.4 + y * 0.02), turn)
def brick_house(x, y, turn=0.0, storeys=2, w=None, colour=None, shop=False):
    b = Make('brick'); w = w or random.uniform(8, 13); d = 8; h = 3.3 * storeys; colour = colour or random.choice(['#9c5a44', '#a8684a', '#8d4f3d', '#c7a274', '#b4795a'])
    b.box((0, 0, 0), (w, d, h), colour); b.box((0, -d / 2 - 0.02, h - 0.3), (w + 0.3, 0.2, 0.35), STONE)    # a stone cornice
    if shop: b.box((0, 0, h), (w + 0.2, d + 0.2, 0.5), blend(colour, '#3a2c22', 0.4))
    else: (b.hip if random.random() < 0.4 else b.gable)((0, 0, h), w, d, 2.6, SLATE)
    for cx in (-w / 2 + 0.7, w / 2 - 0.7): b.box((cx, 0, h + (0.4 if shop else 1.2)), (0.9, 1.2, 2.2), blend(colour, '#3a2c22', 0.25))
    n = max(3, int(w / 2.4))
    for s in range(storeys):
        z = 1.0 + s * 3.3
        if shop and s == 0: b.windows(-w / 2 + 0.4, w / 2 - 0.4, -d / 2, 0.6, max(2, n - 1), 1.9, 2.1)
        else: b.windows(-w / 2 + 0.6, w / 2 - 0.6, -d / 2, z, n, 0.9, 1.6)
    if not shop: b.box((0, -d / 2 - 0.05, 0), (1.1, 0.1, 2.2), '#2f241c'); b.box((0, -d / 2 - 0.06, 2.2), (1.5, 0.12, 0.25), STONE)
    return b.done((x, y, 0.4 + y * 0.02), turn)
def church(x, y, turn=0.0, stone=False):
    b = Make('church'); c = '#cfc6b2' if stone else '#ece5d2'
    b.box((0, 0, 0), (9, 16, 7), c); b.gable((0, 0, 7), 9, 16, 4.5, SLATE, along='y')
    b.box((0, -9, 0), (4.4, 4.4, 15), c); b.cyl((0, -9, 15), 2.6, 11, '#4f5560' if stone else '#6a7a72', r2=0.1, seg=8)
    b.box((0, -11.25, 0), (1.5, 0.1, 2.8), '#3a2c22')
    for z in (5, 10.5): b.windows(-0.8, 0.8, -11.2, z, 1, 0.9, 2.2)
    return b.done((x, y, 0.4 + y * 0.02), turn)
def wharf(x, length=26, w=7):
    b = Make('wharf'); b.box((0, -length / 2 + 2, 0.9), (w, length, 0.35), '#8f7858')
    for yy in range(0, int(length), 4):
        for xx in (-w / 2 + 0.4, w / 2 - 0.4): b.cyl((xx, 1.5 - yy, -1.2), 0.22, 2.3, '#5a4632', seg=7)
    for i in range(3): b.cyl((random.uniform(-2, 2), -random.uniform(3, length - 5), 1.25), 0.45, 0.9, '#7a5a3c', seg=10)   # barrels
    return b.done((x, 0, 0))
def schooner(x, y, turn=0.0):
    b = Make('schooner'); L = 20
    g = b.ball((0, 0, 0.6), 1.0, '#3d3229', scale=(L / 2, 2.4, 2.0), seg=24)
    for v in g: v.co.z = min(v.co.z, 1.5)
    b.box((0, 0, 1.4), (L * 0.8, 3.6, 0.2), '#a58b63'); b.rod((L / 2 - 1, 0, 1.6), (L / 2 + 5, 0, 3.0), 0.12, '#6a5238')
    for mx, mh in ((3.5, 17), (-4, 19)):
        b.cyl((mx, 0, 1.4), 0.2, mh, '#6a5238', r2=0.1, seg=8); b.rod((mx, 0, 3.2), (mx - 7, 0, 3.6), 0.1, '#6a5238'); b.rod((mx, 0, mh * 0.72), (mx - 5.5, 0, mh * 0.86), 0.09, '#6a5238')
        vs = [b.bm.verts.new(p) for p in ((mx - 0.2, 0.05, 3.5), (mx - 6.8, 0.3, 3.8), (mx - 5.3, 0.3, mh * 0.85), (mx - 0.2, 0.05, mh * 0.72))]; b.bm.faces.new(vs); b.paint(vs, '#efe6cf', rough=0.95)
    vs = [b.bm.verts.new(p) for p in ((4.0, 0.05, 15.5), (L / 2 + 4.6, 0.2, 3.1), (4.2, 0.05, 4.0))]; b.bm.faces.new(vs); b.paint(vs, '#efe6cf', rough=0.95)
    return b.done((x, y, 0), turn, smooth=True)
def steamer(x, y):
    b = Make('steamer'); L = 30
    g = b.ball((0, 0, 0.6), 1.0, '#2f2a26', scale=(L / 2, 3.2, 2.0), seg=24)
    for v in g: v.co.z = min(v.co.z, 1.6)
    b.box((0, 0, 1.5), (L * 0.7, 5, 2.6), '#efe8d8'); b.windows(-L * 0.33, L * 0.33, -2.5, 2.3, 9, 0.9, 1.0); b.box((0, 0, 4.1), (L * 0.6, 4.4, 0.25), '#8f7858')
    b.cyl((1, 0, 4.3), 0.75, 6.5, '#26221f', seg=12); b.cyl((1, 0, 9.6), 0.8, 0.9, '#a8352b', seg=12)
    b.cyl((-1, -3.3, -1.2), 3.2, 1.0, '#7a2f28', seg=16)   # the paddle box, seen edge-on
    for v in b.bm.verts: pass
    return b.done((x, y, 0), 0, smooth=True)
def lamp(x, y):
    b = Make('lamp'); b.cyl((0, 0, 0), 0.09, 3.4, '#2b2b2b', seg=8); b.box((0, 0, 3.4), (0.45, 0.45, 0.6), '#f6d98a', emit=2.5); b.hip((0, 0, 4.0), 0.5, 0.5, 0.3, '#2b2b2b', over=0.05)
    return b.done((x, y, 0.4 + y * 0.02))
def stumps(x0, x1, y0, y1, n):
    b = Make('stumps')
    for i in range(n): px, py = random.uniform(x0, x1), random.uniform(y0, y1); b.cyl((px, py, 0.4 + py * 0.02), random.uniform(0.3, 0.55), random.uniform(0.5, 0.9), '#6f563c', seg=8)
    return b.done()
def fence(x0, x1, y):
    b = Make('fence'); n = int((x1 - x0) / 2.4)
    for i in range(n + 1): b.box((x0 + i * 2.4, y, 0.4 + y * 0.02), (0.14, 0.14, 1.2), '#8a7556')
    for z in (0.5, 0.95): b.box(((x0 + x1) / 2, y, 0.4 + y * 0.02 + z), (x1 - x0, 0.08, 0.1), '#8a7556')
    return b.done()

# ---- the six dated things ----
def garrison(x):   # 1793. A palisade, a blockhouse with its upper floor jutting out, a barrack, a flag.
    b = Make('garrison'); log = '#735840'
    for i in range(56):
        px = -27 + i; b.cyl((px, -1, 0), 0.24, random.uniform(3.4, 3.9), blend(log, '#3a2c1f', random.uniform(0, 0.3)), r2=0.06, seg=6)
    b.box((-12, 9, 0), (8.5, 8.5, 3.6), log); b.box((-12, 9, 3.6), (10.2, 10.2, 3.2), blend(log, '#3a2c1f', 0.15)); b.hip((-12, 9, 6.8), 10.2, 10.2, 3.4, SHINGLE)
    b.windows(-15, -9, 3.9, 4.8, 3, 0.5, 0.35, colour='#1c1a18', frame=log)
    b.box((9, 12, 0), (20, 6.5, 3.4), log); b.gable((9, 12, 3.4), 20, 6.5, 2.2, SHINGLE); b.windows(1, 17, 8.75, 1.2, 6, 0.8, 1.1)
    for cx in (3, 15): b.box((cx, 12, 4.2), (1.0, 1.0, 2.4), '#8f8779')
    b.cyl((1, 4, 0), 0.14, 15, '#d9d2c2', seg=8); b.box((2.5, 4, 12.6), (3.0, 0.06, 1.9), '#a8352b'); b.box((1.8, 3.96, 13.55), (1.4, 0.06, 0.95), '#2f3f6a')
    return b.done((x, 5, 0.5))
def windmill(x):   # 1833. A tall round brick tower, a cap, four sails.
    b = Make('windmill'); b.cyl((0, 0, 0), 4.2, 19, '#a86a50', r2=2.9, seg=20); b.cyl((0, 0, 19), 3.1, 2.4, '#4a4640', r2=0.6, seg=20)
    for z in (4, 9, 14): b.windows(-0.5, 0.5, -3.9 + z * 0.065, z, 1, 0.7, 1.1)
    hub = Vector((0, -3.3, 19.6)); b.rod(hub, hub + Vector((0, 1.5, 0)), 0.3, '#3a332c')
    for k in range(4):
        a = math.radians(28 + 90 * k); d = Vector((math.cos(a), 0, math.sin(a))); n = Vector((-math.sin(a), 0, math.cos(a)))
        b.rod(hub, hub + d * 11.5, 0.13, '#5a4632'); vs = [b.bm.verts.new(hub + d * 2 + n * 0.1 + Vector((0, -0.05, 0))), b.bm.verts.new(hub + d * 11.3 + n * 0.1 + Vector((0, -0.05, 0))), b.bm.verts.new(hub + d * 11.3 + n * 2.1 + Vector((0, -0.05, 0))), b.bm.verts.new(hub + d * 2 + n * 2.1 + Vector((0, -0.05, 0)))]
        b.bm.faces.new(vs); b.paint(vs, '#e9dfc4', rough=0.95)
    b.box((7.5, 2, 0), (9, 7, 4.2), '#a86a50'); b.gable((7.5, 2, 4.2), 9, 7, 2.2, SLATE)
    return b.done((x, 14, 0.7), smooth=False)
def tavern(x):     # 1837. A two-storey frame inn with a long verandah and a sign on a post.
    b = Make('tavern'); w, d, h = 17, 8, 6.2; c = '#e3d9bf'
    b.box((0, 0, 0), (w, d, h), c); b.gable((0, 0, h), w, d, 3.0, SHINGLE)
    for s in range(2): b.windows(-w / 2 + 0.6, w / 2 - 0.6, -d / 2, 1.0 + s * 3.0, 7, 0.9, 1.5)
    b.box((0, -d / 2 - 1.4, 2.9), (w + 0.6, 2.8, 0.18), SHINGLE)
    for i in range(8): b.box((-w / 2 + 0.3 + i * (w - 0.6) / 7, -d / 2 - 2.6, 0), (0.18, 0.18, 2.9), '#efe8d8')
    for cx in (-6, 6): b.box((cx, 0, h + 0.8), (1.0, 1.0, 2.8), '#8a5a48')
    b.box((0, -d / 2 - 0.05, 0), (1.2, 0.1, 2.2), '#3a2c22')
    b.cyl((w / 2 + 3, -d / 2 - 3, 0), 0.12, 4.6, '#5a4632', seg=8); b.box((w / 2 + 3, -d / 2 - 3, 3.3), (1.8, 0.1, 1.1), '#2f4a3a')
    return b.done((x, 24, 0.9), math.radians(-6))
def st_lawrence_hall(x):   # 1850. Three storeys of pale stone, a pedimented centre on columns, a domed cupola.
    b = Make('hall'); st = '#d9cfb6'; w, d, h = 30, 14, 14
    b.box((0, 0, 0), (w, d, h), st); b.box((0, -d / 2 - 0.1, h - 0.5), (w + 0.6, 0.5, 0.7), '#efe8d6'); b.hip((0, 0, h), w, d, 2.2, SLATE, over=0.2)
    b.box((0, -d / 2 - 0.6, 0), (11, 1.2, h), '#e6dcc2')
    vs = [b.bm.verts.new(p) for p in ((-5.9, -d / 2 - 1.25, h), (5.9, -d / 2 - 1.25, h), (0, -d / 2 - 1.25, h + 3.2))]; b.bm.faces.new(vs); b.paint(vs, '#efe8d6')
    for i in range(4): b.cyl((-4.2 + i * 2.8, -d / 2 - 1.5, 4.6), 0.42, 9.2, '#f1ead9', seg=12)
    for s, z in enumerate((0.9, 5.4, 9.9)):
        for x0, x1, n in ((-w / 2 + 0.8, -6.2, 4), (6.2, w / 2 - 0.8, 4)): b.windows(x0, x1, -d / 2, z, n, 1.1, 2.7 if s < 2 else 2.0)
    b.windows(-4.6, 4.6, -d / 2 - 1.2, 0.6, 3, 1.7, 3.2, colour='#2a2622')
    b.cyl((0, 0, h + 2.0), 2.6, 3.4, '#e6dcc2', seg=12); b.ball((0, 0, h + 5.4), 2.7, '#5f6f6a', scale=(1, 1, 1.05), seg=18); b.cyl((0, 0, h + 8.0), 0.5, 1.6, '#e6dcc2', seg=8); b.cyl((0, 0, h + 9.6), 0.08, 2.0, '#3a332c', seg=6)
    return b.done((x, 34, 1.1), math.radians(4))
def university_college(x):  # 1859. Long, low and round-arched in grey-buff stone, a square tower over the door.
    b = Make('college'); st = '#bfae8c'; w, d, h = 46, 11, 9
    b.box((0, 0, 0), (w, d, h), st); b.gable((0, 0, h), w, d, 4.2, SLATE)
    b.box((0, -d / 2 - 1, 0), (8, 8, 22), blend(st, '#8a7a5c', 0.15)); b.hip((0, -d / 2 - 1, 22), 8, 8, 5, SLATE, over=0.1)
    for sx in (-1, 1): b.box((sx * (w / 2 - 3), -d / 2 - 0.6, 0), (6.5, 7, 12), st); b.hip((sx * (w / 2 - 3), -d / 2 - 0.6, 12), 6.5, 7, 3.6, SLATE)
    for z in (1.2, 5.2):
        for x0, x1 in ((-w / 2 + 7, -5), (5, w / 2 - 7)): b.windows(x0, x1, -d / 2, z, 6, 1.0, 2.5, colour='#2a2a30', frame='#d9ccb0')
    b.windows(-1.4, 1.4, -d / 2 - 5, 0.3, 1, 2.2, 4.2, colour='#1f1c1a', frame='#d9ccb0')
    for z in (9, 15): b.windows(-2.2, 2.2, -d / 2 - 5, z, 2, 1.0, 2.8, colour='#2a2a30', frame='#d9ccb0')
    return b.done((x, 62, 1.6), math.radians(-3))
def train(x):   # 1853. A small wood-burning engine with a wide stack, a tender and two cars, on an embankment at the water.
    b = Make('train'); blk = '#26262a'
    b.box((6, 0, 0), (50, 3.2, 0.6), '#8a7a62'); b.box((6, -1.0, 0.6), (50, 0.12, 0.14), '#3a3632')
    b.cyl((0, 0, 1.9), 0.9, 0.0001, blk)   # (placeholder kept tiny; the boiler is the bar below)
    b.rod((-2.6, 0, 2.3), (2.6, 0, 2.3), 0.95, blk, seg=16); b.box((3.4, 0, 0.9), (2.6, 2.6, 3.4), '#7a2f28'); b.box((3.4, 0, 4.3), (3.0, 2.9, 0.18), blk)
    b.cyl((-1.9, 0, 3.1), 0.28, 1.2, blk, seg=10); b.cyl((-1.9, 0, 4.3), 0.3, 0.9, blk, r2=0.75, seg=12); b.ball((0.4, 0, 3.3), 0.45, '#b89a4a', seg=12)
    for wx, r in ((-2.2, 0.55), (-1.0, 0.55), (1.0, 0.95), (2.9, 0.95)): b.rod((wx, -1.25, 0.7 + r), (wx, -1.05, 0.7 + r), r, '#7a2f28', seg=16)
    b.box((-3.3, 0, 0.9), (0.9, 2.2, 0.5), '#7a2f28')
    b.box((7.2, 0, 0.9), (4.2, 2.5, 2.0), blk)
    for i, c in enumerate(('#c9a24a', '#8a4a3a')):
        cx = 13.5 + i * 9.5; b.box((cx, 0, 1.0), (8.6, 2.7, 2.6), c); b.box((cx, 0, 3.6), (9.0, 2.9, 0.3), '#3a332c'); b.windows(cx - 3.9, cx + 3.9, -1.35, 1.9, 7, 0.7, 0.95)
        for wx in (-3, 3): b.rod((cx + wx, -1.3, 1.15), (cx + wx, -1.1, 1.15), 0.5, blk, seg=14)
    return b.done((x, 3.2, 0.3))

# =====================================================================================================================
# the shore, 1690 to 1861
# =====================================================================================================================
PPM, PIECE, HEIGHT = 8, 270.0, 90.0            # dots of picture per metre; metres across one piece and up it
def build_shore():
    total = 4 * PIECE
    # water
    lake = Make('lake'); lake.box((0, 0, -0.5), (1, 1, 0.5), '#1d4f66', rough=0.07); lk = lake.done()
    try:
        oc = lk.modifiers.new('waves', 'OCEAN'); oc.geometry_mode = 'GENERATE'; oc.resolution = 12; oc.spatial_size = 50; oc.repeat_x = 25; oc.repeat_y = 8
        oc.wave_scale = 0.2; oc.choppiness = 0.8; oc.wind_velocity = 7; oc.wave_alignment = 0.5; oc.random_seed = 3; lk.location = (-80, -390, 0)
    except Exception as err: print('no ocean modifier:', err); lk.scale = (3000, 900, 1); lk.location = (total / 2, -400, 0)
    # the ground: sand at the water, then grass, rising gently
    edge = lambda x: 3 * math.sin(x * 0.02) + 2 * math.sin(x * 0.057 + 1.3)
    bm = bmesh.new(); n = 300
    for i in range(n + 1):
        x = -90 + (total + 180) * i / n
        for dy, z in ((-14, -0.9), (-2, 0.02), (4, 0.45), (14, 0.7), (130, 3.0)): bm.verts.new((x, edge(x) + dy, z + random.uniform(-0.05, 0.05)))
    bm.verts.ensure_lookup_table()
    cleared = lambda x: x > year_x(1790)
    for i in range(n):
        x = -90 + (total + 180) * (i + 0.5) / n
        for k in range(4): bm.faces.new((bm.verts[i * 5 + k], bm.verts[(i + 1) * 5 + k], bm.verts[(i + 1) * 5 + k + 1], bm.verts[i * 5 + k + 1])).material_index = (0, 0, 1, 3 if cleared(x) else 2)[k]
    me = bpy.data.meshes.new('ground'); bm.to_mesh(me); bm.free()
    for c in ('#e2cf9c', '#86964c', '#4f5f32', '#9aa05a'): me.materials.append(mat(c, 0.95))
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons)); bpy.context.collection.objects.link(bpy.data.objects.new('ground', me))
    # the sky: a painted wall behind everything, warm at the horizon, and heaped clouds standing in front of it
    sky = Make('sky'); vs = [sky.bm.verts.new(p) for p in ((-200, 122, -30), (total + 200, 122, -30), (total + 200, 122, 60), (-200, 122, 60))]; sky.bm.faces.new(vs); so = sky.done()
    m = bpy.data.materials.new('sky'); m.use_nodes = True; nt = m.node_tree; nt.nodes.remove(nt.nodes.get('Principled BSDF')); em = nt.nodes.new('ShaderNodeEmission'); outn = nt.nodes.get('Material Output')
    geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); span = nt.nodes.new('ShaderNodeMapRange'); ramp = nt.nodes.new('ShaderNodeValToRGB')
    span.inputs['From Min'].default_value = -16; span.inputs['From Max'].default_value = 36
    e = ramp.color_ramp.elements; e[0].position = 0; e[0].color = rgb('#ffe2b4'); e[1].position = 1; e[1].color = rgb('#4f8ac8')
    for p, c in ((0.2, '#f3dcc0'), (0.42, '#bcd6ea'), (0.7, '#7fadd9')): ramp.color_ramp.elements.new(p).color = rgb(c)
    nt.links.new(geo.outputs['Position'], sep.inputs['Vector']); nt.links.new(sep.outputs['Z'], span.inputs['Value']); nt.links.new(span.outputs['Result'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs['Emission'], outn.inputs['Surface'])
    so.data.materials.append(m)
    lumps = bpy.data.textures.new('lumps', 'CLOUDS'); lumps.noise_scale = 0.5
    for k in range(13):
        c = Make('cloud'); w = random.uniform(1.0, 2.0)
        for j in range(random.randint(14, 24)):
            x = random.uniform(-1, 1) * w; tall = 1 - 0.6 * (abs(x) / w) ** 1.5; s = random.uniform(0.2, 0.42) * tall
            c.ball((x, random.uniform(-0.2, 0.2), random.uniform(0.1, 0.7) * tall * 0.7 + s * 0.4), s, '#fff3e2', scale=(1.25, 0.6, 0.85), seg=16, rough=1.0, sub=0.5)
        for v in c.bm.verts: v.co.z = max(v.co.z, 0.05)
        o = c.done((total * (k + random.uniform(-0.3, 0.3)) / 12, random.uniform(104, 118), random.uniform(14, 30)), smooth=True); size = random.uniform(11, 20); o.scale = (size, size, size * 0.75)
        dm = o.modifiers.new('lumps', 'DISPLACE'); dm.texture = lumps; dm.strength = 0.2
    # the forest: unbroken to the water until the garrison, then thinner and further back as the town grows
    pts = []
    for depth, step in ((5, 6), (13, 7), (24, 8), (38, 10), (55, 12), (74, 13), (92, 11), (108, 10)):
        x = -80.0
        while x < total + 80:
            town = max(0.0, min(1.0, (x - year_x(1788)) / (year_x(1861) - year_x(1788))))        # 0 before the town, 1 at the end
            keep = 1.0 if town == 0 or depth > 85 else max(0.0, (depth - 20 - 60 * town) / 40) * (1 - 0.5 * town)   # the woods beyond the town stay
            if random.random() < keep: pts.append((x + random.uniform(-2.5, 2.5), edge(x) + depth + random.uniform(-2.5, 2.5), 0.5 + depth * 0.02))
            x += step * random.uniform(0.55, 1.45)
    forest(pts)
    rocks = Make('rocks')
    for i in range(40): px = random.uniform(-60, year_x(1790)); rocks.ball((px, edge(px) + random.uniform(-3, 2), 0.1), random.uniform(0.4, 1.3), '#8f8a80', scale=(1.3, 1, 0.6), seg=8)
    rocks.done()

    # ---- the dated things, each where the canoe passes it in its year ----
    gx = year_x(1793); garrison(gx); stumps(gx - 45, gx + 40, 3, 30, 60)
    windmill(year_x(1833)); tavern(year_x(1837)); st_lawrence_hall(year_x(1850)); train(year_x(1853) + 4); university_college(year_x(1859))
    for i in range(7): lamp(year_x(1841) + i * 11, 6.5)
    # ---- the town between them: cabins first, then frame houses, then brick ----
    taken = [(gx - 32, gx + 34), (year_x(1833) - 8, year_x(1833) + 14), (year_x(1837) - 11, year_x(1837) + 13), (year_x(1850) - 17, year_x(1850) + 17), (year_x(1859) - 25, year_x(1859) + 25)]
    free = lambda x, w: all(x + w / 2 < a or x - w / 2 > b for a, b in taken)
    x = gx + 40
    while x < total + 40:
        yr = 1690 + (x - 196 / 6) / (92 * 0.35 / 6); turn = math.radians(random.uniform(-10, 10)); w = 10
        if free(x, 12):
            if yr < 1812: cabin(x, random.uniform(10, 22), turn); w = random.uniform(12, 20)
            elif yr < 1832: (cabin if random.random() < 0.25 else frame_house)(x, random.uniform(10, 20), turn); w = random.uniform(11, 16)
            elif yr < 1846: (frame_house if random.random() < 0.55 else brick_house)(x, random.uniform(10, 18), turn); w = random.uniform(10, 14)
            else: brick_house(x, random.uniform(10, 16), turn, storeys=random.choice((2, 3, 3)), shop=random.random() < 0.4); w = random.uniform(9.5, 12.5)
            if yr > 1815 and random.random() < 0.5:      # a second row behind, up the slope
                (frame_house if yr < 1840 else brick_house)(x + random.uniform(-3, 3), random.uniform(30, 44), math.radians(random.uniform(-8, 8)))
        x += w
    church(year_x(1808), 30, math.radians(5)); church(year_x(1844), 44, math.radians(-4), stone=True)
    for wx in (year_x(1803), year_x(1826), year_x(1846), year_x(1856) + 12): wharf(wx)
    schooner(year_x(1826) + 16, -22, math.radians(4)); schooner(year_x(1846) - 22, -30, math.radians(-3)); steamer(year_x(1856) + 40, -24)
    fence(gx + 44, gx + 110, 7); stumps(gx + 40, year_x(1830), 4, 40, 120)

def job_shore():
    bpy.ops.wm.read_factory_settings(use_empty=True); res = (int(PIECE * PPM), int(HEIGHT * PPM))
    up = Vector((0, math.sin(PITCH), math.cos(PITCH)))
    scene, cam = stage(PIECE, HEIGHT, (0, 0, 0), res); build_shore(); os.makedirs(OUT, exist_ok=True)
    for i in range(4):
        if FLAGS['--only'] >= 0 and i != FLAGS['--only']: continue
        # the water's edge sits 310/540 of the way down the picture, where the game puts the shore
        centre = Vector(((i + 0.5) * PIECE, 0, 0)) + up * ((310 / 540 - 0.5) * HEIGHT); look = Vector((0, math.cos(PITCH), -math.sin(PITCH))); cam.location = centre - look * 400
        path = os.path.join(OUT, 'shore-%d.png' % i); scene.render.filepath = path; bpy.ops.render.render(write_still=True); print('rendered', path)
        print('painted', painted(path, FLAGS['--paint'] or 3, path.replace('.png', '.jpg'))); os.remove(path)

# =====================================================================================================================
# the canoe and the props (clear ground, so the game can lay them over the water)
# =====================================================================================================================
def build_canoe(phase):
    canoe = bpy.data.objects.new('canoe', None); bpy.context.collection.objects.link(canoe)
    L, BEAM = 5.6, 0.46
    half = lambda u: BEAM * max(0.0, 1 - abs(u) ** 2.6) ** 0.75
    sheer = lambda u: 0.44 + 0.36 * abs(u) ** 3.2
    keel = lambda u: 0.02 + 4.5 * max(0.0, abs(u) - 0.8) ** 1.6
    bm = bmesh.new(); NU, NV = 56, 14; grid = []
    for i in range(NU + 1):
        u = -1 + 2 * i / NU; b, s, kz = half(u), sheer(u), min(keel(u), sheer(u) - 0.02)
        grid.append([bm.verts.new((u * L / 2, -b * math.cos(math.pi * j / NV), s - (s - kz) * math.sin(math.pi * j / NV) ** 0.55)) for j in range(NV + 1)])
    for i in range(NU):
        for j in range(NV): bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    me = bpy.data.meshes.new('hull'); bm.to_mesh(me); bm.free(); me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    bark = bpy.data.materials.new('bark'); bark.use_nodes = True; nt = bark.node_tree; bs = nt.nodes.get('Principled BSDF'); bs.inputs['Roughness'].default_value = 0.72
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); nz = nt.nodes.new('ShaderNodeTexNoise'); ramp = nt.nodes.new('ShaderNodeValToRGB'); mix = nt.nodes.new('ShaderNodeMixRGB')
    mp.inputs['Scale'].default_value = (0.45, 10, 10); nz.inputs['Scale'].default_value = 5.5; nz.inputs['Detail'].default_value = 6; ramp.color_ramp.elements[0].position = 0.5; ramp.color_ramp.elements[1].position = 0.68
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], mix.inputs['Fac'])
    mix.inputs['Color1'].default_value = rgb('#dcc592'); mix.inputs['Color2'].default_value = rgb('#8a6a42'); nt.links.new(mix.outputs['Color'], bs.inputs['Base Color'])
    me.materials.append(bark); hull = bpy.data.objects.new('hull', me); bpy.context.collection.objects.link(hull); hull.parent = canoe; hull.modifiers.new('thick', 'SOLIDIFY').thickness = 0.014
    t = Make('trim')
    for side in (-1, 1):
        for i in range(NU):
            u0, u1 = -1 + 2 * i / NU, -1 + 2 * (i + 1) / NU; t.rod((u0 * L / 2, side * half(u0), sheer(u0)), (u1 * L / 2, side * half(u1), sheer(u1)), 0.026, '#3f2b1e', seg=6)
    for u in (-0.55, -0.18, 0.18, 0.55): t.rod((u * L / 2, -half(u), sheer(u) - 0.03), (u * L / 2, half(u), sheer(u) - 0.03), 0.02, '#3f2b1e', seg=6)
    for u in (-0.74, -0.37, 0.0, 0.37, 0.74):
        for j in range(NV):
            t0, t1 = math.pi * j / NV, math.pi * (j + 1) / NV; b, s, kz = half(u) + 0.008, sheer(u), keel(u) - 0.006
            t.rod((u * L / 2, -b * math.cos(t0), s - (s - kz) * math.sin(t0) ** 0.55), (u * L / 2, -b * math.cos(t1), s - (s - kz) * math.sin(t1) ** 0.55), 0.008, '#3f2b1e', seg=5)
    t.done(smooth=True, parent=canoe)
    SKIN, HAIR = '#a06d48', '#15100c'
    for u, shirt, offset in ((0.48, '#ece4d0', 0.0), (-0.02, '#a8352b', 0.5), (-0.5, '#3f5f86', 1.0)):
        s = phase * math.tau - offset; reach = math.sin(s); lift = max(0.0, math.cos(s))   # reach: blade forward (+) or back (-); lift: the blade out of the water on its way forward
        x0 = u * L / 2; hip = Vector((x0, 0, 0.3)); lean = 0.2 + 0.2 * reach; up = Vector((math.sin(lean), 0, math.cos(lean))); chest = hip + up * 0.42; neck = hip + up * 0.6; head = neck + Vector((0.04, 0, 0.13))
        p = Make('paddler'); body = [p.ball(hip + up * 0.2, 0.185, shirt, scale=(0.9, 1.05, 1.5), rough=0.92), p.ball(chest, 0.2, shirt, scale=(0.95, 1.15, 1.0), rough=0.92)]
        for sy in (0.2, -0.2): p.ball(chest + Vector((0, sy, 0.08)), 0.09, shirt, rough=0.92)
        p.ball(hip + up * 0.06, 0.2, '#7a2f2a' if shirt != '#a8352b' else '#2f3f5a', scale=(1.0, 1.1, 0.5))
        for sy in (0.1, -0.1): p.rod(hip + Vector((0, sy, -0.02)), hip + Vector((0.36, sy * 1.2, -0.2)), 0.09, '#8a6a48', seg=10)
        p.ball(head, 0.1, SKIN, scale=(1.02, 0.88, 1.14), rough=0.55); p.ball(head + Vector((0.1, 0, -0.01)), 0.028, SKIN, rough=0.55); p.rod(neck - Vector((0, 0, 0.02)), head - Vector((0, 0, 0.06)), 0.048, SKIN)
        p.ball(head + Vector((-0.022, 0, 0.028)), 0.106, HAIR, scale=(1.0, 0.93, 1.06), rough=0.45); p.rod(head + Vector((-0.09, 0, 0)), neck + Vector((-0.1, 0, -0.2)), 0.035, HAIR)
        side = -1; top = Vector((x0 + 0.4 + 0.25 * reach, side * 0.16, 1.0 + 0.06 * lift)); blade = Vector((x0 + 0.5 + 0.62 * reach, side * 0.6, -0.26 + 0.42 * lift)); low = top + (blade - top) * 0.5
        for sh, hand in ((chest + Vector((0.02, side * 0.21, 0.09)), low), (chest + Vector((0.02, -side * 0.21, 0.09)), top)):
            elbow = (sh + hand) / 2 + Vector((-0.06, side * 0.03, -0.1)); p.rod(sh, elbow, 0.048, shirt, seg=10); p.rod(elbow, hand, 0.04, SKIN, seg=10); p.ball(hand, 0.044, SKIN)
        p.rod(top + (top - blade).normalized() * 0.07, blade, 0.017, '#b98a55'); tip = blade + (blade - top).normalized() * 0.55
        g = bmesh.ops.create_cone(p.bm, cap_ends=True, segments=12, radius1=0.09, radius2=0.03, depth=0.6)['verts']
        bmesh.ops.scale(p.bm, verts=g, vec=(1, 0.14, 1)); bmesh.ops.rotate(p.bm, verts=g, cent=(0, 0, 0), matrix=(tip - blade).to_track_quat('Z', 'Y').to_matrix()); bmesh.ops.translate(p.bm, verts=g, vec=(blade + tip) / 2); p.paint(g, '#b98a55')
        p.done(smooth=True, parent=canoe)
    return canoe

def sheet(paths, out):   # several pictures of one size, side by side in one
    imgs = []
    for p in paths:
        img = bpy.data.images.load(p); w, h = img.size; px = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(px); imgs.append(px.reshape(h, w, 4)); bpy.data.images.remove(img); os.remove(p)
    row = np.concatenate(imgs, axis=1); h, w = row.shape[:2]; img = bpy.data.images.new('sheet', w, h, alpha=True); img.pixels.foreach_set(row.ravel()); img.filepath_raw = out; img.file_format = 'PNG'; img.save(); return w // len(paths), h

def job_canoe():
    FRAMES, PX = 8, 34; size = (7.6, 3.0); res = (int(size[0] * PX), int(size[1] * PX)); paths = []
    for f in range(FRAMES):
        bpy.ops.wm.read_factory_settings(use_empty=True); MATS.clear(); scene, cam = stage(size[0], size[1], (0.1, 0, 0.55), res, clear=True)
        build_canoe(f / FRAMES); os.makedirs(OUT, exist_ok=True); path = os.path.join(OUT, 'canoe-%d.png' % f); scene.render.filepath = path; bpy.ops.render.render(write_still=True); painted(path, FLAGS['--paint'] or 2); paths.append(path)
    print('sheet', sheet(paths, os.path.join(OUT, 'canoe.png')))

def job_props():
    PX = 34; size = (3.0, 2.0); res = (int(size[0] * PX), int(size[1] * PX)); paths = []
    for kind in ('rock', 'log'):
        bpy.ops.wm.read_factory_settings(use_empty=True); MATS.clear(); scene, cam = stage(size[0], size[1], (0, 0, 0.45), res, clear=True); b = Make(kind)
        if kind == 'rock':
            for at, r, sc in (((0, 0, 0.1), 0.75, (1.15, 0.9, 0.85)), ((0.55, 0.1, 0.0), 0.5, (1, 0.9, 0.7)), ((-0.6, -0.1, -0.05), 0.42, (1.1, 0.9, 0.7))):
                g = b.ball(at, r, '#8a8a86', scale=sc, seg=10)
                for v in g: v.co += Vector((random.uniform(-0.06, 0.06), random.uniform(-0.06, 0.06), random.uniform(-0.06, 0.06)))
            b.done()
        else:
            b.rod((-1.15, 0, 0.12), (1.15, 0.1, 0.16), 0.3, '#6f5238', seg=14); b.rod((1.1, 0.1, 0.16), (1.16, 0.1, 0.16), 0.27, '#d9bd8a', seg=14); b.rod((-0.2, 0, 0.3), (0.1, -0.2, 0.75), 0.07, '#5a4230'); b.done(smooth=True)
        os.makedirs(OUT, exist_ok=True); path = os.path.join(OUT, kind + '.png'); scene.render.filepath = path; bpy.ops.render.render(write_still=True); painted(path, FLAGS['--paint'] or 2); print('rendered', path)

# =====================================================================================================================
# the street, 1861 to 1892: the horsecar's years
# =====================================================================================================================
# The ride has come ashore. The view is now across a street to its north side: a dirt road with the street railway's
# two rails, a plank sidewalk, and a row of shops. The street slides at 0.6 of the horsecar's speed and is drawn at 14
# dots to the metre, so a year is 3.94 m of street.
# SOURCED: one thing, that electric arc lamps lit the streets from 1883 (scenery.js). They stand from that year on;
# before it the lamps are gas. DRAWING: every building, sign, pole, wire and person, and the haze: these were the years
# of coal and wood smoke, so the sky is drawn greyer than the lake's.
STREET_PPM, STREET_PIECE, STREET_H = 14 * 4 / 3, 1620 / 14, 540 / 14
street_x = lambda y: ((y - 1861) * 92 * 0.6 + 196) / 14

def shop(x, w, storeys, colour, mansard=False, awning=None):
    b = Make('shop'); d = 9; g = 3.9; h = g + 3.3 * (storeys - 1); trim = '#e6dcc4'
    b.box((0, d / 2, 0), (w, d, h), colour)
    b.box((0, -0.05, 0), (w - 0.5, 0.12, 2.9), '#2b3036', rough=0.2); b.box((0, -0.1, 0), (1.1, 0.1, 2.5), '#3a2c22')            # the shop window and door
    for sx in (-w / 2 + 0.22, w / 2 - 0.22): b.box((sx, -0.1, 0), (0.34, 0.2, g), trim)
    b.box((0, -0.12, 3.0), (w - 0.1, 0.16, 0.75), random.choice(['#2f4a3a', '#5a2f2a', '#26323f', '#3a332c', '#6a5a2f']))             # the sign board (no words: none are known)
    b.box((0, -0.14, 3.2), (w * 0.62, 0.05, 0.3), '#e9dcb8')
    if awning: vs = [b.bm.verts.new(p) for p in ((-w / 2 + 0.3, -0.1, 2.95), (w / 2 - 0.3, -0.1, 2.95), (w / 2 - 0.3, -2.1, 2.25), (-w / 2 + 0.3, -2.1, 2.25))]; b.bm.faces.new(vs); b.paint(vs, awning, rough=0.95)
    n = max(2, int(w / 2.3))
    for s in range(1, storeys):
        z = g + 0.9 + (s - 1) * 3.3; b.windows(-w / 2 + 0.5, w / 2 - 0.5, 0, z, n, 0.95, 1.9, frame=trim)
        for i in range(n): b.box((-w / 2 + 0.5 + (w - 1) * (i + 0.5) / n, -0.1, z + 1.95), (1.35, 0.16, 0.26), trim)                      # a stone head over each window
    b.box((0, -0.25, h - 0.45), (w + 0.1, 0.6, 0.55), trim)                                                                               # the cornice
    for i in range(int(w / 0.9)): b.box((-w / 2 + 0.45 + i * 0.9, -0.3, h - 0.85), (0.18, 0.4, 0.4), trim)                               # and its brackets
    if mansard:
        g2 = bmesh.ops.create_cone(b.bm, cap_ends=True, segments=4, radius1=math.sqrt(2) / 2, radius2=math.sqrt(2) / 2 * 0.78, depth=1)['verts']
        bmesh.ops.rotate(b.bm, verts=g2, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 4, 3, 'Z')); bmesh.ops.scale(b.bm, verts=g2, vec=(w, d, 2.6)); bmesh.ops.translate(b.bm, verts=g2, vec=(0, d / 2, h + 1.3)); b.paint(g2, SLATE)
        for i in range(max(1, n - 1)): cx = -w / 2 + 1.2 + (w - 2.4) * (i + 0.5) / max(1, n - 1); b.box((cx, 0.55, h + 0.5), (1.0, 0.5, 1.5), trim); b.box((cx, 0.5, h + 0.75), (0.6, 0.45, 1.0), '#2f3a44', rough=0.25)
    else: b.box((0, d / 2, h), (w, d, 0.3), '#4a4640')
    for cx in (-w / 2 + 0.6, w / 2 - 0.6): b.box((cx, d * 0.7, h), (0.8, 0.8, 2.6 if not mansard else 4.2), blend(colour, '#3a2c22', 0.3))
    return b.done((x, 3.2, 0.35))
def person(x, y, kind, facing=1):
    b = Make('person'); skin = random.choice(['#e0b896', '#d2a882', '#c99872'])
    if kind == 'woman':
        c = random.choice(['#5a3a4a', '#3f5360', '#6a5a3a', '#7a3f3a', '#2f4a44', '#4a4a5a']); b.cyl((0, 0, 0), 0.5, 1.05, c, r2=0.17, seg=12); b.ball((0, 0, 1.25), 0.19, c, scale=(1, 0.85, 1.25)); b.ball((0, 0, 1.62), 0.12, skin, rough=0.6); b.ball((-0.02 * facing, 0, 1.69), 0.13, random.choice(['#3a2c22', '#6a5a3a', '#1f1a16']), scale=(1.1, 1.05, 0.8))
        b.cyl((0, 0, 1.72), 0.2, 0.05, '#e6dcc4', seg=12)
    else:
        c = random.choice(['#2a2a2e', '#3a332c', '#4a4038', '#2f3a44', '#5a4a3a']); t = random.choice(['#3a3a40', '#6a5f52', '#8a7a62'])
        for sy in (-0.09, 0.09): b.cyl((0.03 * facing * (1 if sy > 0 else -1), sy, 0), 0.085, 0.86, t, seg=8)
        b.ball((0, 0, 1.18), 0.21, c, scale=(0.95, 1.1, 1.75)); b.ball((0, 0, 1.63), 0.115, skin, rough=0.6)
        if random.random() < 0.55: b.cyl((0, 0, 1.7), 0.115, 0.2, '#1c1c1e', seg=12); b.cyl((0, 0, 1.7), 0.19, 0.03, '#1c1c1e', seg=12)       # a tall hat
        else: b.ball((0, 0, 1.73), 0.12, '#2a2622', scale=(1, 1, 0.7)); b.cyl((0, 0, 1.69), 0.18, 0.025, '#2a2622', seg=12)                    # a round one
    return b.done((x, y, 0.5), smooth=True)
def pole(x, tall=9.5, arms=2):
    b = Make('pole'); b.cyl((0, 0, 0), 0.13, tall, '#4f4032', r2=0.09, seg=8)
    for k in range(arms): b.box((0, 0, tall - 0.9 - k * 0.7), (2.0, 0.1, 0.1), '#4f4032')
    return b.done((x, 1.2, 0.45))
def wires(x0, x1, tall=9.5, arms=2, gap=24):
    b = Make('wires'); xs = []; x = x0
    while x < x1: xs.append(x); x += gap
    for a, c in zip(xs, xs[1:]):
        for k in range(arms):
            for off in (-0.85, 0.85):
                for i in range(8):
                    t0, t1 = i / 8, (i + 1) / 8; sag = lambda t: -0.55 * math.sin(math.pi * t); z = 0.45 + tall - 0.85 - k * 0.7
                    b.rod((a + (c - a) * t0 + off, 1.2, z + sag(t0)), (a + (c - a) * t1 + off, 1.2, z + sag(t1)), 0.018, '#2b2622', seg=4)
    for a in xs: pole(a, tall, arms)
    return b.done()
def gas_lamp(x):
    b = Make('gaslamp'); b.cyl((0, 0, 0), 0.08, 3.1, '#26302a', seg=8); b.box((0, 0, 3.1), (0.42, 0.42, 0.55), '#f3d98f', emit=1.6); b.hip((0, 0, 3.65), 0.46, 0.46, 0.28, '#26302a', over=0.04)
    return b.done((x, 0.5, 0.45))
def arc_lamp(x):
    b = Make('arclamp'); b.cyl((0, 0, 0), 0.14, 11, '#3a3632', r2=0.09, seg=8); b.rod((0, 0, 10.6), (0, -1.6, 10.9), 0.05, '#3a3632'); b.ball((0, -1.6, 10.55), 0.32, '#fff6dc', emit=4.0); b.cyl((0, -1.6, 10.8), 0.4, 0.12, '#3a3632', seg=12)
    return b.done((x, 0.9, 0.45))

def build_street():
    total = 2 * STREET_PIECE
    road = Make('road'); road.box((total / 2, -45, -0.2), (total + 200, 110, 0.2), '#9c8263', rough=1.0)
    for i in range(700): px, py = random.uniform(-60, total + 60), random.uniform(-70, -0.5); road.box((px, py, 0), (random.uniform(0.5, 2.6), random.uniform(0.08, 0.25), 0.012), blend('#9c8263', random.choice(['#6f5a44', '#b79d7c']), random.uniform(0.3, 0.8)), turn=random.uniform(-0.15, 0.15), rough=1.0)   # ruts and scuffs
    for ry in (-13.2, -14.7): road.box((total / 2, ry, 0), (total + 200, 0.09, 0.05), '#3a3632', rough=0.4)                                 # the street railway
    road.box((total / 2, 1.6, 0), (total + 200, 3.4, 0.45), '#a08a68')                                                                     # the plank sidewalk
    for i in range(int((total + 200) / 0.5)): road.box((-100 + i * 0.5, 1.6, 0.45), (0.03, 3.4, 0.005), '#6f5d44')
    road.box((total / 2, 40, 0), (total + 200, 70, 0.35), '#8f8468'); road.done()
    sky = Make('sky'); vs = [sky.bm.verts.new(p) for p in ((-100, 62, -20), (total + 100, 62, -20), (total + 100, 62, 40), (-100, 62, 40))]; sky.bm.faces.new(vs); so = sky.done()
    m = bpy.data.materials.new('sky'); m.use_nodes = True; nt = m.node_tree; nt.nodes.remove(nt.nodes.get('Principled BSDF')); em = nt.nodes.new('ShaderNodeEmission'); outn = nt.nodes.get('Material Output')
    geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); span = nt.nodes.new('ShaderNodeMapRange'); ramp = nt.nodes.new('ShaderNodeValToRGB')
    span.inputs['From Min'].default_value = -4; span.inputs['From Max'].default_value = 26
    e = ramp.color_ramp.elements; e[0].position = 0; e[0].color = rgb('#f1dcc0'); e[1].position = 1; e[1].color = rgb('#7f9fbd')
    for p, c in ((0.3, '#e3d6c4'), (0.6, '#b9c8d4')): ramp.color_ramp.elements.new(p).color = rgb(c)                                          # a smoky sky: paler and greyer than over the lake
    nt.links.new(geo.outputs['Position'], sep.inputs['Vector']); nt.links.new(sep.outputs['Z'], span.inputs['Value']); nt.links.new(span.outputs['Result'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs['Emission'], outn.inputs['Surface']); so.data.materials.append(m)
    lumps = bpy.data.textures.new('lumps', 'CLOUDS'); lumps.noise_scale = 0.5
    for k in range(7):
        c = Make('cloud'); w = random.uniform(1.0, 2.0)
        for j in range(random.randint(12, 20)):
            x = random.uniform(-1, 1) * w; tall = 1 - 0.6 * (abs(x) / w) ** 1.5; s = random.uniform(0.2, 0.4) * tall
            c.ball((x, random.uniform(-0.2, 0.2), random.uniform(0.1, 0.7) * tall * 0.7 + s * 0.4), s, '#f3ead9', scale=(1.25, 0.6, 0.8), seg=16, rough=1.0, sub=0.5)
        for v in c.bm.verts: v.co.z = max(v.co.z, 0.05)
        o = c.done((total * (k + random.uniform(-0.3, 0.3)) / 6, random.uniform(54, 60), random.uniform(13, 19)), smooth=True); size = random.uniform(6, 10); o.scale = (size, size, size * 0.7)
        o.modifiers.new('lumps', 'DISPLACE').texture = lumps; o.modifiers['lumps'].strength = 0.2
    # the row of shops: lower and plainer at first, taller, with mansard roofs, as the years go on
    BRICK = ['#9c5a44', '#a8684a', '#8d4f3d', '#c7a274', '#b4795a', '#7f4a3c', '#d2bb93']; AWN = [None, None, '#b8483a', '#3f6a5a', '#d9c9a0', '#3f5a80']
    x = -30.0
    while x < total + 30:
        yr = 1861 + (x * 14 - 196) / (92 * 0.6); late = max(0.0, min(1.0, (yr - 1861) / 31)); w = random.uniform(6.0, 9.5)
        storeys = random.choice((2, 3, 3)) if random.random() > late else random.choice((3, 4, 4))
        shop(x + w / 2, w, storeys, random.choice(BRICK), mansard=random.random() < 0.15 + 0.4 * late, awning=random.choice(AWN)); x += w + (0.0 if random.random() < 0.85 else random.uniform(2.5, 4.5))
    # behind the row: a church spire or two and factory chimneys, the marks of the time
    for sx, tall in ((street_x(1866), 30), (street_x(1880), 34)): s = Make('spire'); s.box((0, 0, 0), (5, 5, tall * 0.55), '#b9ab90'); s.cyl((0, 0, tall * 0.55), 3.0, tall * 0.45, '#4f5560', r2=0.1, seg=8); s.done((sx, 32, 0.4))
    for sx in (street_x(1872), street_x(1876) + 6, street_x(1887)): s = Make('stack'); s.cyl((0, 0, 0), 1.3, 26, '#8a5a48', r2=0.85, seg=12); s.done((sx, 40, 0.4))
    # lamps: gas until 1883, then electric arc lamps on tall poles (the one sourced thing here)
    gx = -20.0
    while gx < total + 20: (gas_lamp if gx < street_x(1883) - 6 else arc_lamp)(gx); gx += 17 if gx < street_x(1883) - 6 else 30
    wires(-30, street_x(1877), tall=8.5, arms=1, gap=30); wires(street_x(1877), total + 40, tall=10.5, arms=3, gap=26)   # the telegraph, then the telephone's many wires
    for i in range(int(total / 3.2)):
        px = random.uniform(-10, total + 10); person(px, random.uniform(0.7, 2.6), 'woman' if random.random() < 0.4 else 'man', random.choice((-1, 1)))
    for i in range(10):                                                                                                    # barrels and crates outside some shops
        b = Make('goods'); px = random.uniform(0, total)
        if random.random() < 0.5: b.cyl((0, 0, 0), 0.34, 0.9, '#7a5a3c', seg=10)
        else: b.box((0, 0, 0), (0.9, 0.7, 0.7), '#b99a6a')
        b.done((px, 2.9, 0.47))

def job_street():
    bpy.ops.wm.read_factory_settings(use_empty=True); res = (int(STREET_PIECE * STREET_PPM), int(STREET_H * STREET_PPM)); up = Vector((0, math.sin(PITCH), math.cos(PITCH)))
    scene, cam = stage(STREET_PIECE, STREET_H, (0, 0, 0), res); build_street(); os.makedirs(OUT, exist_ok=True)
    for i in range(2):
        if FLAGS['--only'] >= 0 and i != FLAGS['--only']: continue
        centre = Vector(((i + 0.5) * STREET_PIECE, 0, 0.45)) + up * ((396 / 540 - 0.5) * STREET_H); look = Vector((0, math.cos(PITCH), -math.sin(PITCH))); cam.location = centre - look * 300   # the kerb sits 396/540 of the way down
        path = os.path.join(OUT, 'street-%d.png' % i); scene.render.filepath = path; bpy.ops.render.render(write_still=True); print('painted', painted(path, FLAGS['--paint'] or 3, path.replace('.png', '.jpg'))); os.remove(path)

# ---- the horsecar: a short closed car on four small wheels, a driver on the front platform, one horse ----
# Its shape follows the pictures listed in references.js; they are black-and-white, so its colours are a guess.
def build_horsecar(phase):
    car = Make('car'); red, cream, dark = '#9a2f2a', '#ecdcae', '#2b2622'
    car.box((-2.9, 0, 0.55), (5.6, 2.0, 0.14), dark); car.box((-2.9, 0, 0.69), (3.9, 2.05, 0.85), red); car.box((-2.9, 0, 1.54), (3.9, 2.05, 1.05), cream)
    car.windows(-4.75, -1.05, -1.03, 1.68, 6, 0.48, 0.72, frame='#7a5a3a')
    for ex in (-5.6, -0.2): car.box((ex, 0, 0.69), (0.08, 1.9, 0.8), red)                                                  # the dash at each end
    for ex in (-5.55, -4.95, -0.85, -0.25):
        for sy in (-0.95, 0.95): car.box((ex, sy, 0.69), (0.06, 0.06, 2.0), dark)
    car.box((-2.9, 0, 2.59), (5.9, 2.2, 0.09), dark); car.box((-2.9, 0, 2.68), (4.9, 1.1, 0.26), '#d9d2c2'); car.box((-2.9, 0, 2.94), (5.1, 1.25, 0.07), dark)   # the roof, with its raised middle
    for wx in (-3.9, -1.9):
        for sy in (-0.9, 0.9): car.rod((wx, sy - 0.05, 0.36), (wx, sy + 0.05, 0.36), 0.36, dark, seg=18); car.rod((wx, sy - 0.07, 0.36), (wx, sy + 0.07, 0.36), 0.1, '#8a7a62', seg=10)
    car.ball((-0.55, 0, 1.55), 0.2, '#2f3038', scale=(0.9, 1.1, 1.8)); car.ball((-0.55, 0, 2.05), 0.115, '#d9b494', rough=0.6); car.cyl((-0.55, 0, 2.1), 0.14, 0.13, '#1c1c1e', seg=12); car.cyl((-0.55, 0, 2.1), 0.2, 0.03, '#1c1c1e', seg=12)   # the driver
    for sy in (-0.09, 0.09): car.cyl((-0.55, sy, 0.69), 0.08, 0.6, '#2f3038', seg=8)
    car.done(smooth=False)
    # the horse, trotting hard: each leg swings from the body and folds at the knee as it comes forward
    h = Make('horse'); bay, blk = '#6b4526', '#1c1511'; s = phase * math.tau; lift = 0.06 * abs(math.sin(s)); o = Vector((2.4, 0, lift))
    h.ball(o + Vector((0, 0, 1.22)), 0.36, bay, scale=(2.0, 0.85, 1.0), seg=20); h.ball(o + Vector((0.55, 0, 1.27)), 0.34, bay, scale=(1.0, 0.9, 1.1), seg=18); h.ball(o + Vector((-0.6, 0, 1.27)), 0.37, bay, scale=(1.0, 0.92, 1.05), seg=18)
    nod = 0.05 * math.sin(s * 2); nb, nt = o + Vector((0.72, 0, 1.45)), o + Vector((1.18, 0, 1.98 + nod)); h.rod(nb, nt, 0.17, bay, seg=12); h.ball(nb, 0.2, bay); h.ball(nt, 0.16, bay)
    h.ball(nt + Vector((0.17, 0, -0.03)), 0.14, bay, scale=(1.7, 0.8, 0.95)); h.ball(nt + Vector((0.38, 0, -0.1)), 0.095, blend(bay, '#2a1c14', 0.35), scale=(1.2, 0.9, 0.9))
    for sy in (-0.07, 0.07): h.cyl(nt + Vector((0.0, sy, 0.1)), 0.035, 0.14, bay, r2=0.005, seg=6)
    for i in range(6): t = i / 5; h.ball(nb + (nt - nb) * t + Vector((-0.11, 0, 0.09)), 0.075, blk)                           # the mane
    tb = o + Vector((-0.95, 0, 1.35)); h.rod(tb, tb + Vector((-0.42 - 0.08 * math.sin(s), 0, -0.42)), 0.07, blk); h.ball(tb + Vector((-0.5 - 0.1 * math.sin(s), 0, -0.6)), 0.11, blk, scale=(0.9, 0.7, 1.6))
    for (hx, hy, hz), ph in (((0.55, -0.16, 1.02), 0.0), ((0.55, 0.16, 1.02), math.pi), ((-0.6, -0.17, 1.05), math.pi), ((-0.6, 0.17, 1.05), 0.0)):   # diagonal pairs move together
        a = 0.55 * math.sin(s + ph); fold = 0.95 * max(0.0, math.sin(s + ph + 1.9)); hip = o + Vector((hx, hy, hz)); knee = hip + Vector((math.sin(a) * 0.5, 0, -math.cos(a) * 0.5)); a2 = a - fold; hoof = knee + Vector((math.sin(a2) * 0.48, 0, -math.cos(a2) * 0.48))
        h.rod(hip, knee, 0.085, bay, seg=10); h.ball(hip, 0.11, bay); h.ball(knee, 0.07, bay); h.rod(knee, hoof, 0.05, blend(bay, '#2a1c14', 0.4), seg=8); h.ball(hoof + Vector((0.02, 0, 0)), 0.065, blk, scale=(1.2, 1, 0.8))
    h.ball(o + Vector((0.78, 0, 1.25)), 0.38, blk, scale=(0.35, 0.95, 1.05))                                                  # the collar
    for sy in (-0.3, 0.3): h.rod(o + Vector((0.75, sy, 1.15)), Vector((-0.15, sy, 0.95)), 0.018, blk, seg=5)                    # the traces back to the car
    h.rod(nt + Vector((0.2, 0, -0.1)), Vector((-0.5, 0, 1.75)), 0.01, blk, seg=4)                                               # a rein
    h.done(smooth=True)

def job_horsecar():
    FRAMES, PX = 8, 34; size = (11.0, 4.4); res = (int(size[0] * PX), int(size[1] * PX)); paths = []
    for f in range(FRAMES):
        bpy.ops.wm.read_factory_settings(use_empty=True); MATS.clear(); scene, cam = stage(size[0], size[1], (-1.3, 0, 1.45), res, clear=True)
        build_horsecar(f / FRAMES); os.makedirs(OUT, exist_ok=True); path = os.path.join(OUT, 'horsecar-%d.png' % f); scene.render.filepath = path; bpy.ops.render.render(write_still=True); painted(path, FLAGS['--paint'] or 2); paths.append(path)
    print('sheet', sheet(paths, os.path.join(OUT, 'horsecar.png')))

def job_goods():
    PX = 34; size = (3.0, 2.0); res = (int(size[0] * PX), int(size[1] * PX))
    for kind in ('barrel', 'crate'):
        bpy.ops.wm.read_factory_settings(use_empty=True); MATS.clear(); scene, cam = stage(size[0], size[1], (0, 0, 0.55), res, clear=True); b = Make(kind)
        if kind == 'barrel':
            b.cyl((0, 0, 0), 0.38, 1.05, '#8a5f3c', seg=18); b.cyl((0, 0, 0.3), 0.46, 0.45, '#8a5f3c', seg=18)
            for z in (0.12, 0.34, 0.7, 0.92): b.cyl((0, 0, z), 0.47 if 0.3 < z < 0.75 else 0.4, 0.05, '#3a3632', seg=18)
        else:
            b.box((0, 0, 0), (1.15, 0.9, 0.95), '#c39f6c')
            for z in (0.0, 0.85): b.box((0, -0.46, z), (1.2, 0.04, 0.1), '#8a6a42')
            for sx in (-0.55, 0.55): b.box((sx, -0.46, 0), (0.1, 0.04, 0.95), '#8a6a42')
            b.box((0, -0.46, 0.4), (1.45, 0.04, 0.09), '#8a6a42', turn=0.0)
        b.done(smooth=kind == 'barrel'); os.makedirs(OUT, exist_ok=True); path = os.path.join(OUT, kind + '.png'); scene.render.filepath = path; bpy.ops.render.render(write_still=True); painted(path, FLAGS['--paint'] or 2); print('rendered', path)

# =====================================================================================================================
# the street, 1892 to 1954: the electric streetcar's years
# =====================================================================================================================
# The same view across a street, sliding at 0.6 and drawn at 14 dots to the metre, three pieces long.
# SOURCED: that eight things existed by their year (scenery.js): the Legislative Building (1893), Old City Hall
# (1899), Casa Loma (1914), the Prince Edward Viaduct (1918), Union Station (1927), the Royal York (1929), the Bank of
# Commerce tower (1931) and Maple Leaf Gardens (1931).
# DRAWING: everything about how they look. They are drawn as small models of themselves, far smaller than life, so
# that a 145 m tower and a three-storey shop fit in one picture; and they stand side by side on one street, which
# they never did. Four of them were finished within four years, so those four are spread out a little past their
# years to stand clear of each other. Everything else is drawing too: the shops and offices and how they change, the
# motor cars and when they appear, the lamps, wires, signs and people, the road's surface, and the smoky sky.
town_x = lambda y: ((y - 1892) * 92 * 0.6 + 196) / 14
SPOTS = {'queenspark': (18, 28), 'oldcityhall': (44, 18), 'casaloma': (101, 24), 'viaduct': (124, 20), 'union': (148, 26), 'royalyork': (168, 12), 'commerce': (179.5, 8), 'gardens': (195, 20)}   # where each stands: middle and width, metres

def grid(b, x0, x1, y, z0, rows, cols, w, h, step, colour='#2f3a44', frame=None):
    for r in range(rows):
        for c in range(cols): b.box((x0 + (x1 - x0) * (c + 0.5) / cols, y - 0.05, z0 + r * step), (w, 0.08, h), colour, rough=0.25)
def queens_park(x):
    b = Make('queenspark'); st = '#a8705a'
    b.box((0, 5, 0), (10, 9, 14), st); b.gable((0, 5, 14), 10, 9, 4, SLATE)
    for i in (-2.6, 0, 2.6): b.box((i, 0.45, 0), (1.7, 0.2, 5.2), '#2a2420'); b.ball((i, 0.45, 5.2), 0.85, '#2a2420', scale=(1, 0.12, 1))
    grid(b, -4, 4, 0.5, 7.4, 2, 5, 0.9, 1.9, 3.0)
    for sx in (-7, 7): b.box((sx, 4.5, 0), (4, 5, 19), blend(st, '#6a4a3c', 0.15)); b.hip((sx, 4.5, 19), 4, 5, 6, SLATE, over=0.1); grid(b, sx - 1.3, sx + 1.3, 2.0, 3, 5, 2, 0.7, 1.7, 3.0)
    for sx in (-11.5, 11.5): b.box((sx, 6, 0), (5, 8, 10), st); b.hip((sx, 6, 10), 5, 8, 3.4, SLATE); grid(b, sx - 2, sx + 2, 2.0, 1.4, 3, 3, 0.8, 1.8, 2.9)
    return b.done((x, 5.5, 0.45))
def old_city_hall(x):
    b = Make('oldcityhall'); st = '#c9b48c'
    b.box((1, 5, 0), (16, 9, 11), st); b.gable((1, 5, 11), 16, 9, 5.5, '#5a6058'); grid(b, -6, 8, 0.5, 1.2, 3, 7, 0.9, 2.0, 3.2)
    for i in (-1, 1, 3): b.box((i, 0.45, 0), (1.3, 0.2, 3.6), '#2a2420')
    b.box((-5.5, 3.5, 0), (4.6, 4.6, 24), blend(st, '#8a7a5c', 0.1)); grid(b, -6.6, -4.4, 1.2, 4, 5, 2, 0.6, 1.8, 3.4)
    b.ball((-5.5, 1.15, 21), 1.5, '#f3ecd8', scale=(1, 0.08, 1)); b.box((-5.5, 1.05, 21), (0.12, 0.06, 1.1), '#1c1a18'); b.hip((-5.5, 3.5, 24), 4.6, 4.6, 5.5, '#5a6058', over=0.15)
    return b.done((x, 6, 0.45))
def casa_loma(x):
    b = Make('casaloma'); st, tile = '#b0aa9e', '#8f4f3e'
    b.box((0, 6, 0), (20, 8, 10), st); b.gable((0, 6, 10), 20, 8, 3.6, tile); grid(b, -9, 9, 2.0, 1.4, 3, 9, 0.8, 1.9, 2.9)
    b.cyl((-9.5, 5, 0), 2.7, 19, st, seg=16); b.cyl((-9.5, 5, 19), 3.1, 5.5, tile, r2=0.1, seg=16)
    b.box((8.5, 5, 0), (4.6, 4.6, 16), st)
    for i in range(5): b.box((6.6 + i * 0.95, 2.75, 16), (0.5, 0.5, 0.9), st)
    b.cyl((3, 4.5, 0), 1.4, 13.5, st, seg=12); b.cyl((3, 4.5, 13.5), 1.7, 3.2, tile, r2=0.1, seg=12)
    grid(b, 7.4, 9.6, 2.7, 3, 4, 2, 0.6, 1.7, 3.2)
    return b.done((x, 6, 0.45))
def viaduct(x):
    b = Make('viaduct'); steel, conc = '#3d4046', '#bdb6a6'
    b.box((0, 6, 11.5), (20.4, 3.2, 1.0), conc); b.box((0, 4.35, 12.5), (20.4, 0.12, 0.9), steel)
    for px in (-10, 0, 10): b.box((px, 6, 0), (1.6, 3.4, 11.5), conc)
    for a0 in (-10, 0):
        for sy in (4.6, 7.4):
            for i in range(14):
                t0, t1 = i / 14, (i + 1) / 14; arc = lambda t: (a0 + 0.8 + 8.4 * t, 4.5 + 6.6 * math.sin(math.pi * t))
                p, q = arc(t0), arc(t1); b.rod((p[0], sy, p[1]), (q[0], sy, q[1]), 0.16, steel, seg=6)
                if i % 2 == 0: b.rod((p[0], sy, p[1]), (p[0], sy, 11.5), 0.07, steel, seg=5)
    for i in range(9): b.clump((-9 + i * 2.3 + random.uniform(-0.5, 0.5), 9, random.uniform(1.5, 3.5)), random.uniform(1.6, 2.4), random.choice(['#55783a', '#6d8c3c', '#4a6e34']), rough=0.95)   # the valley's trees, under it
    return b.done((x, 5, 0.45))
def union_station(x):
    b = Make('union'); st = '#dcd3bd'
    b.box((0, 6, 0), (26, 8, 8.2), st); b.box((0, 5, 8.2), (12, 6, 2.6), st); b.box((0, 1.9, 7.4), (26.4, 0.4, 0.8), '#ece4d0')
    for i in range(10): b.cyl((-5.4 + i * 1.2, 1.5, 0.6), 0.36, 6.8, '#efe8d6', seg=12)
    b.box((0, 1.6, 0), (12.6, 1.4, 0.6), '#cfc6b0'); b.box((0, 2.05, 0.6), (11, 0.1, 6.6), '#2a2622')
    for sx in (-9.5, 9.5): grid(b, sx - 3, sx + 3, 2.0, 1.4, 2, 5, 0.75, 2.2, 3.3)
    return b.done((x, 5, 0.45))
def royal_york(x):
    b = Make('royalyork'); st, cu = '#cfc0a0', '#5f8f7a'
    b.box((0, 5, 0), (12, 8, 9), st); grid(b, -5.4, 5.4, 1.0, 1.2, 3, 9, 0.5, 1.4, 2.6)
    b.box((0, 5, 9), (9, 6.5, 9), st); grid(b, -4, 4, 1.75, 9.8, 4, 8, 0.45, 1.3, 2.1)
    b.box((0, 5, 18), (5.6, 5, 5), st); grid(b, -2.4, 2.4, 2.5, 18.6, 2, 5, 0.45, 1.3, 2.2); b.hip((0, 5, 23), 5.6, 5, 3.6, cu, over=0.1)
    for sx in (-3.6, 3.6): b.hip((sx, 5, 18), 1.8, 6.5, 1.6, cu, over=0.0)
    return b.done((x, 6, 0.45))
def commerce(x):
    b = Make('commerce'); st = '#d8cfb8'
    for w, z0, h in ((8, 0, 19), (6.2, 19, 5), (4.4, 24, 3.2)): b.box((0, 4.5, z0), (w, min(w, 6.5), h), st)
    grid(b, -3.5, 3.5, 1.25, 4.4, 7, 7, 0.36, 1.3, 2.05); grid(b, -2.7, 2.7, 1.4, 19.6, 2, 5, 0.36, 1.3, 2.2); b.box((0, 1.2, 0), (2.2, 0.15, 3.8), '#2a2622')
    for sx in (-2, 2): b.ball((sx, 2.35, 26.4), 0.5, '#bfb39a', scale=(1, 0.8, 1.4))        # the carved heads at the top, as lumps
    return b.done((x, 5.5, 0.45))
def gardens(x):
    b = Make('gardens'); br = '#cdac62'
    b.box((0, 6, 0), (20, 9, 9.5), br)
    for i in range(9): b.box((-8.8 + i * 2.2, 1.45, 0), (0.5, 0.2, 9.5), '#e3cf9a')
    grid(b, -8.4, 8.4, 1.5, 4.2, 2, 8, 1.1, 1.9, 2.6); b.box((0, 0.9, 2.9), (9, 1.4, 0.35), '#3a3632'); b.box((0, 1.45, 0), (7, 0.15, 2.9), '#2a2622')
    g = b.ball((0, 6, 9.3), 1.0, '#8f958f', scale=(9.2, 4.2, 4.0), seg=24)
    for v in g: v.co.z = max(v.co.z, 9.5)
    return b.done((x, 5, 0.45), smooth=False)

def office(x, w, storeys, colour, deco=False):   # the taller blocks of the new century: bigger windows, a flat top
    b = Make('office'); d = 10; g = 4.2; h = g + 3.4 * (storeys - 1); trim = '#e6dcc4'
    b.box((0, d / 2, 0), (w, d, h), colour); b.box((0, -0.05, 0), (w - 0.6, 0.12, 3.2), '#2b3036', rough=0.2); b.box((0, -0.12, 3.3), (w - 0.1, 0.16, 0.7), random.choice(['#2f4a3a', '#5a2f2a', '#26323f', '#3a332c']))
    n = max(2, int(w / 2.0))
    for s in range(1, storeys): b.windows(-w / 2 + 0.5, w / 2 - 0.5, 0, g + 0.7 + (s - 1) * 3.4, n, 1.25, 2.1, frame=trim)
    if deco:
        for i in range(n + 1): b.box((-w / 2 + 0.25 + (w - 0.5) * i / n, -0.12, g), (0.34, 0.2, h - g + 0.6), trim)
        b.box((0, 0.2, h), (w * 0.5, 1.0, 1.3), colour); b.box((0, 0.2, h + 1.3), (w * 0.24, 1.0, 0.9), colour)
        if random.random() < 0.6: b.box((w / 2 - 0.5, -0.5, g + 0.4), (0.35, 0.7, h - g - 1.4), random.choice(['#e0483a', '#3fa7c9', '#e9b44c']), emit=1.6)   # a tall lit sign
    else: b.box((0, -0.3, h - 0.5), (w + 0.2, 0.7, 0.7), trim)
    return b.done((x, 3.2, 0.35))
def motor(x, yr):
    b = Make('motor'); c = '#1f1f22' if yr < 1926 else random.choice(['#1f1f22', '#3a2a2a', '#2a3a4a', '#35453a', '#6a2f2a', '#b9a888', '#3f5f7a'])
    if yr < 1926:      # an open or boxy tourer, high on thin wheels
        b.box((0, 0, 0.55), (3.3, 1.5, 0.5), c); b.box((0.95, 0, 1.05), (1.1, 1.3, 0.4), c); b.box((-0.55, 0, 1.05), (1.7, 1.45, 0.85), c); b.box((-0.55, -0.74, 1.3), (1.5, 0.03, 0.45), '#aab7bd', rough=0.2); r = 0.42
    elif yr < 1939:    # a closed saloon with running boards
        b.box((0, 0, 0.42), (4.1, 1.6, 0.55), c); b.box((-0.4, 0, 0.97), (2.3, 1.5, 0.75), c); b.box((-0.4, -0.76, 1.12), (2.0, 0.03, 0.45), '#aab7bd', rough=0.2); b.box((1.5, 0, 0.97), (1.0, 1.2, 0.18), c); r = 0.38
    else:              # rounder, lower
        b.ball((0, 0, 0.75), 1.0, c, scale=(2.2, 0.82, 0.42), seg=18, rough=0.4); b.ball((-0.3, 0, 1.1), 1.0, c, scale=(1.15, 0.74, 0.4), seg=18, rough=0.4); b.box((-0.3, -0.72, 1.08), (1.5, 0.03, 0.36), '#aab7bd', rough=0.2); r = 0.34
    for wx in (-1.25, 1.25):
        for sy in (-0.78, 0.78): b.rod((wx, sy - 0.08, r), (wx, sy + 0.08, r), r, '#1c1c1e', seg=14); b.rod((wx, sy - 0.1, r), (wx, sy + 0.1, r), r * 0.45, '#b9b3a6', seg=10)
    return b.done((x, -2.4, 0.0), smooth=yr >= 1939)
def post_lamp(x):
    b = Make('postlamp'); b.cyl((0, 0, 0), 0.11, 4.4, '#2f3a34', r2=0.07, seg=8); b.ball((0, 0, 4.65), 0.3, '#fff3d0', emit=2.6)
    return b.done((x, 0.5, 0.45))

def build_town():
    total = 3 * STREET_PIECE
    road = Make('road')
    for i in range(int((total + 200) / 6)):                                                         # the road: packed earth at first, then blocks and asphalt
        px = -100 + i * 6; late = max(0.0, min(1.0, (px - town_x(1896)) / (town_x(1925) - town_x(1896)))); road.box((px + 3, -45, -0.2), (6.02, 110, 0.2), blend('#9c8263', '#6f6c68', late), rough=1.0)
    for i in range(900): px, py = random.uniform(-60, total + 60), random.uniform(-70, -0.5); road.box((px, py, 0), (random.uniform(0.5, 2.6), random.uniform(0.08, 0.22), 0.012), random.choice(['#5a5650', '#8f8a80', '#7a6a55']), turn=random.uniform(-0.1, 0.1), rough=1.0)
    for ry in (-13.2, -14.7): road.box((total / 2, ry, 0), (total + 200, 0.09, 0.05), '#2f2c2a', rough=0.35)
    road.box((total / 2, 1.6, 0), (total + 200, 3.4, 0.45), '#b3ab9c'); road.box((total / 2, -0.12, 0), (total + 200, 0.25, 0.46), '#8f887a')     # a stone sidewalk and its kerb
    road.box((total / 2, 40, 0), (total + 200, 70, 0.35), '#8f8468'); road.done()
    sky = Make('sky'); vs = [sky.bm.verts.new(p) for p in ((-100, 62, -20), (total + 100, 62, -20), (total + 100, 62, 40), (-100, 62, 40))]; sky.bm.faces.new(vs); so = sky.done()
    m = bpy.data.materials.new('sky'); m.use_nodes = True; nt = m.node_tree; nt.nodes.remove(nt.nodes.get('Principled BSDF')); em = nt.nodes.new('ShaderNodeEmission'); outn = nt.nodes.get('Material Output')
    geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); span = nt.nodes.new('ShaderNodeMapRange'); ramp = nt.nodes.new('ShaderNodeValToRGB')
    span.inputs['From Min'].default_value = -4; span.inputs['From Max'].default_value = 26
    e = ramp.color_ramp.elements; e[0].position = 0; e[0].color = rgb('#eedcc4'); e[1].position = 1; e[1].color = rgb('#86a3bf')
    for p, c in ((0.3, '#e0d5c6'), (0.6, '#b9c7d2')): ramp.color_ramp.elements.new(p).color = rgb(c)
    nt.links.new(geo.outputs['Position'], sep.inputs['Vector']); nt.links.new(sep.outputs['Z'], span.inputs['Value']); nt.links.new(span.outputs['Result'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs['Emission'], outn.inputs['Surface']); so.data.materials.append(m)
    lumps = bpy.data.textures.new('lumps', 'CLOUDS'); lumps.noise_scale = 0.5
    for k in range(10):
        c = Make('cloud'); w = random.uniform(1.0, 2.0)
        for j in range(random.randint(12, 20)):
            x = random.uniform(-1, 1) * w; tall = 1 - 0.6 * (abs(x) / w) ** 1.5; s = random.uniform(0.2, 0.4) * tall
            c.ball((x, random.uniform(-0.2, 0.2), random.uniform(0.1, 0.7) * tall * 0.7 + s * 0.4), s, '#f3ead9', scale=(1.25, 0.6, 0.8), seg=16, rough=1.0, sub=0.5)
        for v in c.bm.verts: v.co.z = max(v.co.z, 0.05)
        o = c.done((total * (k + random.uniform(-0.3, 0.3)) / 9, random.uniform(54, 60), random.uniform(14, 20)), smooth=True); size = random.uniform(6, 10); o.scale = (size, size, size * 0.7)
        o.modifiers.new('lumps', 'DISPLACE').texture = lumps; o.modifiers['lumps'].strength = 0.2
    # the eight dated things, each a small model of itself standing in a gap in the row
    for name, fn in (('queenspark', queens_park), ('oldcityhall', old_city_hall), ('casaloma', casa_loma), ('viaduct', viaduct), ('union', union_station), ('royalyork', royal_york), ('commerce', commerce), ('gardens', gardens)): fn(SPOTS[name][0])
    taken = [(c - w / 2 - 0.6, c + w / 2 + 0.6) for c, w in SPOTS.values()]
    BRICK = ['#9c5a44', '#a8684a', '#8d4f3d', '#c7a274', '#b4795a', '#7f4a3c', '#d2bb93']; STONE2 = ['#d6ccb4', '#c9bfa6', '#b9b3a6', '#e0d6bd', '#a8684a', '#8d4f3d']; AWN = [None, None, '#b8483a', '#3f6a5a', '#d9c9a0', '#3f5a80']
    x = -30.0
    while x < total + 30:
        yr = 1892 + (x * 14 - 196) / (92 * 0.6); w = random.uniform(6.5, 10.5); hit = next((t for t in taken if x < t[1] and x + w > t[0]), None)
        if hit: x = hit[1]; continue
        if yr < 1905 or (yr < 1920 and random.random() < 0.45): shop(x + w / 2, w, random.choice((3, 3, 4)), random.choice(BRICK), mansard=random.random() < 0.4, awning=random.choice(AWN))
        elif yr < 1930: office(x + w / 2, w, random.choice((4, 5, 6, 7)), random.choice(STONE2 + BRICK))
        else: office(x + w / 2, w, random.choice((4, 5, 6, 7)), random.choice(STONE2), deco=random.random() < 0.6)
        x += w
    gx = -20.0
    while gx < total + 20:                                                                          # arc lamps on tall poles, then globes on iron posts
        if gx < town_x(1912): arc_lamp(gx); gx += 30
        else: post_lamp(gx); gx += 15
    wires(-30, town_x(1914), tall=10.5, arms=3, gap=26); wires(town_x(1914), total + 40, tall=9, arms=1, gap=34)   # the tangle of wires thins as they go underground
    tw = Make('trolley'); tw.rod((-60, -14, 6.0), (total + 60, -14, 6.0), 0.02, '#2b2622', seg=4)   # the wire the cars run under, hung from poles along the kerb
    px = -40.0
    while px < total + 40: tw.cyl((px, -0.6, 0.45), 0.1, 6.6, '#3a3632', seg=8); tw.rod((px, -0.6, 6.9), (px, -14, 6.05), 0.012, '#2b2622', seg=4); px += 36
    tw.done()
    for i in range(int(total / 2.6)):
        px = random.uniform(-10, total + 10)
        if any(a < px < b for a, b in taken) and random.random() < 0.4: continue
        person(px, random.uniform(0.7, 2.6), 'woman' if random.random() < 0.45 else 'man', random.choice((-1, 1)))
    cx = town_x(1907)
    while cx < total + 20:                                                                          # motor cars at the kerb, few at first
        yr = 1892 + (cx * 14 - 196) / (92 * 0.6); motor(cx, yr); cx += random.uniform(26, 44) if yr < 1922 else random.uniform(9, 20)

def job_town():
    bpy.ops.wm.read_factory_settings(use_empty=True); res = (int(STREET_PIECE * STREET_PPM), int(STREET_H * STREET_PPM)); up = Vector((0, math.sin(PITCH), math.cos(PITCH)))
    scene, cam = stage(STREET_PIECE, STREET_H, (0, 0, 0), res); build_town(); os.makedirs(OUT, exist_ok=True)
    for i in range(3):
        if FLAGS['--only'] >= 0 and i != FLAGS['--only']: continue
        centre = Vector(((i + 0.5) * STREET_PIECE, 0, 0.45)) + up * ((396 / 540 - 0.5) * STREET_H); look = Vector((0, math.cos(PITCH), -math.sin(PITCH))); cam.location = centre - look * 300
        path = os.path.join(OUT, 'town-%d.png' % i); scene.render.filepath = path; bpy.ops.render.render(write_still=True); print('painted', painted(path, FLAGS['--paint'] or 3, path.replace('.png', '.jpg'))); os.remove(path)

# ---- the electric streetcar: a closed car on one truck, a raised roof, a pole up to the wire ----
# Shape after the pictures in references.js; red below and cream above is the livery the game has always used.
def build_streetcar(frame):
    c = Make('streetcar'); red, cream, dark = '#a62b26', '#efe2bc', '#26262a'
    c.box((0, 0, 0.7), (8.6, 2.3, 0.14), dark); c.box((0, 0, 0.84), (6.4, 2.35, 0.95), red); c.box((0, 0, 1.79), (6.4, 2.35, 1.15), cream)
    c.windows(-3.05, 3.05, -1.18, 1.95, 8, 0.55, 0.82, frame='#8a5a3a')
    for ex, s in ((-3.75, -1), (3.75, 1)):                                                   # a closed vestibule at each end
        c.box((ex, 0, 0.84), (1.1, 2.2, 0.95), red); c.box((ex, 0, 1.79), (1.1, 2.2, 1.15), cream); c.box((ex, -1.11, 1.95), (0.75, 0.05, 0.8), '#2f3a44', rough=0.25); c.box((ex + s * 0.57, 0, 1.95), (0.05, 1.6, 0.8), '#2f3a44', rough=0.25)
    c.box((0, 0, 2.94), (8.9, 2.5, 0.1), dark); c.box((0, 0, 3.04), (7.4, 1.3, 0.28), '#d9d2c2'); c.box((0, 0, 3.32), (7.7, 1.45, 0.08), dark)
    c.box((0, 0, 0.3), (3.4, 1.9, 0.4), dark)
    for wx in (-1.1, 1.1):
        for sy in (-1.0, 1.0): c.rod((wx, sy - 0.06, 0.42), (wx, sy + 0.06, 0.42), 0.42, dark, seg=18); c.rod((wx, sy - 0.08, 0.42), (wx, sy + 0.08, 0.42), 0.13, '#8a7a62', seg=10)
    c.ball((4.32, 0, 1.25), 0.17, '#fff0b8', emit=3.0); vs = [c.bm.verts.new(p) for p in ((4.3, -1.0, 0.75), (4.3, 1.0, 0.75), (5.0, 1.0, 0.2), (5.0, -1.0, 0.2))]; c.bm.faces.new(vs); c.paint(vs, dark)   # the lamp and the fender
    c.ball((3.7, 0, 1.75), 0.19, '#2a2f38', scale=(0.9, 1.1, 1.7)); c.ball((3.7, 0, 2.22), 0.11, '#d9b494', rough=0.6); c.cyl((3.7, 0, 2.28), 0.13, 0.09, '#1c1c1e', seg=12)           # the motorman
    sway = 0.03 * math.sin(frame * 1.3); tip = Vector((-3.6 + sway, 0, 5.52)); c.rod((-0.6, 0, 3.4), tip, 0.035, dark, seg=6); c.cyl((-0.6, 0, 3.36), 0.16, 0.12, dark, seg=10); c.rod(tip + Vector((-0.1, 0, 0)), tip + Vector((0.1, 0, 0)), 0.07, '#8a7a62', seg=8)
    if frame == 5: c.ball(tip + Vector((0, 0, 0.08)), 0.2, '#cfe8ff', emit=14.0)                                                                                                         # a spark where the pole meets the wire
    c.done(smooth=False)

def job_streetcar():
    FRAMES, PX = 6, 34; size = (12.0, 6.2); res = (int(size[0] * PX), int(size[1] * PX)); paths = []
    for f in range(FRAMES):
        bpy.ops.wm.read_factory_settings(use_empty=True); MATS.clear(); scene, cam = stage(size[0], size[1], (0.4, 0, 2.85), res, clear=True)
        build_streetcar(f); os.makedirs(OUT, exist_ok=True); path = os.path.join(OUT, 'streetcar-%d.png' % f); scene.render.filepath = path; bpy.ops.render.render(write_still=True); painted(path, FLAGS['--paint'] or 2); paths.append(path)
    print('sheet', sheet(paths, os.path.join(OUT, 'streetcar.png')))

# =====================================================================================================================
# the street, 1954 to today: the subway's years
# =====================================================================================================================
# The view is still across to the north side of a street, but the ride now runs in an open cut in front of it, as the
# Yonge line does north of Bloor: a ballasted track below street level, a concrete wall, a fence. The street slides at
# 0.58 of the train's speed, drawn at 14 dots to the metre, three pieces long.
# SOURCED: that seven things existed by their year (scenery.js): New City Hall (1965), the TD tower (1967), Ontario
# Place (1971), the CN Tower (1976), the Eaton Centre (1977), SkyDome (1989) and the Crystal at the ROM (2007).
# Hurricane Hazel (1954) is drawn by the game as rain over the first year, not here.
# DRAWING: how all of them look; they are small models of themselves, far smaller than life, on one street they
# never shared, and some stand a little past their year to stand clear of each other. Also drawing: every other
# building and how the street changes, the cars, lamps, trees and people, and the sky, which is drawn clearing from
# the smoke of the coal years to blue.
metro_x = lambda y: ((y - 1954) * 92 * 0.58 + 196) / 14
PLACES = {'cityhall': (50, 22), 'td': (69, 12), 'ontarioplace': (86, 18), 'cntower': (101, 8), 'eaton': (118, 22), 'skydome': (148, 24), 'crystal': (216, 20)}
GLASS = '#2f4050'

def tilted(b, at, size, colour, turns, **kw):   # a box turned about any of its axes: turns is a list of (angle, axis)
    g = bmesh.ops.create_cube(b.bm, size=1.0)['verts']; bmesh.ops.scale(b.bm, verts=g, vec=size)
    for a, axis in turns: bmesh.ops.rotate(b.bm, verts=g, cent=(0, 0, 0), matrix=Matrix.Rotation(a, 3, axis))
    bmesh.ops.translate(b.bm, verts=g, vec=at); return b.paint(g, colour, **kw)
def city_hall(x):
    b = Make('cityhall'); conc = '#e3ddd0'
    b.box((0, 6, 0), (22, 9, 2.2), '#d3cdc0'); g = b.ball((0, 5.5, 3.6), 1.0, '#f1ede4', scale=(4.6, 4.0, 1.5), seg=24)
    for side, tall in ((1, 26.0), (-1, 20.5)):                       # two curved towers, the east one taller, bending round the council chamber
        for i in range(9):
            th = math.radians(-52 + 13 * i); cx, cy = side * 8.6 * math.cos(th), 5.5 + 8.6 * math.sin(th)
            b.box((cx, cy, 2.2), (2.1, 1.0, tall - 2.2), conc, turn=side * th + math.pi / 2)
            b.box((side * 8.05 * math.cos(th), 5.5 + 8.05 * math.sin(th), 2.6), (1.9, 0.3, tall - 3.0), GLASS, turn=side * th + math.pi / 2, rough=0.2)
    return b.done((x, 5, 0.45), smooth=False)
def td_centre(x):
    b = Make('td'); blk = '#202327'
    for cx, w, h in ((-2.2, 6.4, 27.5), (3.6, 4.6, 21)):
        b.box((cx, 5, 0), (w, 5.5, h), blk, rough=0.35)
        for i in range(int(w / 0.55) + 1): b.box((cx - w / 2 + i * 0.55, 2.2, 1.6), (0.07, 0.1, h - 1.6), '#4a4640')
        for z in range(2, int(h), 1): b.box((cx, 2.22, z + 0.0), (w, 0.04, 0.07), '#3a3d42')
    b.box((1.5, 1.6, 0), (4, 3, 2.6), blk, rough=0.35)
    return b.done((x, 6, 0.45))
def ontario_place(x):
    b = Make('ontarioplace'); b.box((0, 6, 0), (18, 9, 0.12), '#3f7f93', rough=0.08)
    g = bmesh.ops.create_icosphere(b.bm, subdivisions=2, radius=4.3)['verts']; bmesh.ops.translate(b.bm, verts=g, vec=(-4.6, 6, 4.9)); b.paint(g, '#f3f1ea')
    for px in (3.0, 8.0):
        for lx in (-1.9, 1.9):
            for ly in (-1.9, 1.9): b.rod((px + lx, 6 + ly, 0), (px + lx * 0.6, 6 + ly * 0.6, 5.2), 0.14, '#d9d6cf', seg=6)
        b.box((px, 6, 5.2), (5, 5, 2.4), '#f1eee6'); b.box((px, 3.47, 5.9), (4.4, 0.08, 1.0), GLASS, rough=0.2)
    b.box((0.5, 6, 6.0), (5.5, 1.1, 1.0), '#e3dfd6')
    return b.done((x, 5, 0.45))
def cn_tower(x):
    b = Make('cntower'); conc = '#cfcabd'
    b.box((0, 0, 0), (7, 5, 1.6), '#bdb7aa'); b.cyl((0, 0, 1.6), 1.35, 15.4, conc, r2=0.72, seg=18)
    for k in range(3): a = math.radians(90 + 120 * k); b.box((math.cos(a) * 0.9, math.sin(a) * 0.9, 1.6), (0.5, 2.0, 12.5), conc, turn=a + math.pi / 2)
    b.cyl((0, 0, 17.0), 1.15, 0.5, conc, r2=1.95, seg=20); b.cyl((0, 0, 17.5), 1.95, 0.75, '#f1eee6', seg=20); b.cyl((0, 0, 17.6), 1.97, 0.3, GLASS, seg=20, rough=0.2); b.cyl((0, 0, 18.25), 1.5, 0.9, conc, r2=1.1, seg=20)
    b.cyl((0, 0, 19.15), 0.6, 4.3, conc, r2=0.34, seg=12); b.cyl((0, 0, 23.45), 0.16, 4.2, '#f3f1ea', r2=0.04, seg=8); b.cyl((0, 0, 25.4), 0.1, 0.9, '#c0352f', seg=8)
    return b.done((x, 7, 0.45), smooth=True)
def eaton_centre(x):
    b = Make('eaton'); st = '#d9d4c8'
    b.box((-7.5, 6, 0), (7, 9, 12.5), '#cdbf9f'); grid(b, -10.5, -4.5, 1.5, 4.4, 3, 5, 0.85, 1.7, 2.7); b.box((-7.5, 1.45, 0), (6.4, 0.1, 3.2), GLASS, rough=0.2)
    b.box((3.5, 6, 0), (15, 8, 7.6), st); b.box((3.5, 1.95, 0.4), (14.2, 0.1, 6.6), GLASS, rough=0.15)
    for i in range(8): b.box((-3.6 + i * 2.03, 1.9, 0), (0.22, 0.14, 7.6), '#f1eee6')
    g = b.rod((-4, 6, 7.6), (11, 6, 7.6), 3.4, '#a9cdd9', seg=18, rough=0.12)
    for v in g: v.co.z = max(v.co.z, 7.6)
    for i in range(8): b.box((-3.6 + i * 2.03, 6, 7.6), (0.16, 6.9, 0.1), '#f1eee6')
    return b.done((x, 5, 0.45))
def skydome(x):
    b = Make('skydome'); conc = '#d6d1c6'
    g = b.cyl((0, 7, 0), 11.2, 6.6, conc, seg=36)
    for v in g: v.co.y = 7 + (v.co.y - 7) * 0.62
    for i in range(18): a = math.radians(190 + i * 9.4); b.box((11.25 * math.cos(a), 7 + 11.25 * 0.62 * math.sin(a), 1.2), (0.9, 0.12, 3.6), GLASS, turn=a + math.pi / 2, rough=0.2)
    g = b.ball((0, 7, 6.5), 1.0, '#f3f1ea', scale=(11.0, 6.8, 6.2), seg=36)
    for v in g: v.co.z = max(v.co.z, 6.6)
    for k in (0.33, 0.62, 0.86):       # the roof is in sections that slide over one another: show their edges
        for i in range(20): t0, t1 = math.pi * i / 20, math.pi * (i + 1) / 20; p = lambda t: (-11.05 * k * math.cos(t), 7 - 6.85 * math.sqrt(max(0.0, 1 - k * k)) * 0.999, 6.5 + 6.25 * k * math.sin(t)); b.rod(p(t0), p(t1), 0.07, '#9aa0a0', seg=4)
    return b.done((x, 4, 0.45), smooth=True)
def rom_crystal(x):
    b = Make('crystal'); st = '#bfae8c'; al = '#cdd2d6'
    b.box((0, 7, 0), (20, 7, 10.5), st); b.gable((0, 7, 10.5), 20, 7, 2.6, SLATE); grid(b, -9, 9, 3.5, 1.6, 3, 9, 0.9, 1.9, 3.0)
    for at, size, turns in (((-2.5, 2.2, 6.0), (7.5, 5.5, 11), ((0.42, 'Y'), (0.2, 'X'))), ((2.8, 1.6, 5.2), (6.5, 5, 9.5), ((-0.5, 'Y'), (-0.15, 'X'))), ((0.3, 0.8, 3.4), (5, 4.2, 7), ((0.12, 'Y'), (0.45, 'X'), (0.5, 'Z')))):
        tilted(b, at, size, al, turns, rough=0.3)
    for at, size, turns in (((-3.4, -0.4, 6.4), (0.5, 0.2, 7.5), ((0.42, 'Y'),)), ((3.6, -0.75, 5.4), (0.45, 0.2, 6.2), ((-0.5, 'Y'),)), ((-0.6, -1.2, 3.2), (3.4, 0.2, 0.5), ((0.3, 'Y'),))): tilted(b, at, size, GLASS, turns, rough=0.15)
    return b.done((x, 5, 0.45), smooth=False)

def modern(x, w, storeys, kind):   # the buildings of the last seventy years, plainest first
    b = Make('modern'); d = 10; g = 4.4; h = g + 3.5 * (storeys - 1)
    if kind == 'brick':        # the 1950s: buff brick, long strips of window
        c = random.choice(['#cdb58a', '#c9a878', '#b98f6a', '#d6c7a6']); b.box((0, d / 2, 0), (w, d, h), c)
        for s in range(1, storeys): b.box((0, -0.05, g + 0.9 + (s - 1) * 3.5), (w - 1.2, 0.1, 1.5), GLASS, rough=0.2)
        b.box((0, -0.06, 0), (w - 0.8, 0.12, 3.3), '#27303a', rough=0.2); b.box((0, -0.4, 3.4), (w, 1.0, 0.3), '#e6e0d2')
    elif kind == 'concrete':   # the 1960s and 70s: a grid of concrete
        c = random.choice(['#c9c3b6', '#b9b3a6', '#d6d0c2']); b.box((0, d / 2, 0), (w, d, h), GLASS, rough=0.2); n = max(3, int(w / 1.7))
        for i in range(n + 1): b.box((-w / 2 + w * i / n, -0.12, 0), (0.42, 0.5, h), c)
        for s in range(storeys + 1): b.box((0, -0.12, g + (s - 1) * 3.5 if s else 3.6), (w, 0.5, 0.75), c)
    elif kind == 'glass':      # the 1980s on: a sheer wall of tinted glass
        c = random.choice(['#3f6272', '#2f4a44', '#4a5a6a', '#5a7f8a', '#3a3f4a']); b.box((0, d / 2, 0), (w, d, h), c, rough=0.12); n = max(3, int(w / 1.4))
        for i in range(n + 1): b.box((-w / 2 + w * i / n, -0.03, 0), (0.06, 0.06, h), '#c9ced2')
        for s in range(1, storeys): b.box((0, -0.03, g + (s - 1) * 3.5), (w, 0.06, 0.08), '#c9ced2')
        b.box((0, -0.06, 0), (w * 0.4, 0.14, 3.6), '#1f262c', rough=0.1)
    else:                      # the 2000s on: flats behind glass, a balcony to each floor
        c = random.choice(['#8fb1bd', '#a9c3c9', '#7f9aa6']); b.box((0, d / 2, 0), (w, d, h), c, rough=0.14)
        for s in range(1, storeys): z = g + (s - 1) * 3.5; b.box((0, -0.5, z), (w - 0.6, 1.0, 0.16), '#f1eee6'); b.box((0, -0.98, z + 0.16), (w - 0.6, 0.05, 0.95), '#dfe9ec', rough=0.1)
        b.box((0, -0.06, 0), (w - 0.5, 0.14, 3.7), '#27303a', rough=0.15); b.box((0, -0.3, 3.8), (w, 0.8, 0.35), random.choice(['#3a3632', '#c0352f', '#2f4a3a', '#e9b44c']))
    b.box((0, d / 2, h), (w, d, 0.4), '#5a5a5a')
    return b.done((x, 3.2, 0.35))
def tower(x, w, h, kind):   # the tall ones behind, their tops out of the picture
    b = Make('tower'); c = {'slab': '#b9b3a6', 'dark': '#2a3038', 'blue': '#5f8fa8', 'green': '#4f7f78', 'pale': '#b9d0d9'}[kind]
    b.box((0, 0, 0), (w, 7, h), c, rough=0.15 if kind != 'slab' else 0.8)
    for s in range(int(h / 3.2)): b.box((0, -3.52, 1.6 + s * 3.2), (w - (0.8 if kind == 'slab' else 0), 0.06, 1.7 if kind == 'slab' else 0.12), GLASS if kind == 'slab' else '#dfe4e6', rough=0.2)
    return b.done((x, 19, 0.35))
def motor2(x, yr):
    b = Make('motor2')
    if yr < 1967:    # long and low, two colours, a fin at the back
        c, c2 = random.choice([('#7fb3b0', '#f1eee6'), ('#c0453a', '#f1eee6'), ('#e3cf8a', '#3a3632'), ('#3f5f7a', '#dfe4e6')])
        b.box((0, 0, 0.36), (4.9, 1.75, 0.55), c); b.box((-0.2, 0, 0.91), (2.4, 1.6, 0.55), c2); b.box((-0.2, -0.81, 1.0), (2.1, 0.03, 0.36), '#aab7bd', rough=0.2); b.box((-2.25, 0, 0.91), (0.5, 1.7, 0.22), c); r = 0.34
    elif yr < 1986:  # square-cut
        c = random.choice(['#8a6a3a', '#5a6a4a', '#b9a888', '#7a2f2a', '#3f5f7a', '#d9d4c8', '#6a5a4a'])
        b.box((0, 0, 0.34), (4.6, 1.75, 0.6), c); b.box((-0.25, 0, 0.94), (2.5, 1.62, 0.55), c); b.box((-0.25, -0.82, 1.02), (2.2, 0.03, 0.38), '#aab7bd', rough=0.2); r = 0.33
    elif yr < 2006:  # rounded
        c = random.choice(['#3f6a4a', '#7a2f3a', '#3a4a6a', '#b9b9b4', '#c9c2a8', '#22252a', '#5a7f8a'])
        b.ball((0, 0, 0.66), 1.0, c, scale=(2.25, 0.86, 0.36), seg=18, rough=0.35); b.ball((-0.2, 0, 1.0), 1.0, c, scale=(1.3, 0.78, 0.36), seg=18, rough=0.35); b.box((-0.2, -0.76, 1.0), (1.7, 0.03, 0.32), '#aab7bd', rough=0.2); r = 0.32
    else:            # taller, with big wheels
        c = random.choice(['#f1eee6', '#22252a', '#8f959a', '#3a4a5a', '#a8352b', '#5a6a6a'])
        b.ball((0, 0, 0.82), 1.0, c, scale=(2.3, 0.9, 0.52), seg=18, rough=0.3); b.ball((-0.25, 0, 1.3), 1.0, c, scale=(1.5, 0.84, 0.42), seg=18, rough=0.3); b.box((-0.25, -0.8, 1.32), (2.2, 0.03, 0.36), '#3a4650', rough=0.15); r = 0.4
    for wx in (-1.45, 1.45):
        for sy in (-0.84, 0.84): b.rod((wx, sy - 0.09, r), (wx, sy + 0.09, r), r, '#1c1c1e', seg=14); b.rod((wx, sy - 0.11, r), (wx, sy + 0.11, r), r * 0.5, '#b9b9b4', seg=10)
    return b.done((x, -1.9, 0.0), smooth=yr >= 1986)
def walker(x, y):
    b = Make('walker'); skin = random.choice(['#e0b896', '#c99872', '#8f6248', '#5f4232', '#d9b08a', '#a87858']); top = random.choice(['#c0352f', '#3f6fa0', '#e9b44c', '#3a3632', '#4f8f6a', '#8a5fa0', '#f1eee6', '#e0783a', '#2f4a5a']); legs = random.choice(['#2f3a4a', '#3a3632', '#5a6a8a', '#8a7a62', '#22252a'])
    for sy in (-0.09, 0.09): b.cyl((0.04 * (1 if sy > 0 else -1), sy, 0), 0.08, 0.86, legs, seg=8)
    b.ball((0, 0, 1.17), 0.2, top, scale=(0.9, 1.1, 1.6)); b.ball((0, 0, 1.6), 0.115, skin, rough=0.6); b.ball((-0.01, 0, 1.66), 0.118, random.choice(['#1f1a16', '#3a2c22', '#6a5a3a', '#8f8a80', '#b9a060']), scale=(1.05, 1.02, 0.75))
    return b.done((x, y, 0.5), smooth=True)
def cobra(x):
    b = Make('cobra'); b.cyl((0, 0, 0), 0.13, 9.5, '#8f959a', r2=0.08, seg=8); b.rod((0, 0, 9.4), (0, -2.6, 9.9), 0.05, '#8f959a'); b.box((0, -2.9, 9.75), (0.4, 0.9, 0.16), '#8f959a'); b.box((0, -2.9, 9.7), (0.3, 0.7, 0.05), '#fff3d0', emit=3.0)
    return b.done((x, 0.4, 0.45))
def signal(x):
    b = Make('signal'); b.cyl((0, 0, 0), 0.1, 5.2, '#3a3d42', seg=8); b.box((0, -0.2, 4.0), (0.42, 0.3, 1.2), '#e9b44c')
    for k, c in enumerate(('#3fa85a', '#e9b44c', '#d93a2f')): b.ball((0, -0.36, 4.2 + k * 0.38), 0.13, c, emit=2.0 if k == 0 else 0.3)
    return b.done((x, 0.4, 0.45))
def street_tree(x):
    b = Make('streettree'); b.cyl((0, 0, 0), 0.12, 3.0, '#5a4333', r2=0.07, seg=7)
    for k in range(9): a = random.uniform(0, math.tau); r = random.uniform(0, 1.0); b.clump((math.cos(a) * r, math.sin(a) * r, random.uniform(3.0, 5.2)), random.uniform(0.8, 1.25), random.choice(['#55783a', '#6d8c3c', '#7e9544', '#4a6e34']), rough=0.95)
    return b.done((x, 0.9, 0.45))

def build_metro():
    total = 3 * STREET_PIECE
    g = Make('ground'); g.box((total / 2, -1.9, -0.2), (total + 200, 4.2, 0.2), '#66646a', rough=1.0)                                   # the street's near lane, where the cars stand
    g.box((total / 2, 1.6, 0), (total + 200, 3.4, 0.45), '#bdb7ab'); g.box((total / 2, -0.12, 0), (total + 200, 0.25, 0.46), '#8f887a'); g.box((total / 2, 40, 0), (total + 200, 70, 0.35), '#8f8a80')
    g.box((total / 2, -4.2, -1.4), (total + 200, 0.4, 1.9), '#b3aea3')                                                                    # the wall of the cut
    for i in range(int((total + 200) / 2.4)): g.box((-100 + i * 2.4, -4.2, 0.5), (0.07, 0.07, 1.2), '#5a5f66')
    for z in (1.0, 1.65): g.box((total / 2, -4.2, z), (total + 200, 0.04, 0.05), '#5a5f66')
    g.box((total / 2, -42, -1.6), (total + 200, 76, 0.2), '#7c776f', rough=1.0)                                                           # the ballast
    for i in range(int((total + 200) / 0.75)): g.box((-100 + i * 0.75, -9.25, -1.4), (0.26, 2.7, 0.06), '#4f4538')                        # the ties
    for ry in (-8.5, -10.0): g.box((total / 2, ry, -1.34), (total + 200, 0.08, 0.14), '#b9b9b4', rough=0.3)
    g.box((total / 2, -11.0, -1.3), (total + 200, 0.12, 0.2), '#3a3d42')                                                                  # the third rail, under its board
    for i in range(1200): px, py = random.uniform(-60, total + 60), random.uniform(-70, -5); g.box((px, py, -1.4), (random.uniform(0.2, 0.7), random.uniform(0.1, 0.3), 0.012), random.choice(['#5f5a52', '#958f85', '#6f6a62']), rough=1.0)
    g.done()
    sky = Make('sky'); vs = [sky.bm.verts.new(p) for p in ((-100, 62, -20), (total + 100, 62, -20), (total + 100, 62, 40), (-100, 62, 40))]; sky.bm.faces.new(vs); so = sky.done()
    m = bpy.data.materials.new('sky'); m.use_nodes = True; nt = m.node_tree; nt.nodes.remove(nt.nodes.get('Principled BSDF')); em = nt.nodes.new('ShaderNodeEmission'); outn = nt.nodes.get('Material Output')
    geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); span = nt.nodes.new('ShaderNodeMapRange'); along = nt.nodes.new('ShaderNodeMapRange'); mix = nt.nodes.new('ShaderNodeMixRGB')
    span.inputs['From Min'].default_value = -4; span.inputs['From Max'].default_value = 26; along.inputs['From Min'].default_value = metro_x(1958); along.inputs['From Max'].default_value = metro_x(1988)
    ramps = []
    for cols in (('#eedcc4', '#e0d5c6', '#b9c7d2', '#86a3bf'), ('#f6e6cf', '#cfe2f0', '#8fbde6', '#4a8fd2')):   # the smoky sky of the coal years, and the clearer one after
        r = nt.nodes.new('ShaderNodeValToRGB'); e = r.color_ramp.elements; e[0].position = 0; e[0].color = rgb(cols[0]); e[1].position = 1; e[1].color = rgb(cols[3])
        for p, c in ((0.3, cols[1]), (0.6, cols[2])): r.color_ramp.elements.new(p).color = rgb(c)
        nt.links.new(span.outputs['Result'], r.inputs['Fac']); ramps.append(r)
    nt.links.new(geo.outputs['Position'], sep.inputs['Vector']); nt.links.new(sep.outputs['Z'], span.inputs['Value']); nt.links.new(sep.outputs['X'], along.inputs['Value']); nt.links.new(along.outputs['Result'], mix.inputs['Fac'])
    nt.links.new(ramps[0].outputs['Color'], mix.inputs['Color1']); nt.links.new(ramps[1].outputs['Color'], mix.inputs['Color2']); nt.links.new(mix.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs['Emission'], outn.inputs['Surface']); so.data.materials.append(m)
    lumps = bpy.data.textures.new('lumps', 'CLOUDS'); lumps.noise_scale = 0.5
    for k in range(10):
        c = Make('cloud'); w = random.uniform(1.0, 2.0)
        for j in range(random.randint(12, 20)):
            x = random.uniform(-1, 1) * w; tall = 1 - 0.6 * (abs(x) / w) ** 1.5; s = random.uniform(0.2, 0.4) * tall
            c.ball((x, random.uniform(-0.2, 0.2), random.uniform(0.1, 0.7) * tall * 0.7 + s * 0.4), s, '#fbf6ec', scale=(1.25, 0.6, 0.8), seg=16, rough=1.0, sub=0.5)
        for v in c.bm.verts: v.co.z = max(v.co.z, 0.05)
        o = c.done((total * (k + random.uniform(-0.3, 0.3)) / 9, random.uniform(54, 60), random.uniform(14, 20)), smooth=True); size = random.uniform(6, 10); o.scale = (size, size, size * 0.7)
        o.modifiers.new('lumps', 'DISPLACE').texture = lumps; o.modifiers['lumps'].strength = 0.2
    for name, fn in (('cityhall', city_hall), ('td', td_centre), ('ontarioplace', ontario_place), ('cntower', cn_tower), ('eaton', eaton_centre), ('skydome', skydome), ('crystal', rom_crystal)): fn(PLACES[name][0])
    taken = [(c - w / 2 - 0.6, c + w / 2 + 0.6) for c, w in PLACES.values()]; year_at = lambda x: 1954 + (x * 14 - 196) / (92 * 0.58)
    BRICK = ['#9c5a44', '#a8684a', '#8d4f3d', '#c7a274']; STONE2 = ['#d6ccb4', '#c9bfa6', '#b9b3a6']
    x = -30.0
    while x < total + 30:
        yr = year_at(x); w = random.uniform(7, 12); hit = next((t for t in taken if x < t[1] and x + w > t[0]), None)
        if hit: x = hit[1]; continue
        k = random.random()
        if yr < 1962: (shop(x + w / 2, w, random.choice((3, 4)), random.choice(BRICK), awning=random.choice([None, '#b8483a', '#3f6a5a'])) if k < 0.35 else office(x + w / 2, w, random.choice((4, 5, 6)), random.choice(STONE2), deco=k < 0.6) if k < 0.7 else modern(x + w / 2, w, random.choice((3, 4, 5)), 'brick'))
        elif yr < 1982: (office(x + w / 2, w, random.choice((4, 5)), random.choice(STONE2 + BRICK)) if k < 0.2 else modern(x + w / 2, w, random.choice((4, 5, 6, 7)), 'brick' if k < 0.45 else 'concrete'))
        elif yr < 2004: modern(x + w / 2, w, random.choice((5, 6, 7)), 'concrete' if k < 0.3 else 'glass')
        else: (shop(x + w / 2, w, 3, random.choice(BRICK)) if k < 0.12 else modern(x + w / 2, w, random.choice((5, 6, 7)), 'glass' if k < 0.45 else 'flats'))   # an old front kept here and there
        x += w
    tx = metro_x(1958)
    while tx < total + 30:                                                                           # the tall ones behind: slabs first, then glass, more of them each decade
        yr = year_at(tx); w = random.uniform(9, 15)
        if not any(a - 2 < tx < b + 2 for a, b in taken): tower(tx, w, random.uniform(24, 34) + (yr - 1958) * 0.25, 'slab' if yr < 1975 else random.choice(('dark', 'blue', 'green')) if yr < 2005 else random.choice(('blue', 'pale', 'pale', 'green')))
        tx += w + max(2, 46 - (yr - 1958) * 0.7) * random.uniform(0.5, 1.2)
    lx = -20.0
    while lx < total + 20: cobra(lx); lx += 31
    for sx in (metro_x(1961), metro_x(1984), metro_x(1999), metro_x(2016)): signal(sx)
    tx = metro_x(1972)
    while tx < total + 20: street_tree(tx); tx += random.uniform(13, 24)                            # trees planted along the street from the 1970s
    for i in range(int(total / 2.3)):
        px = random.uniform(-10, total + 10); yr = year_at(px)
        if any(a < px < b for a, b in taken) and random.random() < 0.4: continue
        (person(px, random.uniform(0.7, 2.6), 'woman' if random.random() < 0.45 else 'man', 1) if yr < 1962 and random.random() < 0.7 else walker(px, random.uniform(0.7, 2.6)))
    cx = -20.0
    while cx < total + 20: motor2(cx, year_at(cx)); cx += random.uniform(6.5, 13)

def job_metro():
    bpy.ops.wm.read_factory_settings(use_empty=True); res = (int(STREET_PIECE * STREET_PPM), int(STREET_H * STREET_PPM)); up = Vector((0, math.sin(PITCH), math.cos(PITCH)))
    scene, cam = stage(STREET_PIECE, STREET_H, (0, 0, 0), res); build_metro(); os.makedirs(OUT, exist_ok=True)
    for i in range(3):
        if FLAGS['--only'] >= 0 and i != FLAGS['--only']: continue
        centre = Vector(((i + 0.5) * STREET_PIECE, 0, 0.45)) + up * ((396 / 540 - 0.5) * STREET_H); look = Vector((0, math.cos(PITCH), -math.sin(PITCH))); cam.location = centre - look * 300
        path = os.path.join(OUT, 'metro-%d.png' % i); scene.render.filepath = path; bpy.ops.render.render(write_still=True); print('painted', painted(path, FLAGS['--paint'] or 3, path.replace('.png', '.jpg'))); os.remove(path)

# ---- the subway train: one car. "red" is the 1954 car the game has always used (red sides, thin yellow lines, a grey
# roof, paired windows); "silver" is a drawing of the aluminium cars that came after, used from 1990 on. ----
def build_subway(kind):
    c = Make('subway'); body, line, roof = ('#a8232a', '#e9c44c', '#7d848a') if kind == 'red' else ('#c9cdd1', '#b8232f', '#9aa0a6'); dark = '#26262a'; L = 11.4
    c.box((0, 0, 0.62), (L, 2.7, 2.95), body, rough=0.5 if kind == 'red' else 0.3); c.box((0, 0, 3.57), (L - 0.3, 2.4, 0.28), roof)
    for z in ((1.75, 3.3) if kind == 'red' else (1.55,)): c.box((0, -1.36, z), (L + 0.02, 0.03, 0.09 if kind == 'red' else 0.3), line)
    for dx in (-3.6, 0, 3.6):                                                                       # three pairs of doors
        c.box((dx, -1.37, 0.7), (1.5, 0.04, 2.55), blend(body, '#000000', 0.18)); c.box((dx, -1.4, 0.7), (0.04, 0.04, 2.55), dark)
        for s in (-0.38, 0.38): c.box((dx + s, -1.4, 2.0), (0.42, 0.04, 0.85), '#2f3a44', rough=0.2)
    for wx in (-4.95, -2.2, -1.4, 1.4, 2.2, 4.95): c.box((wx, -1.38, 2.0), (0.62, 0.04, 0.95), '#2f3a44', rough=0.2)   # the windows between the doors, in pairs
    for sy in (-0.85, 0, 0.85): c.box((L / 2 + 0.01, sy, 2.05), (0.04, 0.6, 1.0 if sy else 1.25), '#2f3a44', rough=0.2)
    c.box((L / 2 + 0.01, 0, 3.2), (0.04, 1.1, 0.3), dark)
    for sy in (-1.0, 1.0): c.ball((L / 2 + 0.03, sy, 3.25), 0.13, '#fff0b8', emit=3.5)
    c.box((0, 0, 0.3), (L - 1.0, 2.2, 0.36), dark); c.box((L / 2 + 0.25, 0, 0.55), (0.5, 0.5, 0.3), dark)
    for wx in (-4.1, -2.9, 2.9, 4.1): c.rod((wx, -1.12, 0.38), (wx, -1.0, 0.38), 0.38, dark, seg=18); c.rod((wx, -1.15, 0.38), (wx, -1.0, 0.38), 0.14, '#8f959a', seg=10)
    c.done(smooth=False)

def job_subway():
    PX = 34; size = (13.2, 4.8); res = (int(size[0] * PX), int(size[1] * PX))
    for kind, name in (('red', 'subway.png'), ('silver', 'subway2.png')):
        bpy.ops.wm.read_factory_settings(use_empty=True); MATS.clear(); scene, cam = stage(size[0], size[1], (0.3, 0, 2.05), res, clear=True)
        build_subway(kind); os.makedirs(OUT, exist_ok=True); path = os.path.join(OUT, name); scene.render.filepath = path; bpy.ops.render.render(write_still=True); painted(path, FLAGS['--paint'] or 2); print('rendered', path)

def job_works():
    PX = 34; size = (3.0, 2.0); res = (int(size[0] * PX), int(size[1] * PX))
    for kind in ('cone', 'barrier'):
        bpy.ops.wm.read_factory_settings(use_empty=True); MATS.clear(); scene, cam = stage(size[0], size[1], (0, 0, 0.55), res, clear=True); b = Make(kind)
        if kind == 'cone': b.box((0, 0, 0), (0.75, 0.75, 0.06), '#e8762c'); b.cyl((0, 0, 0.06), 0.3, 1.0, '#e8762c', r2=0.05, seg=18); b.cyl((0, 0, 0.42), 0.215, 0.2, '#f3f1ea', r2=0.165, seg=18)
        else:
            b.box((0, 0, 0.55), (1.9, 0.1, 0.42), '#f3f1ea')
            for i in range(4): b.box((-0.72 + i * 0.48, -0.06, 0.55), (0.22, 0.04, 0.42), '#c0352f')
            for sx in (-0.8, 0.8): b.box((sx, 0, 0), (0.09, 0.09, 1.0), '#3a3d42'); b.box((sx, 0, 0), (0.09, 0.7, 0.06), '#3a3d42')
        b.done(smooth=kind == 'cone'); os.makedirs(OUT, exist_ok=True); path = os.path.join(OUT, kind + '.png'); scene.render.filepath = path; bpy.ops.render.render(write_still=True); painted(path, FLAGS['--paint'] or 2); print('rendered', path)

{'shore': job_shore, 'canoe': job_canoe, 'props': job_props, 'street': job_street, 'horsecar': job_horsecar, 'goods': job_goods, 'town': job_town, 'streetcar': job_streetcar, 'metro': job_metro, 'subway': job_subway, 'works': job_works}[JOB]()
