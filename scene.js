// Pixel desk scene, drawn in virtual pixels (240 x 150).
// deskOps(t) returns [x, y, w, h, color] rectangles, so the same data drives the
// page canvas and any offline preview. The rider is seen from the side, sat at
// the desk, reaching for the keyboard.
const DESK_W = 240;
const DESK_H = 150;
const DESK_Y = 112; // desk top edge
const RIDER_X = 36;
const RIDER_Y = DESK_Y - 30;
const LAPTOP_X = 66;
const MUG_X = 124;
const HELMET_X = 146;

const PAL = {
  hair: "#6b3f22",
  hairHi: "#8c5a34",
  skin: "#e7b08a",
  skinShade: "#c98e66",
  eye: "#1a1420",
  mouth: "#b5785a",
  jacket: "#1f2129",
  jacketShade: "#15171d",
  stripe: "#a8b0bd",
  glove: "#17151c",
  chair: "#241b18",
  screenFrame: "#181b26",
  screen: "#07101f",
  base: "#3a4158",
  keys: "#2a3044",
  code: ["#ff4d8d", "#5ee7ff", "#ffd166", "#56cf8a"],
  cream: "#f4f1de",
  coffee: "#3b2216",
  steam: "rgba(232, 224, 207, 0.7)",
  red: "#d7263d",
  redHi: "#ff8a9a",
  visor: "#0f2233",
  woodTop: "#8a6a4f",
  wood: "#4a3428",
  woodDark: "#3a281e",
  spill: "rgba(94, 231, 255, 0.18)",
};

function deskOps(t) {
  const ops = [];
  const R = (x, y, w, h, c) => ops.push([Math.round(x), Math.round(y), w, h, c]);
  const DY = DESK_Y;
  const rx = RIDER_X;
  const ry = RIDER_Y;
  const bob = Math.sin(t * 1.6) > 0.7 ? -1 : 0; // slow breathing: shoulders and head
  const u = ry + bob;

  // Chair back (behind the rider)
  R(rx - 2, u + 12, 5, 30, PAL.chair);

  // Desk
  R(0, DY, DESK_W, 2, PAL.woodTop);
  R(0, DY + 2, DESK_W, DESK_H - DY - 2, PAL.wood);
  for (let x = 0; x < DESK_W; x += 30) R(x, DY + 8, 1, DESK_H - DY - 8, PAL.woodDark);
  R(0, DY + 16, DESK_W, 1, PAL.woodDark);

  // Laptop, screen facing the rider
  const LX = LAPTOP_X;
  R(LX + 4, DY - 30, 26, 27, PAL.screenFrame);
  R(LX + 6, DY - 28, 22, 22, PAL.screen);
  const lineW = [14, 18, 10, 16, 12, 8];
  lineW.forEach((w, i) => R(LX + 8, DY - 26 + i * 3, w, 1, PAL.code[i % PAL.code.length]));
  if (Math.floor(t * 2) % 2 === 0) R(LX + 8 + lineW[5] + 1, DY - 11, 2, 2, PAL.cream);
  R(LX, DY - 3, 30, 3, PAL.base);
  R(LX + 4, DY - 2, 22, 1, PAL.keys);
  R(LX - 2, DY, 34, 2, PAL.spill);

  // Hot coffee with rising steam
  const MX = MUG_X;
  R(MX, DY - 8, 6, 8, PAL.cream);
  R(MX + 6, DY - 6, 2, 4, PAL.cream);
  R(MX + 1, DY - 7, 4, 1, PAL.coffee);
  for (let k = 0; k < 3; k++) {
    const sy = DY - 12 - ((t * 3 + k * 2) % 6);
    R(MX + 2 + (k % 2), Math.floor(sy), 1, 1, PAL.steam);
  }

  // Helmet resting at the side of the desk
  const HX = HELMET_X;
  R(HX + 2, DY - 12, 16, 1, PAL.red);
  R(HX + 1, DY - 11, 18, 1, PAL.red);
  R(HX, DY - 10, 20, 9, PAL.red);
  R(HX + 3, DY - 11, 4, 1, PAL.redHi);
  R(HX + 9, DY - 11, 2, 9, PAL.cream);
  R(HX + 3, DY - 6, 14, 4, PAL.visor);
  R(HX + 4, DY - 5, 3, 1, "#5ee7ff");

  // Rider: jacket, head, and arm reaching to the keyboard
  R(rx + 3, u + 18, 4, 12, PAL.jacketShade); // far arm
  R(rx + 5, u + 16, 20, 4, PAL.jacket); // shoulders
  R(rx + 7, u + 20, 17, 10, PAL.jacket); // torso
  R(rx + 12, u + 15, 8, 2, PAL.jacketShade); // collar
  R(rx + 16, u + 17, 1, 13, PAL.stripe); // zip
  R(rx + 9, u + 24, 4, 1, PAL.stripe); // reflective stripes
  R(rx + 19, u + 25, 4, 1, PAL.stripe);

  R(rx + 8, u + 4, 2, 8, PAL.hair); // hair behind the head
  R(rx + 9, u + 0, 11, 3, PAL.hair); // hair top
  R(rx + 9, u + 3, 3, 6, PAL.hair);
  R(rx + 12, u + 3, 5, 2, PAL.hair); // fringe
  R(rx + 16, u + 3, 4, 2, PAL.hair);
  R(rx + 11, u + 1, 3, 1, PAL.hairHi);
  R(rx + 12, u + 5, 8, 7, PAL.skin); // face
  R(rx + 11, u + 7, 1, 3, PAL.skinShade); // ear
  R(rx + 17, u + 6, 2, 1, PAL.hair); // brow
  R(rx + 17, u + 7, 1, 2, PAL.eye);
  R(rx + 17, u + 10, 2, 1, PAL.mouth);
  R(rx + 13, u + 12, 6, 1, PAL.skin); // chin
  R(rx + 14, u + 13, 4, 3, PAL.skin); // neck

  // Reaching arm (stepped diagonal), cuff, and gloved hand
  R(rx + 22, ry + 18, 4, 5, PAL.jacket);
  R(rx + 25, ry + 21, 4, 5, PAL.jacket);
  R(rx + 28, ry + 23, 4, 5, PAL.jacket);
  R(rx + 31, ry + 25, 4, 4, PAL.jacket);
  R(rx + 31, ry + 25, 1, 4, PAL.stripe);
  R(rx + 33, ry + 26, 4, 4, PAL.glove);
  R(rx + 36, ry + 27, 2, 3, PAL.glove);

  return ops;
}

if (typeof module !== "undefined") {
  module.exports = { deskOps, DESK_W, DESK_H };
}
