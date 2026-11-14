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
# The things in the village added on 2026-11-14 and where each comes from (the same sources are named, entry by entry,
# in recording.js): bark doors hung from the top, a clan animal painted on the end of a house in black and red,
# firewood and bark barrels of food kept at each end, corn braided by the husks and hung to dry (Warren County
# Historical Society, Seneca Trunk: Seneca Homes); houses about 20 feet wide and 40 to 200 long, one fire to two
# families (Ganondagan State Historic Site); storage pits lined with bark (New York State Museum's model of a Mohawk
# village of about 1600). Moved for the picture, and said so on the page: the barrels and the corn are indoors in the
# sources and stand outside here. The turtle is our drawing: which clans lived at Teiaiagon is not recorded. The
# shot 'people' is a close line-up for checking faces and dress and is not used on the site.
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
# ---------- people ----------
# Each person is a jointed figure: a skeleton of sticks that Blender's Skin modifier wraps in a smooth body, so
# shoulders, elbows, knees and feet are where a person's are. A walker has eight poses of one stride, and the body
# is blended from one to the next, so knees bend and arms swing. Clothes are more sticks, a little fatter, over the
# same joints, so they move with the limbs. The head is modelled with a face: brow, eyes, nose, mouth, ears, hair.
#
# WHAT THE DRESS RESTS ON (Warren County Historical Society, "Seneca Trunk": Clothing, describing Iroquoian peoples;
# and the Verelst portraits of 1710): men wore a breechcloth held by a belt that also held up the leggings, and
# moccasins made from one piece of deerskin; in summer the breechcloth alone; a "tunic-like shirt" at other times.
# Men's hair was "roached", cut short and standing in a crest along the middle with the sides shaved, or worn with a
# braided lock; young men painted their faces. Women wore a longer dress or a skirt, shorter leggings tied above
# the knee, and their hair loose or tied in a bunch down the back. Small children wore nothing in summer.
# WHAT IS OUR CHOICE: the season is set at harvest, so that everyone is dressed, which suits a site for children;
# the children's clothes are small versions of the adults'. Every face, colour, pattern and pose is drawing: there
# is no portrait of anyone from Teiaiagon. Red and blue cloth stands for the wool traded from Europeans by 1680.
DEER, DEER2, FRINGE, RED, BLUE, LINEN, QUILL = flat('#b99363', 0.95), flat('#8f6c44', 0.95), flat('#d6bf93', 0.95), flat('#8f2f28', 0.95), flat('#2c4667', 0.95), flat('#d9cfb8', 0.95), flat('#efe7d2', 0.9)
SKINS = [flat('#8f5c3a', 0.6, 0.15), flat('#7f5234', 0.6, 0.15), flat('#9a6843', 0.6, 0.15)]
EYE, LIP, PAINT, WHITE = flat('#110b09', 0.3), flat('#6d3229', 0.7), flat('#a8281e', 0.8), flat('#f1ede2', 0.6)
SIZE = {'man': 1.0, 'woman': 0.94, 'boy': 0.72, 'girl': 0.68, 'child': 0.56}
BONES = [('hip', 'waist'), ('waist', 'chest'), ('chest', 'neck'), ('neck', 'head')]
for S_ in 'LR': BONES += [('hip', 'hip' + S_), ('hip' + S_, 'th' + S_), ('th' + S_, 'knee' + S_), ('knee' + S_, 'ank' + S_), ('ank' + S_, 'toe' + S_), ('chest', 'sh' + S_), ('sh' + S_, 'el' + S_), ('el' + S_, 'wr' + S_), ('wr' + S_, 'ha' + S_)]

