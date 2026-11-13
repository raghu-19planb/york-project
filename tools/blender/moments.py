# Renders "Same place, three moments" in Blender: one fixed camera over the harbour, three shores.
#
#   blender -b --factory-startup -P tools/blender/moments.py -- <data.json> <out folder> [first city today]
#           [--scale 50] [--samples 64] [--jpeg] [--paint 4] [--view-only]
#
# <data.json> is written by tools/blender/export-moments.js. Everything the picture shows as fact comes from it:
# the ground and its water for each moment, the building footprints and heights, today's main roads, the 1834
# city limits. What is drawing here: the trees and reeds (where they stand, their kind, their number), the
# colours, the light, the depth of the water, and the vertical stretch. --paint adds a painted finish (each small
# patch takes the colour of its calmest corner), saved beside the plain render as -painted.
import bpy, bmesh, json, math, os, sys
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
FLAGS = {'--scale': 100, '--samples': 64, '--paint': 0}
for k in FLAGS:
    if k in argv: FLAGS[k] = int(argv[argv.index(k) + 1])
plain = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or argv[i - 1] not in FLAGS)]
DATA, OUT, WHICH = plain[0], plain[1], plain[2:] or ['first', 'city', 'today']
EXT = '.jpg' if '--jpeg' in argv else '.png'

D = json.load(open(DATA))
F, STEP, NX, NY = D['F'], D['step'], D['nx'], D['ny']
U = 0.01      # one Blender unit is 100 m
EX = 1.5      # heights are stretched this much so the lie of the land reads from the air
rng = np.random.default_rng(7)

