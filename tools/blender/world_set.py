# The world of c.1680, made in Blender for section 3 of the home page: the Seneca village of Teiaiagon and the
# shore of the bay, seen from the ground.
#
#   blender -b --factory-startup -P tools/blender/world_set.py -- <out folder> <aerial|beach|village> [data.json, for aerial] [--clip 240] [--view 1] [--cycles]
#
# WHAT THIS LEANS ON (the same record the 3D world page sets out, with its sources): Teiaiagon was a Seneca village
# on the east bank of the Humber; longhouses were arched frames of poles covered in sheets of elm bark, about 6 m
# wide and high and several times as long, with smoke holes along the ridge and a door at each end; traces of a
# palisade were found; fields of corn, beans and squash lay round it; dress follows the Verelst portraits of 1710
# (linen shirts, trade cloth in red and blue, hide leggings). The forest is the oak, maple, beech and white pine of
# this shore.
# WHAT IS DRAWING: everything you can actually see. No picture of Teiaiagon exists. Where each house, tree and
# person stands, what anyone is doing, the canoes, the light and the weather are all made up for the picture.
# The sand, forest floor and bark are photographs from Poly Haven (public domain), not taken here.
import bpy, bmesh, math, os, sys, random
import numpy as np
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
FLAGS = {'--scale': 100, '--samples': 96, '--clip': 0, '--view': 0, '--taa': 32}   # --clip N records N frames of the camera's move as a video; --view picks a second camera for a still
for k in FLAGS:
    if k in argv: FLAGS[k] = int(argv[argv.index(k) + 1])
plain = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or argv[i - 1] not in FLAGS)]
OUT, SHOT = plain[0], plain[1]
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
PH = os.path.join(ROOT, 'assets', 'polyhaven')
random.seed(21); rng = np.random.default_rng(21)

def rgb(hexcode, a=1.0):
    v = [int(hexcode[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple((c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4) for c in v) + (a,)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------- materials ----------
MATS = {}
def flat(colour, rough=0.85, sub=0.0):
    key = (colour, rough, sub)
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new(colour); m.use_nodes = True; b = m.node_tree.nodes.get('Principled BSDF'); b.inputs['Base Color'].default_value = rgb(colour); b.inputs['Roughness'].default_value = rough
    if sub and 'Subsurface Weight' in b.inputs: b.inputs['Subsurface Weight'].default_value = sub
    MATS[key] = m; return m
def photo(name, folder, scale, tint=None, rough=0.95):
    # a ground or bark photograph laid on from three sides, so it fits any shape without stretching
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes.get('Principled BSDF'); b.inputs['Roughness'].default_value = rough
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (scale, scale, scale); nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    def image(suffix, data=False):
        n = nt.nodes.new('ShaderNodeTexImage'); n.image = bpy.data.images.load(os.path.join(PH, folder, 'textures', folder + suffix)); n.projection = 'BOX'; n.projection_blend = 0.3
        if data: n.image.colorspace_settings.name = 'Non-Color'
        nt.links.new(mp.outputs['Vector'], n.inputs['Vector']); return n
    col = image('_diff_1k.jpg'); out = col.outputs['Color']
    if tint:
        mix = nt.nodes.new('ShaderNodeMixRGB'); mix.blend_type = 'MULTIPLY'; mix.inputs['Fac'].default_value = 1.0; mix.inputs['Color2'].default_value = rgb(tint); nt.links.new(out, mix.inputs['Color1']); out = mix.outputs['Color']
    nt.links.new(out, b.inputs['Base Color'])
    nor = image('_nor_gl_1k.jpg', True); nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.0; nt.links.new(nor.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    return m
def ground_mix(sand_to, earth):
    # sand from the water up to about sand_to metres, then the forest floor (or trodden earth); the two meet along a ragged, soft line
    m = bpy.data.materials.new('ground'); m.use_nodes = True; nt = m.node_tree; b = nt.nodes.get('Principled BSDF'); b.inputs['Roughness'].default_value = 0.95
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nz = nt.nodes.new('ShaderNodeTexNoise'); add = nt.nodes.new('ShaderNodeMath'); span = nt.nodes.new('ShaderNodeMapRange')
    nz.inputs['Scale'].default_value = 0.09; nz.inputs['Detail'].default_value = 5; add.operation = 'MULTIPLY_ADD'; add.inputs[1].default_value = 14.0; span.inputs['From Min'].default_value = sand_to + 4; span.inputs['From Max'].default_value = sand_to + 10
    nt.links.new(tc.outputs['Object'], sep.inputs['Vector']); nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], add.inputs[0]); nt.links.new(sep.outputs['Y'], add.inputs[2]); nt.links.new(add.outputs['Value'], span.inputs['Value'])
    def layer(folder, scale, colour, k):
        mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (scale, scale, scale); nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); outs = []
        for suffix, data in (('_diff_1k.jpg', False), ('_nor_gl_1k.jpg', True)):
            n = nt.nodes.new('ShaderNodeTexImage'); n.image = bpy.data.images.load(os.path.join(PH, folder, 'textures', folder + suffix)); n.projection = 'BOX'; n.projection_blend = 0.3
            if data: n.image.colorspace_settings.name = 'Non-Color'
            nt.links.new(mp.outputs['Vector'], n.inputs['Vector']); outs.append(n.outputs['Color'])
        mix = nt.nodes.new('ShaderNodeMixRGB'); mix.inputs['Fac'].default_value = k; mix.inputs['Color2'].default_value = rgb(colour); nt.links.new(outs[0], mix.inputs['Color1']); return mix.outputs['Color'], outs[1]
    sc, sn = layer('coast_sand_01', 0.35, '#ecd9ac', 0.5); fc, fn = layer('forrest_ground_01', 0.3, '#cdb994' if earth else '#6f7a4a', 0.45 if earth else 0.2)
    col = nt.nodes.new('ShaderNodeMixRGB'); nor = nt.nodes.new('ShaderNodeMixRGB'); nm = nt.nodes.new('ShaderNodeNormalMap')
    for mixer, a, c in ((col, sc, fc), (nor, sn, fn)): nt.links.new(span.outputs['Result'], mixer.inputs['Fac']); nt.links.new(a, mixer.inputs['Color1']); nt.links.new(c, mixer.inputs['Color2'])
    nt.links.new(col.outputs['Color'], b.inputs['Base Color']); nt.links.new(nor.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal']); return m
def spray(name, hue, count=16):
    # a spray of leaves on a clear ground, painted here dot by dot: every leaf card on a tree carries one of these
    n = 256; yy, xx = np.mgrid[0:n, 0:n].astype(np.float32); px = np.zeros((n, n, 4), dtype=np.float32)
    for k in range(count):
        cx, cy = rng.uniform(40, 216, 2); a = rng.uniform(0, math.pi); L, Wd = rng.uniform(34, 54), rng.uniform(13, 21)
        u = (xx - cx) * math.cos(a) + (yy - cy) * math.sin(a); v = -(xx - cx) * math.sin(a) + (yy - cy) * math.cos(a)
        inside = (u / L) ** 2 + (v / (Wd * (1 - 0.5 * np.clip(u / L, 0, 1)))) ** 2 < 1
        shade = rng.uniform(0.7, 1.2) * (1 - 0.25 * (np.abs(v) < 1.3)); c = np.array(rgb(hue)[:3]) * rng.uniform(0.85, 1.15, 3)
        for ch in range(3): px[..., ch] = np.where(inside, c[ch] * shade, px[..., ch])
        px[..., 3] = np.where(inside, 1.0, px[..., 3])
    img = bpy.data.images.new(name, n, n, alpha=True); img.pixels.foreach_set(px.ravel()); img.pack()
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes.get('Principled BSDF'); b.inputs['Roughness'].default_value = 0.6
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img; nt.links.new(t.outputs['Color'], b.inputs['Base Color']); nt.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
    if 'Subsurface Weight' in b.inputs: b.inputs['Subsurface Weight'].default_value = 0.15
    for attr, val in (('blend_method', 'HASHED'), ('shadow_method', 'HASHED')):
        try: setattr(m, attr, val)
        except Exception: pass
    return m

class Make:
    def __init__(s, name): s.bm = bmesh.new(); s.slots = []; s.name = name; s.uv = s.bm.loops.layers.uv.new('uv')
    def paint(s, verts, m):
        if m not in s.slots: s.slots.append(m)
        i = s.slots.index(m)
        for f in {f for v in verts for f in v.link_faces}: f.material_index = i
        return verts
    def box(s, at, size, m, turn=0.0):
        g = bmesh.ops.create_cube(s.bm, size=1.0)['verts']; bmesh.ops.scale(s.bm, verts=g, vec=size); bmesh.ops.translate(s.bm, verts=g, vec=(0, 0, size[2] / 2))
        if turn: bmesh.ops.rotate(s.bm, verts=g, cent=(0, 0, 0), matrix=Matrix.Rotation(turn, 3, 'Z'))
        bmesh.ops.translate(s.bm, verts=g, vec=at); return s.paint(g, m)
    def rod(s, a, b, ra, m, rb=None, seg=8):
        a, b = Vector(a), Vector(b); d = b - a
        if d.length < 1e-5: return []
        g = bmesh.ops.create_cone(s.bm, cap_ends=True, segments=seg, radius1=ra, radius2=ra if rb is None else rb, depth=d.length)['verts']
        bmesh.ops.rotate(s.bm, verts=g, cent=(0, 0, 0), matrix=d.to_track_quat('Z', 'Y').to_matrix()); bmesh.ops.translate(s.bm, verts=g, vec=(a + b) / 2); return s.paint(g, m)
    def ball(s, at, r, m, scale=(1, 1, 1), seg=16):
        g = bmesh.ops.create_uvsphere(s.bm, u_segments=seg, v_segments=max(6, seg // 2), radius=r)['verts']; bmesh.ops.scale(s.bm, verts=g, vec=scale); bmesh.ops.translate(s.bm, verts=g, vec=at); return s.paint(g, m)
    def card(s, at, size, m, normal=None):   # a flat square carrying a picture (a spray of leaves), facing any way
        n = Vector(normal) if normal is not None else Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-0.2, 1))); n.normalize()
        u = n.orthogonal().normalized(); u.rotate(Matrix.Rotation(random.uniform(0, math.tau), 3, n)); v = n.cross(u); c = Vector(at)
        vs = [s.bm.verts.new(c + (u * sx + v * sy) * size / 2) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]; f = s.bm.faces.new(vs)
        for loop, uvc in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): loop[s.uv].uv = uvc
        return s.paint(vs, m)
    def done(s, at=(0, 0, 0), turn=0.0, smooth=True, parent=None):
        s.bm.normal_update(); me = bpy.data.meshes.new(s.name); s.bm.to_mesh(me); s.bm.free()
        for m in s.slots: me.materials.append(m)
        me.polygons.foreach_set('use_smooth', [smooth] * len(me.polygons)); o = bpy.data.objects.new(s.name, me); bpy.context.collection.objects.link(o); o.location = at; o.rotation_euler = (0, 0, turn)
        if parent: o.parent = parent
        return o