def skeleton(s, phase=None, act='stand', swing=0.42):
    # where every joint is, for a figure s times a grown man's height, facing +x with its feet on the ground.
    # phase: how far through a stride (0 to tau) a walker is. act: stand, sit (on a log), carry (arms held out in front).
    TH, SH, UA, FA = 0.43 * s, 0.42 * s, 0.27 * s, 0.25 * s; J = {}; hipz = 0.90 * s
    if act == 'sit': hipz = 0.46 * s
    def leg(side, th, kb):
        y = side * 0.085 * s; h = Vector((0, y, hipz)); k = h + Vector((math.sin(th), 0, -math.cos(th))) * TH; a = th - kb; an = k + Vector((math.sin(a), 0, -math.cos(a))) * SH
        n = 'L' if side > 0 else 'R'; J['hip' + n] = h; J['th' + n] = h.lerp(k, 0.3); J['knee' + n] = k; J['ank' + n] = an; J['toe' + n] = an + Vector((0.15 * s, 0, -0.035 * s))
    def arm(side, ua, eb, out=0.05):
        sh = Vector((0.015 * s, side * 0.175 * s, hipz + 0.50 * s)); e = sh + Vector((math.sin(ua), side * out, -math.cos(ua))).normalized() * UA; f = ua + eb; w = e + Vector((math.sin(f), -side * out * 0.6, -math.cos(f))).normalized() * FA
        n = 'L' if side > 0 else 'R'; J['sh' + n] = sh; J['el' + n] = e; J['wr' + n] = w; J['ha' + n] = w + Vector((math.sin(f), 0, -math.cos(f))) * 0.085 * s
    if phase is None:
        if act == 'sit': leg(1, 1.42, 1.5); leg(-1, 1.5, 1.42)
        else: leg(1, 0.05, 0.06); leg(-1, -0.04, 0.05)
    else:
        for side, p in ((1, phase), (-1, phase + math.pi)): leg(side, swing * math.sin(p), 0.1 + 0.68 * max(0.0, math.cos(p)) ** 1.5)
    if act == 'carry': arm(1, 0.45, 1.25, 0.02); arm(-1, 0.45, 1.25, 0.02)
    elif act == 'sit': arm(1, 0.55, 0.7); arm(-1, 0.5, 0.75)
    elif phase is None: arm(1, 0.05, 0.18); arm(-1, 0.02, 0.2)
    else:
        for side, p in ((1, phase + math.pi), (-1, phase)): arm(side, swing * 0.9 * math.sin(p), 0.22 + 0.2 * max(0.0, math.sin(p)))
    lean = 0.04 * s if phase is not None else 0.0
    J['hip'] = Vector((0, 0, hipz)); J['waist'] = Vector((lean * 0.3, 0, hipz + 0.17 * s)); J['chest'] = Vector((lean + 0.012 * s, 0, hipz + 0.37 * s)); J['neck'] = Vector((lean + 0.02 * s, 0, hipz + 0.555 * s)); J['head'] = Vector((lean + 0.03 * s, 0, hipz + 0.62 * s))
    drop = min(J['toeL'].z, J['toeR'].z, J['ankL'].z - 0.03 * s, J['ankR'].z - 0.03 * s) - 0.02 * s      # set the lower foot on the ground
    if act != 'sit':
        for n in J: J[n] = J[n] - Vector((0, 0, drop))
    return J

def sticks(name, joints, bones, radii, mat, poses=None, parent=None, sub=2):
    names = [n for n in joints if any(n in b for b in bones)]; idx = {n: i for i, n in enumerate(names)}
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(joints[n]) for n in names], [(idx[a], idx[b]) for a, b in bones], []); me.update(); me.materials.append(mat)
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); sk = ob.modifiers.new('skin', 'SKIN'); sk.use_smooth_shade = True
    if not len(me.skin_vertices): raise RuntimeError('no skin layer on ' + name)
    seen = set()
    for i, n in enumerate(names):   # one root for each separate piece
        r = radii[n]; me.skin_vertices[0].data[i].radius = r if isinstance(r, tuple) else (r, r); root = n not in seen
        if root:
            grow = [n]
            while grow:
                c = grow.pop(); seen.add(c)
                for a, b in bones:
                    for u, v in ((a, b), (b, a)):
                        if u == c and v not in seen: grow.append(v)
        me.skin_vertices[0].data[i].use_root = root
    ss = ob.modifiers.new('smooth', 'SUBSURF'); ss.levels = sub; ss.render_levels = sub
    if poses:
        ob.shape_key_add(name='rest')
        for k, pz in enumerate(poses):
            kb = ob.shape_key_add(name='p%d' % k); kb.value = 0.0      # a new pose starts switched off (Blender 5 adds it switched on)
            for i, n in enumerate(names): kb.data[i].co = pz[n]
    if parent: ob.parent = parent
    return ob

def stride(ob, period):
    # blend through the eight poses of a stride, over and over, for the length of the recording
    frames = FLAGS['--clip']; blocks = ob.data.shape_keys.key_blocks; n = len(blocks) - 1; step = period / n; keys('LINEAR')
    if not frames: return      # a still keeps the pose the figure was built in, caught in mid-step
    for k in range(n):
        kb = blocks[k + 1]; t = 1 + k * step - period
        while t < frames + period:
            for f, v in ((t - step, 0.0), (t, 1.0), (t + step, 0.0)): kb.value = v; kb.keyframe_insert('value', frame=f)
            t += period
        kb.value = 0.0