def rgb(hexcode, a=1.0):  # sRGB hex to the linear colour Blender works in
    v = [int(hexcode[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple((c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4) for c in v) + (a,)

def material(name, colour=None, rough=0.9, vertex=False, emit=0.0, vary=0.0, mottle=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes.get('Principled BSDF'); base = b.inputs['Base Color']
    if colour: base.default_value = rgb(colour)
    b.inputs['Roughness'].default_value = rough
    src = None
    if vertex:
        n = nt.nodes.new('ShaderNodeVertexColor'); n.layer_name = 'Col'; src = n.outputs['Color']
    if vary:      # every copy of this object a little lighter or darker than the next
        info = nt.nodes.new('ShaderNodeObjectInfo'); hsv = nt.nodes.new('ShaderNodeHueSaturation'); span = nt.nodes.new('ShaderNodeMapRange')
        span.inputs['To Min'].default_value = 1 - vary; span.inputs['To Max'].default_value = 1 + vary
        nt.links.new(info.outputs['Random'], span.inputs['Value']); nt.links.new(span.outputs['Result'], hsv.inputs['Value'])
        hsv.inputs['Color'].default_value = rgb(colour); src = hsv.outputs['Color']
    if mottle:    # broad and fine patches of lighter and darker ground
        hsv = nt.nodes.new('ShaderNodeHueSaturation'); big = nt.nodes.new('ShaderNodeTexNoise'); span = nt.nodes.new('ShaderNodeMapRange')
        big.inputs['Scale'].default_value = 1.6; big.inputs['Detail'].default_value = 9.0
        span.inputs['To Min'].default_value = 1 - mottle; span.inputs['To Max'].default_value = 1 + mottle
        nt.links.new(big.outputs['Fac'], span.inputs['Value']); nt.links.new(span.outputs['Result'], hsv.inputs['Value'])
        if src: nt.links.new(src, hsv.inputs['Color'])
        else: hsv.inputs['Color'].default_value = rgb(colour)
        src = hsv.outputs['Color']
    if src: nt.links.new(src, base)
    if emit:
        for key in ('Emission Color', 'Emission'):
            if key in b.inputs: b.inputs[key].default_value = rgb(colour); break
        if 'Emission Strength' in b.inputs: b.inputs['Emission Strength'].default_value = emit
    return m

def new_object(name, verts, faces, mat=None):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    if mat: me.materials.append(mat)
    return ob

def paint_colours(ob, colours):
    attr = ob.data.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='POINT')
    attr.data.foreach_set('color', np.asarray(colours, dtype=np.float32).ravel())

# ---------- the stage: camera and light ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
cx, cy = (F['x0'] + F['x1']) / 2 * U, (F['y0'] + F['y1']) / 2 * U

# A long lens from far off, so the view is nearly square to the ground and the tile fills the frame edge to edge.
cam = bpy.data.objects.new('camera', bpy.data.cameras.new('camera')); scene.collection.objects.link(cam); scene.camera = cam
cam.data.lens = 135; cam.data.clip_start = 10; cam.data.clip_end = 3000
dist, tilt, aim = 262, math.radians(36), Vector((cx, cy - 1.9, 0))
cam.location = aim + Vector((0, -math.cos(tilt) * dist, math.sin(tilt) * dist))    # due south of the middle, looking north and down
cam.rotation_euler = (aim - cam.location).to_track_quat('-Z', 'Y').to_euler()

sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); scene.collection.objects.link(sun)
sun.data.energy = 4.2; sun.data.angle = math.radians(3); sun.data.color = (1.0, 0.93, 0.82)
sun.rotation_euler = (math.radians(60), 0, math.radians(-122))                      # a late-afternoon sun, low in the south-west
world = bpy.data.worlds.new('sky'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes.get('Background'); bg.inputs['Color'].default_value = rgb('#cfe0f2'); bg.inputs['Strength'].default_value = 0.9

scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'; scene.cycles.samples = FLAGS['--samples']; scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = 1920, 960, FLAGS['--scale']
scene.render.image_settings.file_format = 'JPEG' if EXT == '.jpg' else 'PNG'; scene.render.image_settings.quality = 92
for look in ('AgX - Medium High Contrast', 'Medium High Contrast'):
    try: scene.view_settings.look = look; break
    except Exception: pass

# ---------- the pieces of a moment ----------
gx = (F['x0'] + np.arange(NX) * STEP) * U
gy = (F['y0'] + np.arange(NY) * STEP) * U
C = {k: np.array(rgb(v)) for k, v in {'forest': '#66784a', 'open': '#8f9a5e', 'marsh': '#93a068', 'sand': '#dccb9d', 'town': '#d9d1c1', 'made': '#e2884c', 'road': '#b9b1a3', 'highway': '#9c958a', 'shallow': '#86c1c4', 'deep': '#2f6e86'}.items()}

def grid_mesh(name, z, step, mat):
    xs, ys = gx[::step], gy[::step]; zz = z[::step, ::step]
    X, Y = np.meshgrid(xs, ys); n, m = zz.shape
    verts = np.stack([X, Y, zz], axis=-1).reshape(-1, 3)
    idx = np.arange(n * m).reshape(n, m)
    faces = np.stack([idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]], axis=-1).reshape(-1, 4)
    ob = new_object(name, verts.tolist(), faces.tolist(), mat)
    ob.data.polygons.foreach_set('use_smooth', [True] * len(faces))
    return ob

def ground(m, look):
    z = np.array(m['z'], dtype=np.float32).reshape(NY, NX) / 10; kind = np.array(m['kind'], dtype=np.uint8).reshape(NY, NX)
    col = np.empty((NY, NX, 4)); col[:] = C['town'] if look == 'today' else C['forest'] if look == 'first' else C['open']
    col[kind == 2] = C['marsh']
    beach = (np.clip((2.2 - z) / 1.6, 0, 1) * (kind == 0))[..., None]                 # sand where the land runs down to the water
    col = col * (1 - beach) + C['sand'] * beach
    if look == 'today':
        road = np.array(m['road'], dtype=np.uint8).reshape(NY, NX)
        col[(road == 1) & (kind == 0)] = C['road']; col[(road == 2) & (kind == 0)] = C['highway']
        made = np.array(m['made'], dtype=np.float32).reshape(NY, NX)[..., None]
        col = col * (1 - 0.72 * made) + C['made'] * 0.72 * made
    col[..., 3] = 1
    ob = grid_mesh('ground', z * EX * U, 1, material('ground-' + look, None, 0.95, vertex=True, mottle=0.16 if look != 'today' else 0.05))
    paint_colours(ob, col.reshape(-1, 4))
    # the water: a flat sheet, pale over the shallows and darker out in the lake
    near = np.array(m['shallow'], dtype=np.float32).reshape(NY, NX)[::4, ::4, None] / 255
    wcol = C['deep'] * (1 - near ** 1.6) + C['shallow'] * near ** 1.6; wcol[..., 3] = 1
    wm = material('water-' + look, None, 0.1, vertex=True)
    nt = wm.node_tree; noise = nt.nodes.new('ShaderNodeTexNoise'); bump = nt.nodes.new('ShaderNodeBump')
    noise.inputs['Scale'].default_value = 14.0; noise.inputs['Detail'].default_value = 4.0; bump.inputs['Strength'].default_value = 0.05
    nt.links.new(noise.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], nt.nodes.get('Principled BSDF').inputs['Normal'])
    wob = grid_mesh('water', np.zeros((NY, NX), dtype=np.float32), 4, wm); paint_colours(wob, wcol.reshape(-1, 4))
    return [ob, wob], z, kind

def tree(name, sort, height, colour):   # one tree, drawn simply: it is seen from a kilometre up
    bm = bmesh.new()
    if sort == 'conifer':
        for base, r, h in ((0.1, 0.40, 0.42), (0.3, 0.33, 0.38), (0.48, 0.25, 0.34), (0.66, 0.16, 0.34)):
            geo = bmesh.ops.create_cone(bm, cap_ends=True, segments=9, radius1=r * height * 0.5, radius2=0, depth=h * height)
            bmesh.ops.translate(bm, verts=geo['verts'], vec=(0, 0, (base + h / 2) * height))
    elif sort == 'reed':
        for dx, dy in ((0, 0), (0.5, 0.2), (-0.3, 0.45), (0.15, -0.5)):
            geo = bmesh.ops.create_cone(bm, cap_ends=False, segments=5, radius1=height * 0.3, radius2=0, depth=height)
            bmesh.ops.translate(bm, verts=geo['verts'], vec=(dx * height, dy * height, height / 2))
    else:
        for dx, dy, dz, r in ((0, 0, 0.62, 0.34), (0.2, 0.1, 0.5, 0.27), (-0.2, 0.08, 0.52, 0.26), (0.02, -0.2, 0.5, 0.25), (0.0, 0.05, 0.8, 0.22)):
            geo = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=height * r)
            bmesh.ops.translate(bm, verts=geo['verts'], vec=(dx * height, dy * height, dz * height))
        geo = bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=height * 0.05, radius2=height * 0.04, depth=height * 0.4)
        bmesh.ops.translate(bm, verts=geo['verts'], vec=(0, 0, height * 0.2))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.polygons.foreach_set('use_smooth', [sort == 'leaf'] * len(me.polygons)); me.materials.append(material(name, colour, 0.85, vary=0.22))
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob); return ob