BARK = photo('bark', 'bark_brown_02', 0.6)
def tree(name, h, kind, leaf):
    t = Make(name)
    def grow(a, d, length, r, depth):
        b = a + d * length; t.rod(a, b, r, BARK, rb=r * 0.62, seg=7 if depth > 1 else 5)
        if depth == 0:
            for k in range(7): t.card(a + d * length * random.uniform(0.3, 1.1) + Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-0.6, 0.8))) * length * 0.42, random.uniform(0.9, 1.5) * h / 22, leaf)
            return
        for k in range(3 if depth > 1 else 4):
            side = d.orthogonal().normalized(); side.rotate(Matrix.Rotation(random.uniform(0, math.tau), 3, d))
            nd = (d * random.uniform(0.5, 0.9) + side * random.uniform(0.6, 1.0) + Vector((0, 0, 0.25))).normalized()
            grow(a + d * length * random.uniform(0.45, 1.0), nd, length * random.uniform(0.55, 0.72), r * 0.55, depth - 1)
    if kind == 'pine':     # a tall bare trunk, boughs in rings up the top two thirds, each one thick with sprays of needles
        t.rod((0, 0, 0), (0, 0, h), h * 0.016, BARK, rb=h * 0.004, seg=8)
        for k in range(14):
            z = h * (0.35 + 0.63 * k / 14); reach = h * 0.19 * (1 - 0.8 * k / 14) + 0.5
            for b in range(random.randint(5, 6)):
                a = random.uniform(0, math.tau); d = Vector((math.cos(a), math.sin(a), random.uniform(-0.16, 0.12))).normalized(); p0 = Vector((0, 0, z)); t.rod(p0, p0 + d * reach, h * 0.005, BARK, rb=h * 0.002, seg=5)
                for j in range(12): t.card(p0 + d * reach * (0.15 + 0.85 * j / 11) + Vector((random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.35))), reach * random.uniform(0.5, 0.75), leaf)
        for j in range(6): t.card((0, 0, h * (0.97 + 0.01 * j)), h * 0.07, leaf)
    else:
        grow(Vector((0, 0, 0)), Vector((random.uniform(-0.05, 0.05), random.uniform(-0.05, 0.05), 1)).normalized(), h * 0.42, h * 0.017, 3)
    return t.done()