def head(s, who, skin, r, parent, at):
    h = Make('head'); R = 0.098 * s
    h.ball((0, 0, 0), R, skin, scale=(0.96, 0.82, 1.12), seg=24); h.ball((0.022 * s, 0, -0.05 * s), 0.07 * s, skin, scale=(0.95, 0.86, 0.95), seg=18)                   # skull and jaw
    h.rod((0.082 * s, 0, 0.012 * s), (0.112 * s, 0, -0.026 * s), 0.011 * s, skin, rb=0.017 * s, seg=8); h.ball((0.108 * s, 0, -0.03 * s), 0.016 * s, skin, scale=(0.9, 1.25, 0.8), seg=10)   # nose
    for side in (-1, 1):
        h.ball((0.082 * s, side * 0.034 * s, 0.014 * s), 0.012 * s, WHITE, scale=(0.6, 1.2, 0.62), seg=10); h.ball((0.0875 * s, side * 0.033 * s, 0.014 * s), 0.0078 * s, EYE, seg=8)                # eyes
        h.rod((0.091 * s, side * 0.014 * s, 0.036 * s), (0.08 * s, side * 0.058 * s, 0.032 * s), 0.0065 * s, EYE, rb=0.004 * s, seg=6)                                    # brows
        h.ball((0.0, side * 0.081 * s, -0.004 * s), 0.024 * s, skin, scale=(0.55, 0.4, 1.0), seg=10)                                                                    # ears
        h.ball((0.05 * s, side * 0.05 * s, -0.022 * s), 0.028 * s, skin, scale=(0.8, 0.7, 0.8), seg=10)                                                                   # cheekbones
    h.rod((0.083 * s, -0.024 * s, -0.057 * s), (0.083 * s, 0.024 * s, -0.057 * s), 0.0075 * s, LIP, seg=6)                                                              # mouth
    style = r.choice(['roach', 'roach', 'lock']) if who in ('man', 'boy') else 'tail'
    if style == 'roach':        # the crest along the middle, the sides shaved
        for k in range(11): a = math.radians(72 - k * 15); h.ball((R * 0.97 * math.cos(a), 0, R * 1.14 * math.sin(a)), 0.03 * s, HAIR, scale=(1.0, 0.45, 1.0), seg=8)
        h.rod((-0.08 * s, 0, -0.03 * s), (-0.1 * s, 0, -0.2 * s), 0.016 * s, HAIR, rb=0.008 * s, seg=6)
    else:                       # hair over the crown and the back of the head, clear of the face
        cap = bmesh.ops.create_uvsphere(h.bm, u_segments=24, v_segments=14, radius=R * 1.06)['verts']; bmesh.ops.scale(h.bm, verts=cap, vec=(0.98, 0.86, 1.13)); bmesh.ops.translate(h.bm, verts=cap, vec=(-0.008 * s, 0, 0.006 * s))
        gone = [v for v in cap if v.co.x > 0.035 * s and v.co.z < 0.068 * s]; h.paint([v for v in cap if v not in gone], HAIR); bmesh.ops.delete(h.bm, geom=gone, context='VERTS')
        if style == 'tail':     # tied in a bunch down the back
            h.rod((-0.085 * s, 0, -0.02 * s), (-0.1 * s, 0, -0.16 * s), 0.04 * s, HAIR, rb=0.034 * s, seg=8); h.rod((-0.1 * s, 0, -0.16 * s), (-0.105 * s, 0, -0.42 * s), 0.034 * s, HAIR, rb=0.014 * s, seg=8); h.rod((-0.1 * s, 0, -0.15 * s), (-0.1 * s, 0, -0.18 * s), 0.043 * s, RED, seg=8)
        else:                   # a braided lock at the side
            h.rod((-0.02 * s, 0.085 * s, -0.01 * s), (0.0, 0.1 * s, -0.24 * s), 0.02 * s, HAIR, rb=0.009 * s, seg=6); h.rod((-0.08 * s, 0, -0.03 * s), (-0.095 * s, 0, -0.14 * s), 0.035 * s, HAIR, rb=0.02 * s, seg=8)
    if who == 'man' and r.random() < 0.6:   # young men painted their faces
        for side in (-1, 1): h.rod((0.094 * s, 0, -0.008 * s), (0.07 * s, side * 0.066 * s, -0.012 * s), 0.0075 * s, PAINT, seg=6)
    o = h.done(at, 0, parent=parent); return o