def scatter(z, kind, step, where, kinds, tag):   # points on a jittered grid; each kind of plant gets its share of them
    xs = np.arange(F['x0'] + step / 2, F['x1'], step); ys = np.arange(F['y0'] + step / 2, F['y1'], step)
    PX, PY = np.meshgrid(xs, ys); PX = PX + (rng.random(PX.shape) - 0.5) * step; PY = PY + (rng.random(PY.shape) - 0.5) * step
    i = np.clip(np.round((PX - F['x0']) / STEP).astype(int), 0, NX - 1); j = np.clip(np.round((PY - F['y0']) / STEP).astype(int), 0, NY - 1)
    keep = where(PX, PY, kind[j, i], z[j, i])
    pts = np.stack([PX[keep] * U, PY[keep] * U, z[j, i][keep] * EX * U], axis=-1); pick = rng.integers(0, len(kinds), len(pts)); made = []
    for n, (sort, h, colour) in enumerate(kinds):
        holder = new_object('%s%d' % (tag, n), pts[pick == n].tolist(), [])
        t = tree('%s-tree%d' % (tag, n), sort, h, colour); t.parent = holder; holder.instance_type = 'VERTS'; made += [holder, t]
    return made, len(pts)

WOODS = [('conifer', 0.66, '#2f4d2b'), ('conifer', 0.54, '#3a5c33'), ('conifer', 0.44, '#33552f'), ('leaf', 0.52, '#4b7436'), ('leaf', 0.44, '#5a8238'), ('leaf', 0.38, '#6c8f3e'), ('leaf', 0.47, '#42692f')]
def plants(z, kind, share):
    def woods(x, y, k, h): return (k == 0) & (h > 1.5) & (rng.random(x.shape) < share) & ((y > 100) | (rng.random(x.shape) < 0.2))   # the sand bar is thinly wooded
    def reeds(x, y, k, h): return (k == 2) & (rng.random(x.shape) < 0.8)
    a, n = scatter(z, kind, 30, woods, WOODS, 'wood')
    b, r = scatter(z, kind, 22, reeds, [('reed', 0.1, '#7f8f4c'), ('reed', 0.085, '#a39a58'), ('reed', 0.07, '#6f8748')], 'reed')
    print('trees', n, 'reed tufts', r); return a + b