def scatter(kinds, points):
    lots = [[] for _ in kinds]
    for p in points: lots[random.randrange(len(kinds))].append(p)
    for k, tr in enumerate(kinds):
        me = bpy.data.meshes.new('stand%d' % k); me.from_pydata(lots[k], [], []); holder = bpy.data.objects.new(me.name, me); bpy.context.collection.objects.link(holder); tr.parent = holder; holder.instance_type = 'VERTS'

SKIN, HAIR, HIDE = flat('#96643f', 0.55, 0.2), flat('#120d0a', 0.4), flat('#9a7a55', 0.95)
HZ = None   # the height of the ground under a point, once a shot has laid its ground
def keys(kind):   # how the next keyframes are joined: LINEAR for an even drift, BEZIER for a swing
    try: bpy.context.preferences.edit.keyframe_new_interpolation_type = kind
    except Exception as err: print('interpolation', err)
def figure(at, turn, cloth, woman=False, carry=False, sit=False, walk=0.0):
    # walk is metres a second, the way the figure faces. In a recording a walker's legs and arms swing and it moves along; in a still it is caught in mid-step.
    p = Make('person'); hip = Vector((0, 0, 0.92 if not sit else 0.32)); up = Vector((0.03, 0, 1)).normalized(); chest = hip + up * 0.36; neck = hip + up * 0.54; head = neck + Vector((0.02, 0, 0.13)); shirt = flat(cloth, 0.95); limbs = []
    if sit:
        for sy in (-0.1, 0.1): p.rod(hip + Vector((0, sy, 0)), hip + Vector((0.42, sy * 1.3, 0.02)), 0.085, HIDE, rb=0.07); p.rod(hip + Vector((0.42, sy * 1.3, 0.02)), hip + Vector((0.5, sy * 1.5, -0.3)), 0.065, HIDE, rb=0.05)
    else:
        for sy, ph in ((-0.1, 1), (0.1, -1)):
            l = Make('leg'); l.rod((0, 0, 0), (0, 0, -0.45), 0.085, HIDE, rb=0.065); l.rod((0, 0, -0.45), (0, 0, -0.87), 0.062, HIDE, rb=0.045); l.ball((0.06, 0, -0.87), 0.06, HIDE, scale=(1.7, 0.9, 0.7)); limbs.append((l, hip + Vector((0, sy, 0)), ph, 0.4 if walk else 0.17))
    if woman: p.rod(hip + Vector((0, 0, 0.06)), hip + Vector((0, 0, -0.55)), 0.2, flat('#2f4a6a' if cloth != '#3f5f86' else '#8a2f2a', 0.95), rb=0.27, seg=14)   # a wrapped skirt of trade cloth
    else: p.box((hip.x, hip.y, hip.z - 0.34), (0.05, 0.3, 0.42), flat('#8a2f2a', 0.95))                                                                               # a breechcloth
    p.ball(hip + up * 0.17, 0.165, shirt, scale=(0.85, 1.05, 1.5)); p.ball(chest, 0.17, shirt, scale=(0.85, 1.2, 1.0))
    for sy in (-0.18, 0.18): p.ball(chest + Vector((0, sy, 0.08)), 0.07, shirt)
    p.rod(neck - Vector((0, 0, 0.02)), head - Vector((0, 0, 0.06)), 0.046, SKIN); p.ball(head, 0.1, SKIN, scale=(1.0, 0.86, 1.14)); p.ball(head + Vector((0.095, 0, -0.015)), 0.026, SKIN)
    p.ball(head + Vector((-0.02, 0, 0.03)), 0.105, HAIR, scale=(1.0, 0.93, 1.05)); p.rod(head + Vector((-0.09, 0, 0)), neck + Vector((-0.11, 0, -0.22)), 0.04, HAIR, rb=0.015)
    for sy in (-1, 1):
        sh = chest + Vector((0, sy * 0.2, 0.09))
        if carry or sit:
            hand = sh + (Vector((0.18, sy * 0.05, 0.42)) if carry else Vector((0.1 * sy, sy * 0.07, -0.52))); elbow = (sh + hand) / 2 + Vector((0.05 if carry else -0.03, sy * 0.06, 0)); p.rod(sh, elbow, 0.048, shirt, rb=0.042); p.rod(elbow, hand, 0.04, SKIN, rb=0.034); p.ball(hand, 0.042, SKIN)
        else:
            a = Make('arm'); a.rod((0, 0, 0), (-0.015, sy * 0.03, -0.27), 0.048, shirt, rb=0.042); a.rod((-0.015, sy * 0.03, -0.27), (0.03, sy * 0.05, -0.52), 0.04, SKIN, rb=0.034); a.ball((0.03, sy * 0.05, -0.52), 0.042, SKIN); limbs.append((a, sh, sy, 0.33 if walk else 0.07))
    if carry: p.ball(head + Vector((-0.02, 0, 0.36)), 0.26, flat('#b89a62', 0.95), scale=(1.1, 1.1, 0.75))    # a basket on the head, steadied with both hands
    body = p.done(at, turn); frames = FLAGS['--clip']; keys('BEZIER')
    for mk, where, ph, amp in limbs:
        o = mk.done(where, 0, parent=body); o.rotation_euler = (0, ph * amp, 0)
        if walk and frames:   # one full swing a second: two steps
            for k, f in enumerate(range(1, frames + 13, 12)): o.rotation_euler = (0, ph * amp * (1 if k % 2 == 0 else -1), 0); o.keyframe_insert('rotation_euler', frame=f)
    if walk and frames:
        keys('LINEAR'); end = Vector(at) + Vector((math.cos(turn), math.sin(turn), 0)) * walk * frames / 24
        if HZ: end.z = HZ(end.x, end.y)
        body.keyframe_insert('location', frame=1); body.location = end; body.keyframe_insert('location', frame=frames)
    return body

