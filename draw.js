// Shared canvas drawing: the four rides. Used by the game and the landing page.
window.YP = window.YP || {};

YP.VEHICLES = [
  { id: 'canoe', from: -Infinity, name: 'Canoe', era: 'to 1861' },
  { id: 'horsecar', from: 1861, name: 'Horsecar', era: '1861' },
  { id: 'streetcar', from: 1892, name: 'Electric streetcar', era: '1892' },
  { id: 'subway', from: 1954, name: 'Subway', era: '1954' }
];

YP.vehicleFor = function (year) {
  let v = YP.VEHICLES[0];
  for (const c of YP.VEHICLES) if (year >= c.from) v = c;
  return v;
};

YP.C = {
  ink: '#17202b', paper: '#f3ecdd', red: '#b8232f', green: '#8fb8a4',
  sun: '#e9b44c', wood: '#8a5a33', steel: '#9aa4ad'
};

// x = left edge, y = ground line, t = seconds (for small motion). Roughly 96 x 50.
YP.drawVehicle = function (ctx, id, x, y, t) {
  const C = YP.C;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const wheel = (wx, r) => {
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(wx, -r, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.paper; ctx.lineWidth = 1.5;
    const a = t * 9;
    ctx.beginPath();
    ctx.moveTo(wx + Math.cos(a) * r * 0.7, -r + Math.sin(a) * r * 0.7);
    ctx.lineTo(wx - Math.cos(a) * r * 0.7, -r - Math.sin(a) * r * 0.7);
    ctx.stroke();
  };
  const windows = (x0, x1, top, h, n) => {
    const gap = 4, w = (x1 - x0 - gap * (n - 1)) / n;
    ctx.fillStyle = '#dfeef0';
    for (let i = 0; i < n; i++) ctx.fillRect(x0 + i * (w + gap), top, w, h);
  };

  if (id === 'canoe') {
    const bob = Math.sin(t * 3) * 1.5;
    ctx.translate(0, bob + 6);
    // paddler
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(50, -34, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(45, -29, 10, 18);
    // paddle
    const sw = Math.sin(t * 5) * 10;
    ctx.strokeStyle = C.wood; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(54, -24); ctx.lineTo(70 + sw, -2); ctx.stroke();
    // hull
    ctx.fillStyle = C.wood;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(48, 6, 96, -18);
    ctx.quadraticCurveTo(80, -8, 48, -8);
    ctx.quadraticCurveTo(16, -8, 0, -18);
    ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
  } else if (id === 'horsecar') {
    // car
    ctx.fillStyle = C.sun; ctx.fillRect(0, -44, 54, 34);
    ctx.fillStyle = C.red; ctx.fillRect(0, -22, 54, 12);
    ctx.fillStyle = C.ink; ctx.fillRect(-3, -48, 60, 5);
    windows(5, 49, -40, 14, 4);
    wheel(12, 7); wheel(42, 7);
    // traces
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(54, -20); ctx.lineTo(66, -26); ctx.stroke();
    // horse
    const g = Math.sin(t * 12) * 5;
    ctx.fillStyle = C.wood;
    ctx.beginPath(); ctx.ellipse(78, -28, 15, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(88, -32); ctx.lineTo(96, -46); ctx.lineTo(102, -40); ctx.lineTo(94, -26); ctx.fill();
    ctx.strokeStyle = C.wood; ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(68, -24); ctx.lineTo(66 - g, -2);
    ctx.moveTo(74, -22); ctx.lineTo(76 + g, -2);
    ctx.moveTo(84, -22); ctx.lineTo(82 + g, -2);
    ctx.moveTo(89, -24); ctx.lineTo(92 - g, -2);
    ctx.stroke();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(64, -30); ctx.lineTo(58, -18); ctx.stroke();
  } else if (id === 'streetcar') {
    // pole and wire contact
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(40, -48); ctx.lineTo(16, -66); ctx.stroke();
    ctx.fillStyle = C.red; ctx.fillRect(0, -46, 96, 36);
    ctx.fillStyle = C.paper; ctx.fillRect(0, -46, 96, 20);
    ctx.fillStyle = C.ink; ctx.fillRect(-2, -50, 100, 5);
    windows(6, 90, -42, 13, 6);
    ctx.fillStyle = C.sun; ctx.beginPath(); ctx.arc(92, -18, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.fillRect(4, -11, 88, 4);
    wheel(18, 7); wheel(78, 7);
  } else {
    // subway car
    ctx.fillStyle = C.red;
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(0, -46); ctx.lineTo(84, -46);
    ctx.quadraticCurveTo(98, -44, 98, -26); ctx.lineTo(98, -8); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.steel; ctx.fillRect(0, -18, 98, 4);
    windows(6, 78, -40, 14, 5);
    ctx.fillStyle = '#dfeef0';
    ctx.beginPath(); ctx.moveTo(82, -40); ctx.lineTo(90, -40); ctx.lineTo(94, -26); ctx.lineTo(82, -26); ctx.fill();
    ctx.fillStyle = C.sun; ctx.beginPath(); ctx.arc(94, -14, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.fillRect(4, -9, 90, 4);
    wheel(16, 6); wheel(30, 6); wheel(68, 6); wheel(82, 6);
  }
  ctx.restore();
};