def person(at, turn, who='man', act='stand', walk=False, dress=0, seed=0, load=None):
    # who: man, woman, boy, girl, child. act: stand, sit, carry. walk: strides along the way it faces (a child with
    # walk=2 runs). dress picks between the choices each kind of person has. Returns the handle the whole figure hangs from.
    r = random.Random(seed * 131 + 7); s = SIZE[who] * r.uniform(0.97, 1.04); skin = SKINS[seed % len(SKINS)]; woman = who in ('woman', 'girl')
    root = bpy.data.objects.new('person', None); scene.collection.objects.link(root); root.location = at; root.rotation_euler = (0, 0, turn)
    swing = 0.62 if walk == 2 else 0.42; period = (15 if walk == 2 else 25) * (0.8 + 0.2 * s)
    poses = [skeleton(s, k * math.tau / 8, act, swing) for k in range(8)] if walk else None; rest = skeleton(s, 0.9, act, swing) if walk else skeleton(s, None, act)
    thin = 0.9 if who in ('boy', 'girl', 'child') else 1.0
    rad = {'hip': 0.128 * s, 'waist': (0.105 if woman else 0.118) * s * thin, 'chest': (0.138 if woman else 0.152) * s * thin, 'neck': 0.05 * s, 'head': 0.045 * s}
    for n in 'LR': rad.update({'hip' + n: 0.088 * s * thin, 'th' + n: 0.078 * s * thin, 'knee' + n: 0.054 * s, 'ank' + n: 0.04 * s, 'toe' + n: 0.034 * s, 'sh' + n: 0.05 * s * thin, 'el' + n: 0.042 * s, 'wr' + n: 0.032 * s, 'ha' + n: 0.036 * s})
    parts = [sticks('body', rest, BONES, rad, skin, poses, root)]
    fat = lambda d, names: {n: (rad[n] + d * s) for n in names}
    def wear(name, bones, d, mat):
        names = sorted({n for b in bones for n in b}); parts.append(sticks(name, {n: rest[n] for n in names}, bones, fat(d, names), mat, [{n: p[n] for n in names} for p in poses] if poses else None, root, 1))
    legs = lambda top: [b for n in 'LR' for b in (([('th' + n, 'knee' + n)] if top else []) + [('knee' + n, 'ank' + n)])]
    wear('moccasins', [('ank' + n, 'toe' + n) for n in 'LR'], 0.012, DEER2)
    cloth = [DEER, RED, BLUE][dress % 3]
    if woman:
        wear('leggings', legs(False), 0.01, DEER)                                             # a woman's leggings come to just above the knee
        wear('dress', [('hip', 'waist'), ('waist', 'chest'), ('chest', 'shL'), ('chest', 'shR'), ('shL', 'elL'), ('shR', 'elR')], 0.018, DEER if dress % 2 == 0 else LINEN)
        sk = Make('skirt'); hz_ = rest['hip'].z; top, low = hz_ + 0.1 * s, hz_ - (0.5 if who == 'woman' else 0.36) * s
        sk.rod((0, 0, top), (0.01 * s, 0, low), 0.15 * s, cloth, rb=(0.25 if not walk else 0.3) * s, seg=20); sk.rod((0.01 * s, 0, low + 0.045 * s), (0.01 * s, 0, low + 0.02 * s), 0.292 * s if walk else 0.245 * s, QUILL, seg=20)
        sk.rod((0, 0, top + 0.01 * s), (0, 0, top - 0.03 * s), 0.153 * s, DEER2, seg=20); parts.append(sk.done((0, 0, 0), 0, parent=root))
    else:
        if who == 'man' or dress % 2 == 0: wear('leggings', legs(True), 0.012, DEER)          # a man's leggings run up the thigh to his belt
        if dress % 3 == 1 and who == 'man': wear('shirt', [('hip', 'waist'), ('waist', 'chest'), ('chest', 'shL'), ('chest', 'shR'), ('shL', 'elL'), ('shR', 'elR')], 0.018, LINEN)
        bc = Make('breechcloth'); hz_ = rest['hip'].z; fl = cloth if cloth is not DEER else DEER2
        bc.rod((0, 0, hz_ + 0.085 * s), (0, 0, hz_ + 0.055 * s), 0.142 * s, DEER2, seg=18)                                                       # the belt
        for sx in (1, -1): bc.box((sx * 0.128 * s, 0, hz_ - 0.3 * s), (0.016 * s, 0.2 * s, 0.38 * s), fl); bc.box((sx * 0.131 * s, 0, hz_ - 0.3 * s), (0.014 * s, 0.2 * s, 0.03 * s), QUILL)   # the flaps, front and back, with a worked edge
        bc.rod((0, 0, hz_ + 0.03 * s), (0, 0, hz_ - 0.1 * s), 0.132 * s, fl, rb=0.118 * s, seg=18); parts.append(bc.done((0, 0, 0), 0, parent=root))
    head(s, who, skin, r, root, tuple(rest['head'] + Vector((0.012 * s, 0, 0.075 * s))))
    if load == 'wood':      # an armful of firewood
        w = Make('wood'); c = (rest['wrL'] + rest['wrR']) / 2
        for k in range(6): w.rod(c + Vector((0.02 * s * (k % 3), -0.36 * s, 0.03 * s * (k // 3) + 0.02)), c + Vector((0.02 * s * (k % 3), 0.36 * s, 0.03 * s * (k // 3) + 0.03)), 0.028 * s, BARK, seg=6)
        w.done((0, 0, 0), 0, parent=root)
    elif load == 'basket':  # a basket held in both arms
        b = Make('basket'); c = (rest['wrL'] + rest['wrR']) / 2 + Vector((0.03 * s, 0, 0.0)); b.rod(c + Vector((0, 0, -0.1 * s)), c + Vector((0, 0, 0.1 * s)), 0.13 * s, flat('#b79a62', 0.95), rb=0.17 * s, seg=14); b.ball(c + Vector((0, 0, 0.1 * s)), 0.15 * s, flat('#d9c65a', 0.9), scale=(1, 1, 0.35), seg=12); b.done((0, 0, 0), 0, parent=root)
    frames = FLAGS['--clip']
    if walk:
        for ob in parts:
            if ob.data.shape_keys: stride(ob, period)
        if frames:
            speed = 4 * 0.85 * s * math.sin(swing) * 24 / period      # a foot on the ground travels one step back in half a stride: move the body forward to match, so the feet do not slide
            keys('LINEAR'); end = Vector(at) + Vector((math.cos(turn), math.sin(turn), 0)) * speed * frames / 24
            if HZ: end.z = HZ(end.x, end.y)
            root.keyframe_insert('location', frame=1); root.location = end; root.keyframe_insert('location', frame=frames)
    return root

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
def longhouse(at, turn, length, emblem=False):
    h = Make('longhouse'); w, tall = 3.0, 5.6; n = int(length / 1.0); NA = 14; pole = flat('#6a5238', 0.9)
    prof = lambda a: (-w * math.copysign(abs(math.cos(a)) ** 0.62, math.cos(a)), tall * math.sin(a) ** 0.85)
    rows = [[h.bm.verts.new((-length / 2 + i * length / n, prof(math.pi * j / NA)[0], prof(math.pi * j / NA)[1] + random.uniform(-0.03, 0.03))) for j in range(NA + 1)] for i in range(n + 1)]
    for i in range(n):
        for j in range(NA): h.bm.faces.new((rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]))
    h.paint([v for r in rows for v in r], ELM)
    for end in (0, n):   # the end walls, with a low door
        mid = h.bm.verts.new((rows[end][0].co.x, 0, 2.2)); ring = rows[end]
        for j in range(NA): h.bm.faces.new((ring[j], ring[j + 1], mid) if end else (ring[j + 1], ring[j], mid))
        h.bm.faces.new((ring[0], ring[NA], mid) if end else (ring[NA], ring[0], mid)); h.paint([mid], ELM); sx = -1 if end == 0 else 1; h.box((rows[end][0].co.x + sx * 0.03, 0, 0), (0.08, 1.0, 1.7), flat('#1a1410', 0.9)); dx = rows[end][0].co.x; dv = h.box((dx + sx * 0.45, 0, 0.5), (0.06, 1.05, 1.5), ELM); bmesh.ops.rotate(h.bm, verts=dv, cent=(dx, 0, 1.95), matrix=Matrix.Rotation(sx * -0.5, 3, 'Y'))   # the door: a sheet of bark hung from the top and propped open
        if emblem:   # a clan animal painted on the end of the house, in red and black: a turtle, seen from above
            ex = dx + sx * 0.05; red_, blk_ = flat('#9a2a20', 0.9), flat('#15100d', 0.9); h.ball((ex, 0, 3.5), 0.52, blk_, scale=(0.06, 1.0, 1.25), seg=16); h.ball((ex + sx * 0.02, 0, 3.5), 0.44, red_, scale=(0.06, 1.0, 1.25), seg=16); h.ball((ex + sx * 0.02, 0, 4.22), 0.17, red_, scale=(0.08, 1.0, 1.2), seg=10)
            for sy_, sz_ in ((-1, 0.38), (1, 0.38), (-1, -0.38), (1, -0.38)): h.ball((ex + sx * 0.02, sy_ * 0.5, 3.5 + sz_), 0.15, red_, scale=(0.08, 1.3, 0.8), seg=8)
            h.rod((ex + sx * 0.02, 0, 2.95), (ex + sx * 0.02, 0, 2.7), 0.05, red_, rb=0.01, seg=5)
        for k in range(9): h.rod((dx + sx * (0.5 + 0.22 * (k % 3)), 1.5, 0.12 + 0.2 * (k // 3)), (dx + sx * (0.5 + 0.22 * (k % 3)), 2.9, 0.12 + 0.2 * (k // 3)), 0.1, BARK, seg=6)    # firewood stacked by the door
        for k in range(2): h.rod((dx + sx * 0.7, -1.7 - k * 0.85, 0.0), (dx + sx * 0.7, -1.7 - k * 0.85, 0.95), 0.36, ELM, rb=0.33, seg=12); h.ball((dx + sx * 0.7, -1.7 - k * 0.85, 0.95), 0.33, flat('#d9c65a', 0.9), scale=(1, 1, 0.3), seg=10)   # barrels of elm bark, full of corn
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
    # A still is taken from (at, look). For a recording the camera travels evenly on to (to, look_to) over ten
    # seconds. How far is a balance found the hard way: kilometres in five seconds juddered at 24 pictures a second;
    # a drift of a few metres (what Madras does) read as nothing happening. So the ground shots move at a walk,
    # about 1.2 m a second, and the air shot swings part-way round the bay: the picture shifts two or three pixels a frame.
    cam = bpy.data.objects.new('camera', bpy.data.cameras.new('camera')); scene.collection.objects.link(cam); scene.camera = cam; cam.data.lens = lens; cam.data.clip_start = 0.2; cam.data.clip_end = 9000
    frames = FLAGS['--clip']; keys('LINEAR')
    for f, (a, l) in ((max(2, frames), (to or at, look_to or look)), (1, (at, look))) if '--end' not in argv else ((1, (to or at, look_to or look)),):   # --end: a still from where the move finishes, to check it
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

if SHOT == 'people':
    # A line-up, close, to check faces, dress and the walk. Not used on the site.
    g, hz = ground(40); HZ = hz; sky_and_sun(48)
    row = [('man', 'stand', False, 0, None), ('man', 'stand', False, 1, None), ('woman', 'stand', False, 0, None), ('woman', 'carry', False, 1, 'basket'), ('boy', 'stand', False, 1, None), ('girl', 'stand', False, 2, None), ('child', 'stand', False, 0, None), ('man', 'stand', True, 2, None), ('woman', 'carry', True, 2, 'wood'), ('woman', 'sit', False, 1, None)]
    for k, (who, act, walk, dress, load) in enumerate(row): x = (k - 4.5) * 0.95; person((x, 6.0, hz(x, 6.0) + (0.0 if act != 'sit' else 0.0)), -math.pi / 2 + (0.5 if walk else 0.12 * ((k % 3) - 1)), who, act, walk, dress, k, load)
    if FLAGS['--view']: camera((0.3, 3.2, 1.45), (-0.9, 6.0, 1.35), 60)
    else: camera((0.0, -4.5, 1.5), (0.0, 6.0, 0.9), 50, to=(0.0, -4.5, 1.5), look_to=(0.0, 6.0, 0.9))
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    for o in scene.objects:
        if o.name.startswith('body'): e = o.evaluated_get(dg); bb = [e.matrix_world @ Vector(c) for c in e.bound_box]; print('BODY', o.name, 'keys', bool(o.data.shape_keys), 'x %.2f..%.2f z %.2f..%.2f' % (min(v.x for v in bb), max(v.x for v in bb), min(v.z for v in bb), max(v.z for v in bb)))
elif SHOT == 'aerial':
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
    else: camera((3100, -3300, 3400), (950, -400, 0), 40, to=(3300, -1520, 2450), look_to=(1100, 100, 0))   # high over the lake, swinging a quarter of the way round the bay and coming down toward it
    scene.camera.data.clip_start = 20; scene.camera.data.clip_end = 150000
elif SHOT == 'village':
    # Inside the clearing, looking along the houses toward the fields and the forest edge.
    g, hz = ground(-30); HZ = hz; sky_and_sun(62)      # the light travels north-east: an afternoon sun behind the viewer's left shoulder
    Q = math.pi / 2   # the houses stand end-on to the viewer, in two loose rows with a lane between
    houses = [((-9, 30), Q + 0.06, 24), ((9.5, 36), Q - 0.08, 28), ((-10, 62), Q - 0.04, 26), ((10, 72), Q + 0.1, 22), ((-30, 44), Q + 0.2, 20), ((31, 50), Q - 0.22, 22), ((-28, 78), Q + 0.05, 18), ((30, 86), Q - 0.1, 20)]
    for k, ((x, y), turn, L) in enumerate(houses): longhouse((x, y, hz(x, y) - 0.05), turn, L, emblem=k in (0, 1, 3, 4))
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
    # Who is in the lane. Each: place, the way they face, who, what they are doing, walking (2 is running), dress, what they carry.
    # Nobody here is a known person; who is where, and doing what, is our picture of an ordinary afternoon at harvest.
    folk = [((-2.2, 18), 1.55, 'man', 'stand', True, 0, None), ((2.6, 46), -1.6, 'woman', 'carry', True, 1, 'wood'), ((-1.2, 41), -1.55, 'woman', 'stand', True, 2, None), ((-2.2, 41.6), -1.5, 'girl', 'stand', True, 1, None),
            ((-9.5, 31), 0.1, 'boy', 'stand', 2, 0, None), ((5.6, 22), 0.6, 'man', 'stand', False, 1, None), ((6.6, 22.7), -2.5, 'man', 'stand', False, 2, None), ((6.2, 27.5), -1.3, 'woman', 'carry', False, 0, 'basket'),
            ((-2.9, 30.3), -0.5, 'woman', 'sit', False, 0, None), ((-4.5, 29.9), 0.4, 'woman', 'sit', False, 2, None), ((-3.7, 31.0), -1.5, 'child', 'stand', False, 0, None), ((3.4, 60), -1.55, 'man', 'stand', True, 1, None),
            ((17, 40), 3.0, 'man', 'carry', True, 0, 'wood'), ((-15, 44), 0.2, 'girl', 'stand', 2, 0, None), ((1.5, 70), -1.6, 'woman', 'carry', True, 0, 'basket')]
    for k, ((x, y), turn, who, act, walk, dress, load) in enumerate(folk): person((x, y, hz(x, y)), turn, who, act, walk, dress, k + 3, load)
    seat = Make('seats')    # the logs the two women sit on by the fire
    for (x, y), a in (((-2.9, 30.3), 1.07), ((-4.5, 29.9), 1.97)): seat.rod((x - math.cos(a) * 0.8 - 0.1, y - math.sin(a) * 0.8, hz(x, y) + 0.2), (x + math.cos(a) * 0.8 - 0.1, y + math.sin(a) * 0.8, hz(x, y) + 0.2), 0.2, BARK, seg=8)
    seat.done()
    things = Make('things'); pot = flat('#5b4032', 0.9); fx, fy = -3.6, 29.2; gz = hz(fx, fy)
    for a in (0.3, 2.4, 4.5): things.ball((fx + math.cos(a) * 0.33, fy + math.sin(a) * 0.33, gz + 0.1), 0.14, flat('#8a857c', 1.0), seg=8)                       # three stones round the fire, and a clay pot on them
    things.ball((fx, fy, gz + 0.42), 0.27, pot, scale=(1, 1, 0.9), seg=14); things.rod((fx, fy, gz + 0.58), (fx, fy, gz + 0.68), 0.2, pot, rb=0.24, seg=14)
    for (x, y) in ((3.5, 25.5), (-6.0, 47.0)):     # storage pits: a hole lined with bark, its bark cover lying beside it
        z = hz(x, y); things.rod((x, y, z + 0.01), (x, y, z + 0.05), 0.8, flat('#1b140f', 1.0), seg=16); things.rod((x, y, z + 0.0), (x, y, z + 0.09), 0.92, ELM, rb=0.86, seg=16); things.rod((x, y, z + 0.06), (x, y, z + 0.1), 0.78, flat('#1b140f', 1.0), seg=16)
        c = things.box((x + 1.5, y + 0.4, z + 0.02), (1.7, 1.5, 0.06), ELM, turn=0.5)
    for (x, y), a in (((4.6, 30.5), 0.1), ((-5.2, 39.0), 1.5), ((4.4, 49), 0.0)):   # braids of corn hung up to dry on a pole between two forked posts
        z = hz(x, y); ex, ey = math.cos(a) * 1.5, math.sin(a) * 1.5
        for sgn in (-1, 1): things.rod((x + sgn * ex, y + sgn * ey, z), (x + sgn * ex, y + sgn * ey, z + 2.1), 0.06, BARK, seg=6)
        things.rod((x - ex, y - ey, z + 2.05), (x + ex, y + ey, z + 2.05), 0.045, BARK, seg=6)
        for k in range(9): t = -0.85 + k * 0.21; things.rod((x + t * ex, y + t * ey, z + 2.0), (x + t * ex, y + t * ey, z + 1.25 + 0.1 * (k % 2)), 0.075, flat('#d8b93f', 0.85), rb=0.05, seg=7)
    for (x, y), a in (((-5.6, 24.5), 0.3),):       # a bear skin drying over a pole
        z = hz(x, y); ex, ey = math.cos(a) * 1.0, math.sin(a) * 1.0
        for sgn in (-1, 1): things.rod((x + sgn * ex, y + sgn * ey, z), (x + sgn * ex, y + sgn * ey, z + 1.5), 0.05, BARK, seg=6)
        things.rod((x - ex, y - ey, z + 1.45), (x + ex, y + ey, z + 1.45), 0.04, BARK, seg=6); things.box((x, y, z + 0.55), (1.5, 0.08, 0.95), flat('#2a201a', 1.0), turn=a)
    things.done()
    fire = Make('fire'); fx, fy = -3.6, 29.2
    for k in range(7): a = k * 0.9; fire.rod((fx + math.cos(a) * 0.5, fy + math.sin(a) * 0.5, hz(fx, fy) + 0.05), (fx - math.cos(a) * 0.2, fy - math.sin(a) * 0.2, hz(fx, fy) + 0.22), 0.06, flat('#3a2a1e', 1.0), seg=5)
    fire.done(); smoke((fx, fy, hz(fx, fy) + 0.2), 6.0, 0.45)
    for (x, y), turn, L in houses[:5]:   # smoke from the holes along the ridge of the nearer houses
        for off in (-0.3, 0.25): smoke((x + math.cos(turn) * L * off, y + math.sin(turn) * L * off, hz(x, y) + 5.5), random.uniform(7, 10), random.uniform(0.55, 0.8))
    tufts(hz, lambda x, y: not clear(x, y) and all(abs((x - hx) * math.cos(t) + (y - hy) * math.sin(t)) > L / 2 + 1 or abs(-(x - hx) * math.sin(t) + (y - hy) * math.cos(t)) > 4.2 for (hx, hy), t, L in houses) and (abs(x) > 4.5 or random.random() < 0.08), 1500, (-70, 70, -6, 116))
    if FLAGS['--view']: camera((-34, 9, hz(-34, 9) + 3.4), (-8, 46, 2.2), 32)                      # from the corn hills, across to the houses
    else: camera((-1.6, 1.5, hz(-1.6, 1.5) + 1.7), (0.5, 40, 3.2), 28, to=(-0.6, 15.5, hz(-0.6, 15.5) + 1.7), look_to=(0.6, 54, 3.2))   # walking up the lane at a person's pace, 14 m in the ten seconds
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
    # Who is on the beach (see the note on the village lane: none of them is a known person).
    folk = [((9.5, 1.4), 0.05, 'man', 'stand', True, 0, None), ((30, 2.6), 3.1, 'man', 'stand', True, 2, None), ((31.3, 1.7), 3.12, 'woman', 'carry', True, 1, 'basket'), ((24, 4.8), -0.9, 'woman', 'sit', False, 0, None),
            ((16.5, 4.6), -1.3, 'man', 'stand', False, 1, None), ((17.6, 5.0), -2.2, 'boy', 'stand', False, 1, None), ((44, 0.4), 3.12, 'boy', 'stand', 2, 0, None), ((48, 1.0), 3.1, 'girl', 'stand', 2, 2, None),
            ((56, 2.4), 3.1, 'man', 'carry', True, 0, 'wood'), ((66, 3.0), 3.1, 'woman', 'stand', True, 0, None)]
    for k, ((x, y), turn, who, act, walk, dress, load) in enumerate(folk): person((x, y, hz(x, y)), turn, who, act, walk, dress, k + 20, load)
    seat = Make('seat'); seat.rod((23.2, 4.3, hz(24, 4.8) + 0.2), (24.8, 5.3, hz(24, 4.8) + 0.2), 0.2, BARK, seg=8); seat.done()
    tufts(hz, lambda x, y: y > 9.5 + 4 * math.sin(x * 0.06) + random.uniform(0, 6), 1800, (-60, 110, 8, 40))
    drift = Make('drift'); wood = photo('driftwood', 'bark_brown_02', 0.8, tint='#cfc4b0')
    for k in range(9): x, y = random.uniform(2, 70), random.uniform(-0.5, 6); a = random.uniform(0, math.pi); L = random.uniform(1.5, 4.5); drift.rod((x, y, hz(x, y) + 0.1), (x + math.cos(a) * L, y + math.sin(a) * L * 0.4, hz(x, y) + 0.16), random.uniform(0.07, 0.16), wood, seg=7)
    drift.done()
    far = Make('peninsula'); fs = flat('#dccb9c', 0.95)   # across the bay, the long sand peninsula that shelters it, low on the horizon
    vs = [far.bm.verts.new(q) for q in ((-2500, -1500, -0.2), (2500, -1150, -0.2), (2500, -1050, 1.6), (-2500, -1400, 1.6))]; far.bm.faces.new(vs); vs2 = [far.bm.verts.new(q) for q in ((-2500, -1400, 1.6), (2500, -1050, 1.6), (2500, -900, 1.6), (-2500, -1250, 1.6))]; far.bm.faces.new(vs2); far.paint(vs + vs2, fs); far.done()
    scatter([tree('fartree', 20, 'leaf', LEAVES[0]), tree('farpine', 28, 'pine', LEAVES[3])], [(x, -1330 + 0.07 * x + random.uniform(-40, 40), 1.5) for x in range(-2400, 2400, 26) if random.random() < 0.45])
    if FLAGS['--view']: camera((34.2, 0.0, hz(34.2, 0.0) + 1.1), (31.8, 5.2, 0.6), 30)                   # close on one canoe, from the water's edge (people are kept at a distance: they are simple figures)
    else: camera((-8.0, 4.6, hz(-8.0, 4.6) + 1.65), (40, -1.0, 2.4), 28, to=(2.6, 2.0, hz(2.6, 2.0) + 1.65), look_to=(52, -1.0, 2.4))   # walking along the sand toward the canoes, about 11 m in the ten seconds

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