def smoke(at, tall=8.0, wide=1.0, lean=(0.9, 0.3)):
    # a thin column of wood smoke: a tall soft shape that fades at its edges and toward its top, with a cloudy pattern that climbs through it in a recording
    m = bpy.data.materials.new('smoke'); m.use_nodes = True; nt = m.node_tree; b = nt.nodes.get('Principled BSDF'); b.inputs['Base Color'].default_value = rgb('#d6d3cd'); b.inputs['Roughness'].default_value = 1.0
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); nz = nt.nodes.new('ShaderNodeTexNoise'); lw = nt.nodes.new('ShaderNodeLayerWeight'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nz.inputs['Scale'].default_value = 1.6; nz.inputs['Detail'].default_value = 3
    def sum_(op, a, bv):
        n = nt.nodes.new('ShaderNodeMath'); n.operation = op
        for i, v in enumerate((a, bv)):
            if isinstance(v, (int, float)): n.inputs[i].default_value = v
            else: nt.links.new(v, n.inputs[i])
        return n.outputs['Value']
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], nz.inputs['Vector']); nt.links.new(tc.outputs['Generated'], sep.inputs['Vector'])
    edge = sum_('POWER', sum_('SUBTRACT', 1.0, lw.outputs['Facing']), 2.2); top = sum_('SUBTRACT', 1.0, sep.outputs['Z']); cloud = sum_('MULTIPLY', sum_('POWER', nz.outputs['Fac'], 1.6), 0.5)
    nt.links.new(sum_('MULTIPLY', sum_('MULTIPLY', edge, top), cloud), b.inputs['Alpha'])
    try: m.surface_render_method = 'BLENDED'
    except Exception: m.blend_method = 'BLEND'
    s = Make('smoke'); s.ball((0, 0, 0), 1.0, m, seg=24); o = s.done((at[0] + lean[0] * tall * 0.12, at[1] + lean[1] * tall * 0.12, at[2] + tall / 2)); o.scale = (wide, wide, tall / 2); o.rotation_euler = (-lean[1] * 0.12, lean[0] * 0.12, 0)
    try: o.visible_shadow = False
    except Exception: pass
    frames = FLAGS['--clip']
    if frames: keys('LINEAR'); loc = mp.inputs['Location']; loc.default_value = (0, 0, 0); loc.keyframe_insert('default_value', frame=1); loc.default_value = (0, 0, -0.9 * frames / 240); loc.keyframe_insert('default_value', frame=frames)
    return o

def tufts(hz, where, n, box):
    # low clumps of grass and weeds, green and dry, so open ground is not bare
    kinds = []
    for name, col, hgt in (('grass', '#6f7d44', 0.34), ('dry', '#9c8f5c', 0.3), ('weed', '#56703a', 0.46), ('grass2', '#7a8548', 0.24)):
        t = Make(name); mt = flat(col, 0.9)
        for k in range(18): a = random.uniform(0, math.tau); lean = random.uniform(0.1, 0.7); t.rod((random.uniform(-0.08, 0.08), random.uniform(-0.08, 0.08), 0), (math.cos(a) * lean * hgt, math.sin(a) * lean * hgt, hgt * random.uniform(0.6, 1.1)), 0.013, mt, rb=0.003, seg=3)
        kinds.append(t.done())
    pts = []; tries = 0
    while len(pts) < n and tries < n * 40:
        tries += 1; x, y = random.uniform(box[0], box[1]), random.uniform(box[2], box[3])
        if where(x, y): pts.append((x, y, hz(x, y) - 0.02))
    scatter(kinds, pts)

def canoe(at, turn):
    c = Make('canoe'); L, BEAM = 5.6, 0.46; bark = flat('#dcc694', 0.75)
    half = lambda u: BEAM * max(0.0, 1 - abs(u) ** 2.6) ** 0.75; sheer = lambda u: 0.44 + 0.36 * abs(u) ** 3.2; keel = lambda u: 0.02 + 4.5 * max(0.0, abs(u) - 0.8) ** 1.6
    NU, NV = 48, 12; grid = []
    for i in range(NU + 1):
        u = -1 + 2 * i / NU; b, s, kz = half(u), sheer(u), min(keel(u), sheer(u) - 0.02); grid.append([c.bm.verts.new((u * L / 2, -b * math.cos(math.pi * j / NV), s - (s - kz) * math.sin(math.pi * j / NV) ** 0.55)) for j in range(NV + 1)])
    vs = []
    for i in range(NU):
        for j in range(NV): c.bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    c.paint([v for row in grid for v in row], bark); wood = flat('#3f2b1e', 0.7)
    for side in (-1, 1):
        for i in range(NU): u0, u1 = -1 + 2 * i / NU, -1 + 2 * (i + 1) / NU; c.rod((u0 * L / 2, side * half(u0), sheer(u0)), (u1 * L / 2, side * half(u1), sheer(u1)), 0.024, wood, seg=6)
    for u in (-0.55, -0.18, 0.18, 0.55): c.rod((u * L / 2, -half(u), sheer(u) - 0.03), (u * L / 2, half(u), sheer(u) - 0.03), 0.02, wood, seg=6)
    o = c.done(at, turn); o.rotation_euler = (math.radians(random.uniform(8, 16)), 0, turn); o.modifiers.new('thick', 'SOLIDIFY').thickness = 0.014; return o

ELM = photo('elm', 'bark_brown_02', 0.35, tint='#b9a88f')
def longhouse(at, turn, length):
    h = Make('longhouse'); w, tall = 3.0, 5.6; n = int(length / 1.0); NA = 14; pole = flat('#6a5238', 0.9)
    prof = lambda a: (-w * math.copysign(abs(math.cos(a)) ** 0.62, math.cos(a)), tall * math.sin(a) ** 0.85)
    rows = [[h.bm.verts.new((-length / 2 + i * length / n, prof(math.pi * j / NA)[0], prof(math.pi * j / NA)[1] + random.uniform(-0.03, 0.03))) for j in range(NA + 1)] for i in range(n + 1)]
    for i in range(n):
        for j in range(NA): h.bm.faces.new((rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]))
    h.paint([v for r in rows for v in r], ELM)
    for end in (0, n):   # the end walls, with a low door
        mid = h.bm.verts.new((rows[end][0].co.x, 0, 2.2)); ring = rows[end]
        for j in range(NA): h.bm.faces.new((ring[j], ring[j + 1], mid) if end else (ring[j + 1], ring[j], mid))
        h.bm.faces.new((ring[0], ring[NA], mid) if end else (ring[NA], ring[0], mid)); h.paint([mid], ELM); sx = -1 if end == 0 else 1; h.box((rows[end][0].co.x + sx * 0.03, 0, 0), (0.08, 1.0, 1.7), flat('#1a1410', 0.9)); h.box((rows[end][0].co.x + sx * 0.06, 0.3, 0.25), (0.05, 0.5, 1.45), flat('#6f5a44', 0.95))
    for i in range(0, n + 1, 2):   # hoops and long poles lashed outside, holding the bark down
        for j in range(NA): a0, a1 = math.pi * j / NA, math.pi * (j + 1) / NA; x = -length / 2 + i * length / n; p0, p1 = prof(a0), prof(a1); h.rod((x, p0[0] * 1.02, p0[1] * 1.01), (x, p1[0] * 1.02, p1[1] * 1.01), 0.045, pole, seg=5)
    for a in (0.22, 0.42, 0.62, 1 - 0.42, 1 - 0.22, 0.5): p = prof(math.pi * a); h.rod((-length / 2 - 0.3, p[0] * 1.03, p[1] * 1.02), (length / 2 + 0.3, p[0] * 1.03, p[1] * 1.02), 0.04, pole, seg=5)
    for i in range(3, n - 2, 6): h.box((-length / 2 + i * length / n, 0, tall - 0.06), (0.9, 0.9, 0.12), flat('#15110e', 1.0))   # smoke holes along the ridge
    bmesh.ops.recalc_face_normals(h.bm, faces=h.bm.faces[:])   # every face the same way out, or the end walls shade black
    return h.done(at, turn)