def buildings(z):
    mats = {'h': material('recorded', '#f6f1e6', 0.6), 'l': material('storeys', '#e6d3ad', 0.6), 'n': material('unknown', '#cdc6b8', 0.6)}
    order = list(mats); verts, faces, slot = [], [], []
    for cls, h, f in D['buildings']:
        pts = [(f[i], f[i + 1]) for i in range(0, len(f), 2)]
        if pts[0] == pts[-1]: pts.pop()
        pts = [p for k, p in enumerate(pts) if math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]) > 0.05]   # a point drawn twice makes a roof with no direction, which renders black
        if len(pts) < 3: continue
        area = sum(pts[k][0] * pts[(k + 1) % len(pts)][1] - pts[(k + 1) % len(pts)][0] * pts[k][1] for k in range(len(pts)))
        if area < 0: pts.reverse()                                   # every footprint the same way round, so every roof faces up
        mx, my = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
        i = min(NX - 1, max(0, round((mx - F['x0']) / STEP))); j = min(NY - 1, max(0, round((my - F['y0']) / STEP)))
        zb = max(float(z[j, i]), 0.9) * EX * U - 0.002; zt = zb + h * EX * U; n0 = len(verts); n = len(pts); s = order.index(cls) if cls in mats else 2
        verts += [(x * U, y * U, zb) for x, y in pts] + [(x * U, y * U, zt) for x, y in pts]
        faces.append(tuple(range(n0 + n, n0 + 2 * n))); slot.append(s)
        for k in range(n): faces.append((n0 + k, n0 + (k + 1) % n, n0 + n + (k + 1) % n, n0 + n + k)); slot.append(s)
    ob = new_object('buildings', verts, faces)
    for key in order: ob.data.materials.append(mats[key])
    ob.data.polygons.foreach_set('material_index', slot)
    bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4]); bmesh.ops.dissolve_degenerate(bm, dist=0.00002, edges=bm.edges[:]); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(ob.data); bm.free()   # roofs with dents are cut into triangles, so none is left twisted
    return ob

