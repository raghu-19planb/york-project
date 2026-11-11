// The painted look, shared by the game and the 3D worlds.
//
// The 3D picture is drawn into a small off-screen picture, then repainted onto the screen: a Kuwahara filter
// turns each neighbourhood into its flattest quarter, which gives flat dabs of colour with firm edges, like
// gouache laid on with a loaded brush. Then a light ridge where dabs meet and the tooth of the paper. This is a
// way of drawing, not a period painting: nothing here is copied from one.
//
// The home page's banner (hero3d.js) has its own, heavier version with an aged varnish. This one is kept clean
// and bright so labels, records and small figures stay readable.
//
// THREE is passed in because the game loads three.js by full URL and the worlds by import map.
export function makePaint(THREE, renderer, opts) {
  const o = Object.assign({ across: 820, aces: false, exposure: 1, alpha: false }, opts);
  // In the worlds the picture is kept in linear light with headroom, and the film curve is applied here. That
  // needs a float target; where a device cannot draw to one, the plain target is used and bright skies clip a little.
  const floatOK = o.aces && renderer.capabilities.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_half_float') || renderer.extensions.has('EXT_color_buffer_float'));
  const target = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, type: floatOK ? THREE.HalfFloatType : THREE.UnsignedByteType });
  if (!o.aces) target.texture.colorSpace = THREE.SRGBColorSpace; // the game has no film curve: an sRGB target keeps its darks from banding (it still reads back as linear light)
  const post = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: target.texture }, texel: { value: new THREE.Vector2() }, size: { value: new THREE.Vector2() }, exposure: { value: o.exposure }, film: { value: o.aces ? 1 : 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      precision highp float;
      uniform sampler2D tDiffuse; uniform vec2 texel; uniform vec2 size; uniform float exposure; uniform float film; varying vec2 vUv;
      const int R = 2;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      // the same film curve three.js uses on screen (ACES filmic), so colours match what the scene was lit for
      vec3 fit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
      vec3 curve(vec3 c) {
        const mat3 inM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
        const mat3 outM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
        c *= exposure / 0.6; c = outM * fit(inM * c); return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
      }
      void quarter(vec2 from, out vec4 mean, out float spread) {
        vec4 sum = vec4(0.0); vec3 sq = vec3(0.0);
        for (int j = 0; j <= R; j++) for (int i = 0; i <= R; i++) {
          vec4 c = texture2D(tDiffuse, vUv + (from + vec2(float(i), float(j))) * texel); c.rgb = min(c.rgb, vec3(4.0)); sum += c; sq += c.rgb * c.rgb;
        }
        float n = float((R + 1) * (R + 1));
        mean = sum / n; vec3 v = abs(sq / n - mean.rgb * mean.rgb); spread = v.r + v.g + v.b;
      }
      void main() {
        vec4 m, best; float sp, low = 1e9;
        quarter(vec2(-float(R), -float(R)), m, sp); if (sp < low) { low = sp; best = m; }
        quarter(vec2(0.0, -float(R)), m, sp); if (sp < low) { low = sp; best = m; }
        quarter(vec2(-float(R), 0.0), m, sp); if (sp < low) { low = sp; best = m; }
        quarter(vec2(0.0, 0.0), m, sp); if (sp < low) { low = sp; best = m; }
        float a = best.a;
        vec3 c = a > 0.001 ? best.rgb / a : vec3(0.0);   // where the sky shows through, colours come back un-thinned
        c = film > 0.5 ? curve(c) : pow(c, vec3(1.0 / 2.2)); // either way the stored picture is in linear light
        vec2 px = vUv * size;
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        c += clamp((dFdx(l) - dFdy(l)) * 1.5, -0.05, 0.05);                 // a ridge where one dab meets the next
        c *= 0.982 + 0.036 * noise(vec2(px.x * 0.05, px.y * 0.22));           // the drag of the brush
        c *= 0.985 + 0.03 * noise(px * 0.9);                                // the tooth of the paper
        c = mix(vec3(l), c, 1.12);                                          // gouache sits a little richer than a render
        c = c * vec3(1.02, 1.0, 0.965) + vec3(0.012, 0.008, 0.0);           // and a little warmer
        gl_FragColor = vec4(clamp(c, 0.0, 1.0) * a, a);
      }`,
    depthTest: false, depthWrite: false, blending: THREE.NoBlending
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post), postScene = new THREE.Scene(), postCam = new THREE.Camera();
  quad.frustumCulled = false; postScene.add(quad);
  return {
    target,
    render(scene, camera) {
      renderer.setRenderTarget(target); renderer.clear(); renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    },
    // w, h: the size of the picture on the page, in CSS pixels. The off-screen picture is kept at about
    // `across` pixels on its short side whatever the screen, so the dabs stay brush-sized.
    // `across` may be given for one picture, such as a gallery still, which is painted at its full size.
    resize(w, h, across) {
      if (!w || !h) return;
      const k = Math.min(2, (across || o.across) / Math.min(w, h)), tw = Math.max(2, Math.round(w * k)), th = Math.max(2, Math.round(h * k));
      target.setSize(tw, th); post.uniforms.texel.value.set(1 / tw, 1 / th); post.uniforms.size.value.set(w, h);
    }
  };
}