def ground(sand_to):
    # one sheet of ground: sand from the water up to sand_to metres, then the forest floor, with a few low swells
    g = Make('ground'); mixm = ground_mix(sand_to, SHOT == 'village'); N = 90; size = 260; vs = {}
    hz = lambda x, y: (0.5 * math.sin(x * 0.045) * math.cos(y * 0.05) + 0.25 * math.sin(x * 0.13 + y * 0.09)) * min(1.0, max(0.0, (y - 2) / 30)) + max(0.0, y) * 0.012 - max(0.0, -y) * 0.07
    for j in range(N + 1):
        for i in range(N + 1): x, y = -size / 2 + size * i / N, -40 + size * j / N; vs[i, j] = g.bm.verts.new((x, y, hz(x, y)))
    for j in range(N):
        for i in range(N):
            g.paint(g.bm.faces.new((vs[i, j], vs[i + 1, j], vs[i + 1, j + 1], vs[i, j + 1])).verts, mixm)
    return g.done(), hz

def sky_and_sun(azimuth):
    world = bpy.data.worlds.new('sky'); scene.world = world; world.use_nodes = True; wt = world.node_tree; bg = wt.nodes.get('Background')
    tc = wt.nodes.new('ShaderNodeTexCoord'); sep = wt.nodes.new('ShaderNodeSeparateXYZ'); span = wt.nodes.new('ShaderNodeMapRange'); ramp = wt.nodes.new('ShaderNodeValToRGB')
    span.inputs['From Min'].default_value = -0.02; span.inputs['From Max'].default_value = 0.6
    e = ramp.color_ramp.elements; e[0].position = 0; e[0].color = rgb('#f3e3c6'); e[1].position = 1; e[1].color = rgb('#4f86c4')
    for p, c in ((0.12, '#e9e2d2'), (0.35, '#b9d2e6')): ramp.color_ramp.elements.new(p).color = rgb(c)
    wt.links.new(tc.outputs['Generated'], sep.inputs['Vector']); wt.links.new(sep.outputs['Z'], span.inputs['Value']); wt.links.new(span.outputs['Result'], ramp.inputs['Fac']); wt.links.new(ramp.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = 1.0
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); scene.collection.objects.link(sun); sun.data.energy = 5.5; sun.data.angle = math.radians(3); sun.data.color = (1.0, 0.9, 0.76)
    a = math.radians(azimuth); sun.rotation_euler = Vector((math.cos(a), math.sin(a), -0.85)).to_track_quat('-Z', 'Y').to_euler()

def camera(at, look, lens=32, to=None, look_to=None):
    # A still is taken from (at, look). For a recording the camera drifts slowly and evenly on to (to, look_to): a
    # short way over ten seconds, like one slow step. A long, fast move shown at 24 pictures a second judders; a
    # slow drift, with the people and the smoke doing the moving, does not.
    cam = bpy.data.objects.new('camera', bpy.data.cameras.new('camera')); scene.collection.objects.link(cam); scene.camera = cam; cam.data.lens = lens; cam.data.clip_start = 0.2; cam.data.clip_end = 9000
    frames = FLAGS['--clip']; keys('LINEAR')
    for f, (a, l) in ((max(2, frames), (to or at, look_to or look)), (1, (at, look))):
        cam.location = a; cam.rotation_euler = (Vector(l) - Vector(a)).to_track_quat('-Z', 'Y').to_euler()
        if frames: cam.keyframe_insert('location', frame=f); cam.keyframe_insert('rotation_euler', frame=f)

def woods(hz, where, step, kinds):
    pts = []; x = -125.0
    while x < 125:
        y = -10.0
        while y < 215:
            px, py = x + random.uniform(-step, step) * 0.45, y + random.uniform(-step, step) * 0.45
            if where(px, py): pts.append((px, py, hz(px, py) - 0.1))
            y += step
        x += step
    scatter(kinds, pts); return len(pts)

LEAVES = [spray('oakleaf', '#4f7a2f'), spray('mapleleaf', '#6a8f34'), spray('beechleaf', '#5a8a3a'), spray('needles', '#3f6e46', 64)]
def species():
    return [tree('oak', 22, 'leaf', LEAVES[0]), tree('maple', 19, 'leaf', LEAVES[1]), tree('beech', 25, 'leaf', LEAVES[2]), tree('maple2', 16, 'leaf', LEAVES[1]), tree('oak2', 27, 'leaf', LEAVES[0]), tree('maple3', 21, 'leaf', LEAVES[1]), tree('pine', 32, 'pine', LEAVES[3])]