def limits(z):   # the 1834 city limits: a dashed red ribbon lying on the ground and across the water
    verts, faces, half = [], [], 11 * U
    def up(pt):
        i = min(NX - 1, max(0, round((pt[0] - F['x0']) / STEP))); j = min(NY - 1, max(0, round((pt[1] - F['y0']) / STEP)))
        return max(float(z[j, i]), 0.0) * EX * U + 0.035
    for ring in D['limits']:
        for a, b in zip(ring, ring[1:] + ring[:1]):
            L = math.hypot(b[0] - a[0], b[1] - a[1]); n = max(1, int(L // 46))
            for s in range(n):
                p = [a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n]; q = [a[0] + (b[0] - a[0]) * (s + 0.6) / n, a[1] + (b[1] - a[1]) * (s + 0.6) / n]
                if not all(F['x0'] < t[0] < F['x1'] and F['y0'] < t[1] < F['y1'] for t in (p, q)): continue
                ox, oy = -(b[1] - a[1]) / L * half, (b[0] - a[0]) / L * half; n0 = len(verts)
                verts += [(p[0] * U - ox, p[1] * U - oy, up(p)), (p[0] * U + ox, p[1] * U + oy, up(p)), (q[0] * U + ox, q[1] * U + oy, up(q)), (q[0] * U - ox, q[1] * U - oy, up(q))]
                faces.append((n0, n0 + 1, n0 + 2, n0 + 3))
    return new_object('limits', verts, faces, material('limits', '#c0232f', 0.6, emit=0.7))

# ---------- the painted finish ----------
def painted(path, r):
    img = bpy.data.images.load(path); w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(px); a = px.reshape(h, w, 4)
    rgbs, lum = a[..., :3].astype(np.float64), a[..., :3].mean(axis=2).astype(np.float64)
    pad = r + 1
    def window(v, dy0, dy1, dx0, dx1):   # the average of v over a small box set off from each dot
        p = np.pad(v, ((pad, pad), (pad, pad)) + ((0, 0),) * (v.ndim - 2), mode='edge'); I = p.cumsum(0).cumsum(1)
        ys, xs = np.arange(h) + pad, np.arange(w) + pad
        S = I[ys + dy1][:, xs + dx1] - I[ys + dy0 - 1][:, xs + dx1] - I[ys + dy1][:, xs + dx0 - 1] + I[ys + dy0 - 1][:, xs + dx0 - 1]
        return S / ((dy1 - dy0 + 1) * (dx1 - dx0 + 1))
    best, calm = None, None
    for dy0, dy1, dx0, dx1 in ((-r, 0, -r, 0), (-r, 0, 0, r), (0, r, -r, 0), (0, r, 0, r)):
        mean = window(rgbs, dy0, dy1, dx0, dx1); var = window(lum * lum, dy0, dy1, dx0, dx1) - window(lum, dy0, dy1, dx0, dx1) ** 2
        if best is None: best, calm = mean, var
        else:
            pick = var < calm; best = np.where(pick[..., None], mean, best); calm = np.where(pick, var, calm)
    a[..., :3] = best.astype(np.float32); img.pixels.foreach_set(a.ravel())
    out = path.replace(EXT, '-painted' + EXT); img.filepath_raw = out; img.file_format = 'JPEG' if EXT == '.jpg' else 'PNG'; img.save()
    bpy.data.images.remove(img); return out

# ---------- render each moment from the one camera ----------
os.makedirs(OUT, exist_ok=True)
# where the camera stands, for the page: moments.js uses it to put its words and the first shore on the picture
json.dump({'camera': [round(v, 4) for v in cam.location], 'aim': [round(v, 4) for v in aim], 'lens': cam.data.lens, 'sensor': cam.data.sensor_width, 'width': scene.render.resolution_x, 'height': scene.render.resolution_y, 'unit': U, 'stretch': EX, 'frame': F}, open(os.path.join(OUT, 'view.json'), 'w'))
if '--view-only' in argv: WHICH = []
for name in WHICH:
    obs, z, kind = ground(D[name], name)
    if name == 'first': obs += plants(z, kind, 1.0)
    if name == 'city': obs += plants(z, kind, 0.4); obs.append(limits(z))
    if name == 'today': obs.append(buildings(z))
    scene.render.filepath = os.path.join(OUT, 'moments-' + name + EXT)
    bpy.ops.render.render(write_still=True)
    print('rendered', scene.render.filepath)
    if FLAGS['--paint']: print('painted', painted(scene.render.filepath, FLAGS['--paint']))
    for ob in obs: bpy.data.objects.remove(ob, do_unlink=True)