if SHOT == 'aerial':
    # Above the bay: the real lie of the land and the first-mapped shore (the same ground as the 3D world page), from the
    # data file that tools/blender/export-moments.js writes. One unit is one metre; heights are true, not stretched.
    import json
    D = json.load(open(plain[2])); F, STEP, NX, NY = D['F'], D['step'], D['nx'], D['ny']; m = D['first']
    z = np.array(m['z'], dtype=np.float32).reshape(NY, NX) / 10; kind = np.array(m['kind'], dtype=np.uint8).reshape(NY, NX); near = np.array(m['shallow'], dtype=np.float32).reshape(NY, NX) / 255
    gx = F['x0'] + np.arange(NX) * STEP; gy = F['y0'] + np.arange(NY) * STEP
    def sheet(name, zz, step, colours, rough):
        X, Y = np.meshgrid(gx[::step], gy[::step]); zz = zz[::step, ::step]; n, mm = zz.shape; idx = np.arange(n * mm).reshape(n, mm)
        me = bpy.data.meshes.new(name); me.from_pydata(np.stack([X, Y, zz], axis=-1).reshape(-1, 3).tolist(), [], np.stack([idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]], axis=-1).reshape(-1, 4).tolist()); me.update()
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons)); me.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='POINT').data.foreach_set('color', colours[::step, ::step].reshape(-1, 4).astype(np.float32).ravel())
        mt = bpy.data.materials.new(name); mt.use_nodes = True; b = mt.node_tree.nodes.get('Principled BSDF'); b.inputs['Roughness'].default_value = rough; vc = mt.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'; mt.node_tree.links.new(vc.outputs['Color'], b.inputs['Base Color'])
        me.materials.append(mt); o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); return o
    C = {k: np.array(rgb(v)) for k, v in {'floor': '#4f5f34', 'marsh': '#8f9c62', 'sand': '#e3d2a2', 'shallow': '#6fb2b8', 'deep': '#1f5a74'}.items()}
    col = np.empty((NY, NX, 4)); col[:] = C['floor']; col[kind == 2] = C['marsh']; beach = (np.clip((2.4 - z) / 1.8, 0, 1) * (kind == 0))[..., None]; col = col * (1 - beach) + C['sand'] * beach; 
    for _ in range(3): col = (col + np.roll(col, 1, 0) + np.roll(col, -1, 0) + np.roll(col, 1, 1) + np.roll(col, -1, 1)) / 5   # soften the stair-stepped edges between sand, marsh and forest floor
    col[..., 3] = 1
    sheet('ground', z, 1, col, 0.95)
    wcol = C['deep'] * (1 - near[..., None] ** 1.6) + C['shallow'] * near[..., None] ** 1.6; wcol[..., 3] = 1; sheet('water', np.full((NY, NX), -0.35, dtype=np.float32), 4, wcol, 0.08)
    # beyond the piece the data covers: open lake to the south, east and west, and the wooded country going on to the north, pale with distance
    far = Make('beyond'); vs = [far.bm.verts.new(q) for q in ((-60000, -60000, -0.6), (60000, -60000, -0.6), (60000, F['y1'] - 40, -0.6), (-60000, F['y1'] - 40, -0.6))]; far.bm.faces.new(vs); far.paint(vs, flat('#1f5a74', 0.08))
    for x0, x1, y0 in ((-60000, 60000, F['y1'] - 60), (-60000, F['x0'] + 30, -650), (F['x1'] - 30, 60000, 1500)):   # north of the piece, and the shore going on to the west and east of it
        vs = [far.bm.verts.new(q) for q in ((x0, y0, 9), (x1, y0, 9), (x1, 90000, 9), (x0, 90000, 9))]; far.bm.faces.new(vs); far.paint(vs, flat('#35532a', 0.95))
    far.done(smooth=False)
    def simple(name, sort, h, colour):
        t = Make(name); mt = flat(colour, 0.95)
        if sort == 'pine':
            for base, r, hh in ((0.15, 0.36, 0.4), (0.4, 0.27, 0.36), (0.63, 0.17, 0.37)): g = bmesh.ops.create_cone(t.bm, cap_ends=True, segments=7, radius1=r * h * 0.5, radius2=0, depth=hh * h)['verts']; bmesh.ops.translate(t.bm, verts=g, vec=(0, 0, (base + hh / 2) * h)); t.paint(g, mt)
        else:
            for dx, dy, dz, r in ((0, 0, 0.6, 0.34), (0.22, 0.1, 0.5, 0.26), (-0.2, -0.12, 0.52, 0.27), (0.0, 0.1, 0.8, 0.2)):
                g = bmesh.ops.create_icosphere(t.bm, subdivisions=1, radius=h * r)['verts']
                for v in g: v.co *= random.uniform(0.8, 1.2)
                bmesh.ops.translate(t.bm, verts=g, vec=(dx * h, dy * h, dz * h)); t.paint(g, mt)
        return t.done(smooth=False)
    kinds = [simple('a', 'leaf', 30, '#3f6a2c'), simple('b', 'leaf', 26, '#557a30'), simple('c', 'leaf', 34, '#48702f'), simple('d', 'leaf', 24, '#66883a'), simple('e', 'pine', 44, '#27482f'), simple('f', 'pine', 38, '#2f5234')]
    step = 30; xs = np.arange(F['x0'] + step / 2, F['x1'], step); ys = np.arange(F['y0'] + step / 2, F['y1'], step); PX, PY = np.meshgrid(xs, ys); PX = PX + (rng.random(PX.shape) - 0.5) * step; PY = PY + (rng.random(PY.shape) - 0.5) * step
    i = np.clip(np.round((PX - F['x0']) / STEP).astype(int), 0, NX - 1); j = np.clip(np.round((PY - F['y0']) / STEP).astype(int), 0, NY - 1); keep = (kind[j, i] == 0) & (z[j, i] > 1.6) & ((PY > 100) | (rng.random(PX.shape) < 0.2))
    scatter(kinds, np.stack([PX[keep], PY[keep], z[j, i][keep]], axis=-1).tolist()); print('trees', int(keep.sum())); sky_and_sun(55)
    # both cameras look steeply down, so the picture is filled by the bay and the edge of the mapped ground stays out of it
    if FLAGS['--view']: camera((2300, -2500, 1500), (900, -500, 0), 34)                                     # lower, over the sand bar, looking in to the shore
    else: camera((3100, -3300, 3400), (950, -400, 0), 40, to=(3360, -3090, 3340), look_to=(950, -400, 0))   # high over the lake, drifting slowly round the bay
    scene.camera.data.clip_start = 20; scene.camera.data.clip_end = 150000
elif SHOT == 'village':
    # Inside the clearing, looking along the houses toward the fields and the forest edge.
    g, hz = ground(-30); HZ = hz; sky_and_sun(62)      # the light travels north-east: an afternoon sun behind the viewer's left shoulder
    Q = math.pi / 2   # the houses stand end-on to the viewer, in two loose rows with a lane between
    houses = [((-9, 30), Q + 0.06, 24), ((9.5, 36), Q - 0.08, 28), ((-10, 62), Q - 0.04, 26), ((10, 72), Q + 0.1, 22), ((-30, 44), Q + 0.2, 20), ((31, 50), Q - 0.22, 22), ((-28, 78), Q + 0.05, 18), ((30, 86), Q - 0.1, 20)]
    for (x, y), turn, L in houses: longhouse((x, y, hz(x, y) - 0.05), turn, L)
    clear = lambda x, y: (x * x / 70 ** 2 + (y - 55) ** 2 / 62 ** 2) > 1                     # no trees in the clearing
    print('trees', woods(hz, clear, 9, species()))
    pal = Make('palisade'); log = flat('#6f5840', 0.95)
    for k in range(150):
        a = math.radians(200 + k * 1.75); x, y = 66 * math.cos(a), 55 + 58 * math.sin(a)
        if y < 6: continue
        pal.rod((x, y, hz(x, y) - 0.3), (x + random.uniform(-0.08, 0.08), y + random.uniform(-0.08, 0.08), hz(x, y) + random.uniform(4.0, 4.7)), 0.16, log, rb=0.05, seg=6)
    pal.done()
    corn = Make('corn'); stalk, leafm = flat('#6c8a3a', 0.9), flat('#779a3e', 0.8); hill = photo('hill', 'forrest_ground_01', 0.5, tint='#b99a78')
    for k in range(260):
        x, y = random.uniform(-58, -14), random.uniform(6, 28)
        if random.random() < 0.5: x = random.uniform(22, 60); y = random.uniform(4, 22)
        z = hz(x, y); corn.ball((x, y, z), 0.5, hill, scale=(1, 1, 0.35), seg=8)
        for s in range(3):
            sx, sy = x + random.uniform(-0.2, 0.2), y + random.uniform(-0.2, 0.2); top = random.uniform(1.6, 2.3); corn.rod((sx, sy, z), (sx, sy, z + top), 0.02, stalk, seg=4)
            for l in range(5): a = random.uniform(0, math.tau); zz = z + top * (0.25 + 0.15 * l); mid = (sx + math.cos(a) * 0.3, sy + math.sin(a) * 0.3, zz + 0.2); corn.rod((sx, sy, zz), mid, 0.03, leafm, rb=0.045, seg=4); corn.rod(mid, (sx + math.cos(a) * 0.62, sy + math.sin(a) * 0.62, zz - random.uniform(0.0, 0.25)), 0.045, leafm, rb=0.004, seg=4)
    corn.done()
    # who is in the lane: place, the way they face, shirt, woman, carrying, sitting, walking speed (metres a second)
    W = 1.25; folk = [((-2.2, 17), 1.52, '#d9cfb8', False, False, False, W), ((2.4, 36), -1.6, '#3f5f86', True, True, False, W), ((6, 27), -1.2, '#a8352b', False, False, False, 0), ((-9, 26), 1.4, '#d9cfb8', True, False, False, 0), ((-3, 30), -0.4, '#a8352b', True, False, True, 0), ((-4.2, 30.6), 2.2, '#d9cfb8', False, False, True, 0), ((17, 40), 3.0, '#3f5f86', False, False, False, W), ((-16, 40), 0.3, '#d9cfb8', True, True, False, W), ((1, 52), -1.5, '#a8352b', False, False, False, W)]
    for (x, y), turn, cloth, woman, carry, sit, walk in folk: figure((x, y, hz(x, y)), turn, cloth, woman, carry, sit, walk)
    fire = Make('fire'); fx, fy = -3.6, 29.2
    for k in range(7): a = k * 0.9; fire.rod((fx + math.cos(a) * 0.5, fy + math.sin(a) * 0.5, hz(fx, fy) + 0.05), (fx - math.cos(a) * 0.2, fy - math.sin(a) * 0.2, hz(fx, fy) + 0.22), 0.06, flat('#3a2a1e', 1.0), seg=5)
    fire.done(); smoke((fx, fy, hz(fx, fy) + 0.2), 6.0, 0.45)
    for (x, y), turn, L in houses[:5]:   # smoke from the holes along the ridge of the nearer houses
        for off in (-0.3, 0.25): smoke((x + math.cos(turn) * L * off, y + math.sin(turn) * L * off, hz(x, y) + 5.5), random.uniform(7, 10), random.uniform(0.55, 0.8))
    tufts(hz, lambda x, y: not clear(x, y) and all(abs((x - hx) * math.cos(t) + (y - hy) * math.sin(t)) > L / 2 + 1 or abs(-(x - hx) * math.sin(t) + (y - hy) * math.cos(t)) > 4.2 for (hx, hy), t, L in houses) and (abs(x) > 4.5 or random.random() < 0.08), 1500, (-70, 70, -6, 116))
    if FLAGS['--view']: camera((-34, 9, hz(-34, 9) + 3.4), (-8, 46, 2.2), 32)                      # from the corn hills, across to the houses
    else: camera((-1.6, 1.5, hz(-1.6, 1.5) + 1.7), (0.5, 40, 3.2), 28, to=(-1.0, 5.5, hz(-1.0, 5.5) + 1.7), look_to=(0.6, 44, 3.2))   # a slow step or two up the lane
else:
    # On the sand of the bay, looking along the shore: canoes drawn up, the forest coming down to the beach.
    g, hz = ground(7); HZ = hz; sky_and_sun(48)        # an afternoon sun over the lake, behind the viewer
    # the lake: one calm sheet with small ripples (big waves seen this low shimmer in a recording), and a broken line of foam where it meets the sand
    wm = bpy.data.materials.new('lake'); wm.use_nodes = True; wb = wm.node_tree.nodes.get('Principled BSDF'); wb.inputs['Base Color'].default_value = rgb('#3f7f96'); wb.inputs['Roughness'].default_value = 0.12
    wn = wm.node_tree.nodes.new('ShaderNodeTexNoise'); wn.inputs['Scale'].default_value = 1.4; wn.inputs['Detail'].default_value = 2; bump = wm.node_tree.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.12; wm.node_tree.links.new(wn.outputs['Fac'], bump.inputs['Height']); wm.node_tree.links.new(bump.outputs['Normal'], wb.inputs['Normal'])
    lake = Make('lake'); vs = [lake.bm.verts.new(q) for q in ((-3000, -3000, -0.12), (3000, -3000, -0.12), (3000, 2, -0.12), (-3000, 2, -0.12))]; lake.bm.faces.new(vs); lake.paint(vs, wm); lake.done(smooth=False)
    fm = bpy.data.materials.new('foam'); fm.use_nodes = True; fb = fm.node_tree.nodes.get('Principled BSDF'); fb.inputs['Base Color'].default_value = rgb('#f4f1ea'); fb.inputs['Roughness'].default_value = 0.9
    fn = fm.node_tree.nodes.new('ShaderNodeTexNoise'); fn.inputs['Scale'].default_value = 2.2; fn.inputs['Detail'].default_value = 4; fr = fm.node_tree.nodes.new('ShaderNodeMapRange'); fr.inputs['From Min'].default_value = 0.46; fr.inputs['From Max'].default_value = 0.6; fm.node_tree.links.new(fn.outputs['Fac'], fr.inputs['Value']); fm.node_tree.links.new(fr.outputs['Result'], fb.inputs['Alpha'])
    for attr, val in (('blend_method', 'HASHED'), ('shadow_method', 'NONE')):
        try: setattr(fm, attr, val)
        except Exception: pass
    foam = Make('foam'); edge = lambda x: -1.72 + 0.3 * math.sin(x * 0.21) + 0.15 * math.sin(x * 0.67); prev = None
    for k in range(0, 801):
        x = -200 + k * 0.5; pair = (foam.bm.verts.new((x, edge(x) + 0.12, -0.1)), foam.bm.verts.new((x, edge(x) - 0.75 - 0.3 * math.sin(x * 0.4), -0.11)))
        if prev: foam.bm.faces.new((prev[0], pair[0], pair[1], prev[1]))
        prev = pair
    foam.paint(foam.bm.verts[:], fm); fo = foam.done(smooth=False)
    try: fo.visible_shadow = False
    except Exception: pass
    print('trees', woods(hz, lambda x, y: y > 13 + 5 * math.sin(x * 0.06) and not (-34 < x < -14 and y < 40), 7.5, species()))   # a gap in the trees where the camera comes down
    for (x, y), turn in (((7, 3.2), 0.35), ((12.5, 4.6), 0.2), ((19, 3.0), 0.5), ((30, 5.2), 0.1), ((44, 3.6), 0.4)): canoe((x, y, hz(x, y) + 0.05), turn)
    W = 1.25
    for (x, y), turn, cloth, woman, carry, sit, walk in (((9.5, 1.4), 0.05, '#d9cfb8', False, False, False, W), ((27, 2.2), 3.1, '#a8352b', False, False, False, W), ((28.4, 1.5), 3.12, '#3f5f86', True, True, False, W), ((24, 4.8), -0.6, '#d9cfb8', False, False, True, 0), ((16, 4.4), -1.2, '#a8352b', False, False, False, 0), ((46, 2.0), 3.1, '#a8352b', False, False, False, W), ((62, 3.0), 3.1, '#d9cfb8', True, False, False, W)): figure((x, y, hz(x, y)), turn, cloth, woman, carry, sit, walk)
    tufts(hz, lambda x, y: y > 9.5 + 4 * math.sin(x * 0.06) + random.uniform(0, 6), 1800, (-60, 110, 8, 40))
    drift = Make('drift'); wood = photo('driftwood', 'bark_brown_02', 0.8, tint='#cfc4b0')
    for k in range(9): x, y = random.uniform(2, 70), random.uniform(-0.5, 6); a = random.uniform(0, math.pi); L = random.uniform(1.5, 4.5); drift.rod((x, y, hz(x, y) + 0.1), (x + math.cos(a) * L, y + math.sin(a) * L * 0.4, hz(x, y) + 0.16), random.uniform(0.07, 0.16), wood, seg=7)
    drift.done()
    far = Make('peninsula'); fs = flat('#dccb9c', 0.95)   # across the bay, the long sand peninsula that shelters it, low on the horizon
    vs = [far.bm.verts.new(q) for q in ((-2500, -1500, -0.2), (2500, -1150, -0.2), (2500, -1050, 1.6), (-2500, -1400, 1.6))]; far.bm.faces.new(vs); vs2 = [far.bm.verts.new(q) for q in ((-2500, -1400, 1.6), (2500, -1050, 1.6), (2500, -900, 1.6), (-2500, -1250, 1.6))]; far.bm.faces.new(vs2); far.paint(vs + vs2, fs); far.done()
    scatter([tree('fartree', 20, 'leaf', LEAVES[0]), tree('farpine', 28, 'pine', LEAVES[3])], [(x, -1330 + 0.07 * x + random.uniform(-40, 40), 1.5) for x in range(-2400, 2400, 26) if random.random() < 0.45])
    if FLAGS['--view']: camera((34.2, 0.0, hz(34.2, 0.0) + 1.1), (31.8, 5.2, 0.6), 30)                   # close on one canoe, from the water's edge (people are kept at a distance: they are simple figures)
    else: camera((-8.0, 4.6, hz(-8.0, 4.6) + 1.65), (40, -1.0, 2.4), 28, to=(-4.5, 4.0, hz(-4.5, 4.0) + 1.65), look_to=(42, -1.0, 2.4))   # standing on the sand, a slow step or two along the shore

scene.view_settings.exposure = 0.55; os.makedirs(OUT, exist_ok=True)
if FLAGS['--clip']:   # a recording: the quick renderer, 24 pictures a second, written as an mp4
    scene.render.engine = 'BLENDER_EEVEE'; scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = 960, 540, FLAGS['--scale']
    try: scene.eevee.taa_render_samples = FLAGS['--taa']   # passes per picture: fewer is quicker and a little grainier in the leaves
    except Exception: pass
    scene.frame_start, scene.frame_end, scene.render.fps = 1, FLAGS['--clip'], 24
    try: scene.render.image_settings.media_type = 'VIDEO'
    except Exception: pass
    scene.render.image_settings.file_format = 'FFMPEG'; scene.render.ffmpeg.format = 'MPEG4'; scene.render.ffmpeg.codec = 'H264'; scene.render.ffmpeg.constant_rate_factor = 'HIGH'; scene.render.ffmpeg.gopsize = 24
elif '--quick' in argv or '--poster' in argv:   # one picture from the quick renderer: what a recording looks like; --poster names it as the picture shown before Play
    scene.render.engine = 'BLENDER_EEVEE'; scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = 960, 540, 100; scene.render.image_settings.file_format = 'JPEG'; scene.render.image_settings.quality = 90
    try: scene.eevee.taa_render_samples = 32
    except Exception: pass
else:   # a still for the gallery. The same quick renderer as the recordings, so a picture and a recording of one place match; --cycles uses the slow, path-traced renderer instead
    if '--cycles' in argv: scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = FLAGS['--samples']; scene.cycles.use_denoising = True
    else:
        scene.render.engine = 'BLENDER_EEVEE'
        try: scene.eevee.taa_render_samples = 64
        except Exception: pass
    scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = 1600, 900, FLAGS['--scale']
    scene.render.image_settings.file_format = 'JPEG'; scene.render.image_settings.quality = 92
for look in ('AgX - Medium High Contrast', 'Medium High Contrast'):
    try: scene.view_settings.look = look; break
    except Exception: pass
name = 'world-' + SHOT + ('-%d' % FLAGS['--view'] if FLAGS['--view'] else '') + ('-poster' if '--poster' in argv else '')
if FLAGS['--clip']: scene.render.filepath = os.path.join(OUT, name + '.mp4'); bpy.ops.render.render(animation=True)
else: scene.render.filepath = os.path.join(OUT, name + '.jpg'); bpy.ops.render.render(write_still=True)
print('rendered', scene.render.filepath)
