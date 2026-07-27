'use strict';

// Curated catalog of genuinely open-source 3D models, each with hand-set
// metadata. This is deliberately a hand-written table rather than random
// faker output: the previous seeder generated titles like "Handcrafted
// Rubber Shirt 3D Model" and filed a bicycle under DRONES, so nothing in
// the marketplace held together. Here the title, category, description and
// print size all describe the mesh that actually gets downloaded.
//
// Sources and licences:
//  - prusa3d/Original-Prusa-i3 (GPL-3.0) — real, printable printer parts,
//    authored in millimetres and Z-up like any bed-ready STL.
//  - alecjacobson/common-3d-test-models — the standard graphics research
//    model set (Stanford/AIM@Shape/Blender originals; see that repo's
//    README for per-model attribution). Authored Y-up at unit scale, so
//    each entry declares the print size to scale to.
//  - mrdoob/three.js (MIT) example meshes.

const PRUSA_MK3 = 'https://raw.githubusercontent.com/prusa3d/Original-Prusa-i3/MK3/Printed-Parts/stl/';
const PRUSA_MK25 = 'https://raw.githubusercontent.com/prusa3d/Original-Prusa-i3/MK2.5/Printed-Parts/stl/';
const PRUSA_MMU2 = 'https://raw.githubusercontent.com/prusa3d/Original-Prusa-i3/MMU2/STL/';
const JACOBSON = 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/master/data/';
const THREEJS = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/stl/';
// CC BY-NC 4.0 — NonCommercial. Every listing sourced from here is seeded
// at a price of 0.00 and carries the attribution in its description,
// because the rest of the catalog is permissively licensed and a paid
// listing would contradict this one's terms. If these get used for
// anything beyond local demo data, re-check that licence first.
const MEMORY_HALO = 'https://raw.githubusercontent.com/MemoryDrones/Memory-Halo-4-Long-Range-Drone-Frame/main/3d-prints/';

// Printable functional parts: already millimetre-scale and Z-up, so no
// rescale — their real dimensions are the listing's dimensions.
function part(file, title, category, description, base = PRUSA_MK3) {
  return { url: base + file, file, title, category, description, format: 'stl', upAxis: 'z' };
}

// FPV drone frame parts. Same millimetre/Z-up conventions as `part`, but
// forced free — see the MEMORY_HALO licence note above.
function drone(file, title, description) {
  return {
    url: MEMORY_HALO + file, file, title, category: 'DRONES', description,
    format: 'stl', upAxis: 'z', free: true,
    attribution: 'Memory Halo 4 long-range frame by MemoryDrones, CC BY-NC 4.0.',
  };
}

// Art/scan meshes: unit- or metre-scale and Y-up, so each declares the
// longest-edge size to scale to before measuring volume and print time.
function art(file, title, category, description, longestMm, base = JACOBSON) {
  return {
    url: base + file, file, title, category, description,
    format: file.endsWith('.obj') ? 'obj' : 'stl',
    upAxis: 'y',
    scaleToMm: longestMm,
  };
}

const CATALOG = [
  // ── Motion / drive components → GEARS ──────────────────────────────────
  part('extruder-idler.stl', 'MK3 Extruder Idler Arm', 'GEARS',
    'Tensioning idler arm for a Bondtech-style dual-drive extruder. Captures a 623 bearing and pivots on an M3 shaft. Print in PETG at 0.2mm with 4 perimeters — this part sees constant spring load and PLA creeps under it over time.'),
  part('x-carriage.stl', 'X-Carriage Bearing Block', 'GEARS',
    'Front half of the X-axis carriage. Holds three LM8UU linear bearings and the belt clamp. Needs no supports if printed on its back face; dimensional accuracy on the bearing bores matters more than surface finish here.'),
  part('x-carriage-back.stl', 'X-Carriage Rear Clamp', 'GEARS',
    'Rear clamp that closes over the X-carriage bearings. Pairs with the carriage block and pulls the bearings into alignment as the M3 screws tighten. Print two if you want a spare.'),
  part('x-end-idler.stl', 'X-End Idler Housing', 'GEARS',
    'Left-hand X-axis end that carries the belt idler pulley and the smooth-rod seats. The tensioner pocket accepts an M3x30 screw. PETG strongly recommended — this sits close to the heatbed.'),
  part('x-end-motor.stl', 'X-End Motor Mount', 'GEARS',
    'Right-hand X-axis end holding the NEMA17 stepper and the opposite rod seats. Bolt pattern is the standard 31mm NEMA17 square. Print at 0.2mm with 45% infill for a rigid motor mount.'),
  part('y-belt-idler.stl', 'Y-Axis Belt Idler', 'GEARS',
    'Y-axis idler block for a GT2 belt loop, running on a 623 bearing. Slots let you set belt tension before locking the frame screws down.'),
  part('y-belt-holder.stl', 'Y-Belt Tension Holder', 'GEARS',
    'Clamps the GT2 belt ends under the Y carriage. The serrated channel grips the belt teeth so tension holds without a zip tie.'),
  part('y-motor-holder.stl', 'Y-Axis Motor Bracket', 'GEARS',
    'NEMA17 bracket for the Y-axis stepper, with a slotted mounting face so belt tension can be trimmed after assembly. Print solid-ish — 50% infill, 4 perimeters.'),
  part('z-axis-bottom.stl', 'Z-Axis Lower Mount', 'GEARS',
    'Bottom Z-axis mount tying the leadscrew motor, the smooth rod and the frame together. One of the larger structural parts on the machine; give it a brim if your bed adhesion is marginal.'),
  part('z-axis-top.stl', 'Z-Axis Top Bracket', 'GEARS',
    'Upper Z bracket that locates the top of the smooth rod and stops the leadscrew whipping at speed. Prints without supports in the orientation supplied.'),
  part('mmu2-idler-body.stl', 'MMU2 Idler Body', 'GEARS',
    'Idler body from the multi-material unit — houses five bearings on a common shaft so each filament path gets its own pinch roller. Fine tolerances; print slow and calibrate your extrusion multiplier first.', PRUSA_MMU2),
  part('mmu2-idler.stl', 'MMU2 Idler Roller', 'GEARS',
    'Individual pinch roller for the MMU2 idler assembly. Small, quick print — run five at once on the plate.', PRUSA_MMU2),
  part('mmu2-pulley-body.stl', 'MMU2 Pulley Body', 'GEARS',
    'Drive pulley housing for the multi-material selector. Holds the drive gear and bearing stack that pushes filament through the selector.', PRUSA_MMU2),
  part('x-carriage.stl', 'MK2.5 X-Carriage', 'GEARS',
    'The MK2.5-generation X carriage, for machines still running the Rambo board. Same LM8UU bearing layout as the MK3 part but a different cable-path geometry.', PRUSA_MK25),

  // ── Electronics housings → ENCLOSURES ──────────────────────────────────
  part('Einsy-base.stl', 'Einsy Electronics Base', 'ENCLOSURES',
    'Main electronics enclosure base for an Einsy Rambo board. Ventilation slots run under the board and the mounting bosses are sized for M3 self-tapping screws. Large print — budget around six hours.'),
  part('Einsy-doors.stl', 'Einsy Enclosure Doors', 'ENCLOSURES',
    'Hinged access doors for the Einsy electronics case. Snap onto the printed hinges so you can reach the board without unbolting the whole enclosure.'),
  part('Einsy-hinges.stl', 'Einsy Door Hinges', 'ENCLOSURES',
    'Print-in-place hinge pair for the electronics enclosure doors. Tiny part, but print it in PETG — PLA hinges fatigue and snap after a few dozen cycles.'),
  part('PSU-cover-MK3.stl', 'PSU Safety Cover', 'ENCLOSURES',
    'Terminal cover for the power supply, shrouding the mains screw terminals. Print this one in PETG or ABS, not PLA — it sits directly against a component that runs warm.'),
  part('LCD-cover-ORIGINAL-MK3.stl', 'LCD Front Bezel', 'ENCLOSURES',
    'Front bezel for the 20x4 character LCD, with the knob cutout and a chamfered display window. Prints face-down for a clean visible surface.'),
  part('raspberry_cover.stl', 'Raspberry Pi Cover', 'ENCLOSURES',
    'Snap-on lid for a Raspberry Pi mounted to the printer frame, with cutouts for the port cluster and a vent over the SoC.'),
  part('rpi-zero-frame.stl', 'Pi Zero Mounting Frame', 'ENCLOSURES',
    'Frame that carries a Raspberry Pi Zero on the electronics enclosure for an OctoPrint host. Standoffs are moulded in — no separate hardware needed beyond four M2.5 screws.'),
  part('filament-sensor-cover.stl', 'Filament Sensor Cover', 'ENCLOSURES',
    'Cover for the extruder filament sensor, keeping dust off the optical gate while leaving the PTFE path clear.'),
  part('heatbed-cable-cover.stl', 'Heatbed Cable Cover', 'ENCLOSURES',
    'Strain-relief cover for the heatbed cable bundle at the bed end. Must be PETG or ABS — this part is bolted to a surface that reaches 100°C.'),
  part('mmu2-ele-cover.stl', 'MMU2 Electronics Cover', 'ENCLOSURES',
    'Cover for the MMU2 control board, with a routed channel for the ribbon cable back to the mainboard.', PRUSA_MMU2),
  part('Rambo-base.stl', 'Rambo Electronics Base', 'ENCLOSURES',
    'Electronics enclosure base for the older Rambo board — MK2/MK2.5 generation. Ventilated floor and integrated cable strain relief.', PRUSA_MK25),
  part('Rambo-doors.stl', 'Rambo Enclosure Doors', 'ENCLOSURES',
    'Access doors for the Rambo electronics case, matched to the Rambo base and its printed hinges.', PRUSA_MK25),
  part('mmu2-selector-front-plate.stl', 'MMU2 Selector Front Plate', 'ENCLOSURES',
    'Front plate of the MMU2 selector assembly, carrying the filament entry ports and the selector rail mounts.', PRUSA_MMU2),

  // ── Clips, holders, brackets → OTHER ───────────────────────────────────
  part('Spool-holder.stl', 'Universal Spool Holder', 'OTHER',
    'Frame-mounted spool holder that takes both 1kg and 2kg reels. The roller seat is generous enough that cardboard spools do not bind as they empty.'),
  part('LCD-knob.stl', 'LCD Control Knob', 'OTHER',
    'Replacement encoder knob with a knurled grip and a D-shaft socket. Ten-minute print, and a big upgrade over the bare shaft if you have lost the original.'),
  part('cable-holder.stl', 'Frame Cable Holder', 'OTHER',
    'Clip that routes the wiring loom along an aluminium extrusion, keeping the bundle clear of the moving Y axis.'),
  part('Extruder-cable-clip.stl', 'Extruder Cable Clip', 'OTHER',
    'Strain-relief clip for the extruder loom where it leaves the carriage — the highest-flex point in the whole cable path.'),
  part('Heatbed-cable-clip.stl', 'Heatbed Cable Clip', 'OTHER',
    'Clip that supports the heatbed cable bundle through its travel so the conductors flex along their length instead of at a single point.'),
  part('nozzle-fan.stl', 'Nozzle Cooling Fan Shroud', 'OTHER',
    'Part-cooling fan shroud directing airflow at the print just below the nozzle. Even cooling here is the difference between clean overhangs and drooping ones.'),
  part('nozzle-fan-45deg.stl', 'Angled Fan Duct 45°', 'OTHER',
    'Forty-five degree variant of the part-cooling duct, for a shallower approach angle and better clearance over tall prints.'),
  part('lcd-supports.stl', 'LCD Support Brackets', 'OTHER',
    'Bracket pair that carries the LCD assembly on the frame and sets its viewing angle.'),
  part('z-screw-cover.stl', 'Z Leadscrew Cover', 'OTHER',
    'Tube that shrouds the Z leadscrew, keeping grease off your prints and dust out of the thread.'),
  part('y-rod-holder.stl', 'Y-Axis Rod Holder', 'OTHER',
    'Clamp locating the Y-axis smooth rod against the frame. Print four — the Y axis needs a pair at each end.'),
  part('plug-aligner.stl', 'Connector Alignment Jig', 'OTHER',
    'Small jig that holds a connector square while you crimp and seat the pins. Prints in under fifteen minutes and saves a lot of swearing.'),
  part('extruder-idler-plug.stl', 'Idler Shaft Plug', 'OTHER',
    'Retaining plug that keeps the extruder idler shaft from walking out under vibration.'),
  part('mmu2-blade-holder.stl', 'MMU2 Blade Holder', 'OTHER',
    'Holder for the filament cutting blade in the multi-material unit. Handle the blade carefully during assembly.', PRUSA_MMU2),
  part('mmu2-frame-holder.stl', 'MMU2 Frame Holder', 'OTHER',
    'Bracket mounting the multi-material unit to the top of the printer frame.', PRUSA_MMU2),
  part('mmu2-front-PTFE-holder.stl', 'MMU2 Front PTFE Holder', 'OTHER',
    'Front PTFE tube retainer for the MMU2 filament paths, keeping all five tubes seated and parallel.', PRUSA_MMU2),
  part('mmu2-rear-PTFE-holder.stl', 'MMU2 Rear PTFE Holder', 'OTHER',
    'Rear PTFE tube block for the multi-material unit, setting the tube spacing on the buffer side.', PRUSA_MMU2),
  part('mmu2-selector-finda.stl', 'MMU2 FINDA Sensor Mount', 'OTHER',
    'Mount for the FINDA filament-presence probe on the MMU2 selector.', PRUSA_MMU2),
  part('s-buffer-spools.stl', 'Filament Buffer Spools', 'OTHER',
    'Buffer spools that take up filament slack between the multi-material unit and the extruder during a tool change.', PRUSA_MMU2),
  part('s-buffer-printer.stl', 'Filament Buffer Body', 'OTHER',
    'Main body of the filament buffer, stacking five slack loops in a compact frame that hangs off the printer.', PRUSA_MMU2),
  part('s-buffer-hook-uni.stl', 'Buffer Mounting Hook', 'OTHER',
    'Universal hook for hanging the filament buffer from a frame or shelf edge.', PRUSA_MMU2),
  part('s-buffer-spacer.stl', 'Buffer Spacer', 'OTHER',
    'Spacer setting the gap between filament buffer segments so the loops do not rub.', PRUSA_MMU2),
  part('mmu2-s-holder-base.stl', 'MMU2 Holder Base', 'OTHER',
    'Base plate of the MMU2-S holder assembly.', PRUSA_MMU2),
  part('mmu2-s-holder-lever-a.stl', 'MMU2 Holder Lever A', 'OTHER',
    'Lever arm A from the MMU2-S holder linkage.', PRUSA_MMU2),
  part('mmu2-s-holder-endstop.stl', 'MMU2 Holder Endstop', 'OTHER',
    'Endstop bracket for the MMU2-S holder, locating the microswitch against the lever.', PRUSA_MMU2),
  part('cable_holder.stl', 'MK2.5 Cable Holder', 'OTHER',
    'Cable management clip for the MK2.5 loom, sized for the Rambo-era harness.', PRUSA_MK25),
  part('Rambo-extruder-cable-clip.stl', 'Rambo Extruder Cable Clip', 'OTHER',
    'Extruder-side strain relief for MK2.5 machines.', PRUSA_MK25),
  part('Rambo-Hinges.stl', 'Rambo Door Hinges', 'OTHER',
    'Hinge pair for the Rambo electronics enclosure doors.', PRUSA_MK25),
  part('nozzle-fan-45deg-support.stl', 'Angled Fan Duct Support', 'OTHER',
    'Support bracket that braces the 45-degree fan duct against vibration at high travel speeds.'),
  part('Heatbed-cable-clip_for_8mm_sleeve.stl', 'Heatbed Clip — 8mm Sleeve', 'OTHER',
    'Heatbed cable clip sized for an 8mm braided sleeve, for anyone who has re-loomed their bed wiring.'),
  part('heatbed-cable-cover-no-screw.stl', 'Heatbed Cover — Screwless', 'ENCLOSURES',
    'Screwless variant of the heatbed cable cover that clips into place. Handy if you have stripped the original threads.'),
  part('mmu2-filament-sensor-cover.stl', 'MMU2 Filament Sensor Cover', 'ENCLOSURES',
    'Cover for the MMU2 filament sensor, shielding the optical gate from filament dust.', PRUSA_MMU2),
  part('mmu2-s-holder-lever-b.stl', 'MMU2 Holder Lever B', 'OTHER',
    'Lever arm B, the mirror of lever A in the MMU2-S holder linkage.', PRUSA_MMU2),
  part('s-buffer-spacer-hook.stl', 'Buffer Spacer Hook', 'OTHER',
    'Hooked spacer variant for the filament buffer stack, letting it hang rather than sit.', PRUSA_MMU2),

  // ── FPV drone frame parts → DRONES ─────────────────────────────────────
  drone('memory_halo_arm_motor_mount.stl', 'FPV Arm Motor Mount',
    'Motor mount for a long-range FPV quad arm, taking a standard 16x16mm bolt pattern. Print in a tough filament — nylon or a PA-CF blend if you have it, PETG at minimum. This part absorbs every crash.'),
  drone('memory_halo_bumper.stl', 'FPV Frame Bumper',
    'Front bumper that takes the first hit in a crash and is cheap to reprint. Deliberately the softest part of the airframe so the arms survive instead.'),
  drone('memory_halo_default_cam_mount_20mm.stl', 'FPV Camera Mount 20mm',
    'Camera cage for a 20mm FPV camera, with adjustable tilt for the uptilt angle you fly. Print at 0.15mm with high perimeter count.'),
  drone('memory_halo_protective_cam_mount_19mm.stl', 'Protective Camera Mount 19mm',
    'Fully enclosed 19mm camera mount that wraps the lens housing — the version to fly if you are hitting trees rather than gates.'),
  drone('memory_halo_flyfish_gps_mount.stl', 'GPS Module Mount',
    'Raised GPS mast that lifts the module clear of the power wiring, which is the usual cause of a poor satellite fix on a build like this.'),
  drone('memory_halo_left_sideplate.stl', 'Frame Side Plate',
    'Left side plate closing out the frame stack and protecting the flight controller from debris.'),
  drone('memory_halo_1_o4_pro_antenna_xt30_mount.stl', 'VTX Antenna & XT30 Mount',
    'Combined antenna holder and XT30 connector retainer for the rear of the frame, keeping the antenna clear of the props and the battery lead strain-relieved.'),
  drone('memory_halo_rear_protective_arm_mount.stl', 'Rear Protective Arm Mount',
    'Rear arm guard that shields the motor wiring where it enters the arm — the spot that chafes through first on a long-range build.'),

  // ── Figures, busts, creatures → MINIATURES ─────────────────────────────
  art('stanford-bunny.obj', 'Stanford Bunny', 'MINIATURES',
    'The Stanford Bunny — the most reproduced test model in computer graphics, scanned at Stanford in 1994. Prints cleanly at 80mm with no supports if you keep the ears at the back. A calibration piece as much as an ornament.', 80),
  art('armadillo.obj', 'Armadillo Figure', 'MINIATURES',
    'The Stanford Armadillo, a dense scan with deep surface detail that will show you exactly how good your layer adhesion is. 0.12mm layers reward the extra time.', 90),
  art('happy.obj', 'Happy Buddha Statuette', 'MINIATURES',
    'The Happy Buddha scan, a classic high-genus test mesh. Detailed robe folds make this an excellent resin print, though it holds up well on FDM at 0.1mm.', 100),
  art('lucy.obj', 'Lucy Angel Statue', 'MINIATURES',
    'Lucy, the winged angel statue scanned from the Stanford collection. Supports needed under the wings, but the result is a genuinely display-worthy piece at 140mm.', 140),
  art('nefertiti.obj', 'Nefertiti Bust', 'MINIATURES',
    'Bust of Nefertiti, from a museum scan. The neck and headdress silhouette prints without supports at this scale and looks superb in a matte filament.', 110),
  art('max-planck.obj', 'Max Planck Bust', 'MINIATURES',
    'Portrait bust of Max Planck. A favourite benchmark for surface reconstruction — fine enough around the eyes and collar to expose any under-extrusion.', 100),
  art('igea.obj', 'Igea Bust', 'MINIATURES',
    'The Igea bust from the AIM@Shape repository, a standard scanning benchmark. Clean topology and no overhangs worse than 50 degrees.', 100),
  art('homer.obj', 'Homer Figure', 'MINIATURES',
    'Stylised Homer character mesh. Smooth broad surfaces make it a forgiving print and a good candidate for a first painted figure.', 85),
  art('ogre.obj', 'Ogre Head', 'MINIATURES',
    'Detailed ogre head with heavy brow and jaw geometry. Tabletop-scale at 60mm, or scale it up to 150mm as a display bust.', 75),
  art('beast.obj', 'Beast Creature', 'MINIATURES',
    'Horned creature model with pronounced musculature. Supports required under the limbs; worth the cleanup for the surface detail.', 95),
  art('cheburashka.obj', 'Cheburashka Figure', 'MINIATURES',
    'The Cheburashka character mesh — big ears, simple rounded body, and almost no overhangs. One of the easiest models here to print well.', 80),
  art('bimba.obj', 'Bimba Bust', 'MINIATURES',
    'Bimba portrait bust, a smooth scan that prints beautifully in a satin filament with no supports at all.', 95),
  art('suzanne.obj', 'Suzanne Monkey Head', 'MINIATURES',
    "Blender's mascot Suzanne. Low-poly by design, so the facets are a feature — print it faceted at 70mm as a desk piece.", 70),

  // NOTE: alligator.obj and woody.obj from this same repo are deliberately
  // absent — both are flat 2D triangulations (zero depth on one axis) used
  // for surface-parameterisation research, not printable solids. They
  // render as silhouettes and measure 0 cm³.

  // ── Animals and organic forms → ARTICULATED ────────────────────────────
  art('horse.obj', 'Horse Figure', 'ARTICULATED',
    'Standing horse model. The legs are the challenge here — either add supports or split at the shoulder and pin the joints for an articulated version.', 130),
  art('cow.obj', 'Cow Figure', 'ARTICULATED',
    'Classic low-poly cow test mesh. Stable footprint, prints without supports, and the flat flanks take paint well.', 110),
  art('spot.obj', 'Spot the Cow', 'ARTICULATED',
    'Spot, Keenan Crane\'s much-loved cow model. Watertight, well-behaved geometry — one of the safest meshes in this collection to slice.', 100),
  art('beetle.obj', 'Beetle Model', 'ARTICULATED',
    'Beetle body with separable shell geometry, a natural candidate for a hinged wing-case build.', 90),
  art('beetle-alt.obj', 'Beetle Variant', 'ARTICULATED',
    'Alternate beetle mesh with a different leg arrangement, for anyone wanting a pair that are not identical.', 90),
  // xyzrgb_dragon.obj is excluded: the mesh is 11.8 MB and Cloudinary rejects
  // anything over 10 MB, so /api/files/upload 500s on it every time.

  // ── Precision / mechanical test geometry ───────────────────────────────
  art('fandisk.obj', 'Fandisk CAD Benchmark', 'GEARS',
    'The fandisk model, a CAD-style solid of sharp edges, fillets and flat faces. The standard test for whether your slicer and printer preserve crisp arrises.', 90),
  art('rocker-arm.obj', 'Rocker Arm', 'GEARS',
    'Engine rocker arm geometry — smooth curvature meeting hard mechanical features. Prints best on its side with supports under the arm.', 110),
  art('teapot.obj', 'Utah Teapot', 'OTHER',
    'The Utah Teapot, computer graphics\' oldest in-joke, first modelled by Martin Newell in 1975. The handle and spout both need supports. Every workshop should own one.', 120),

  art('binary/pr2_head_pan.stl', 'PR2 Head Pan Bracket', 'ENCLOSURES',
    'Head pan bracket from the PR2 research robot. A genuine robotics part rather than a decorative model, with real mounting geometry throughout.', 140, THREEJS),
  art('binary/pr2_head_tilt.stl', 'PR2 Head Tilt Bracket', 'ENCLOSURES',
    'The matching tilt bracket for the PR2 head assembly. Pair it with the pan bracket for the complete two-axis mechanism.', 140, THREEJS),
  art('ascii/slotted_disk.stl', 'Slotted Disk', 'GEARS',
    'Slotted disk — an optical encoder wheel blank. Print at 0.1mm and the slots come out crisp enough to actually chop a sensor beam.', 70, THREEJS),
];

// Filament colours, chosen per category so a marketplace grid does not read
// as one flat orange. Values are the base albedo the renderer shades from.
const FILAMENTS = {
  GEARS: [[212, 96, 30], [70, 82, 96], [196, 138, 40]],
  ENCLOSURES: [[58, 74, 96], [96, 104, 116], [40, 92, 104]],
  MINIATURES: [[206, 174, 132], [178, 92, 78], [150, 148, 158]],
  ARTICULATED: [[74, 128, 108], [188, 108, 52], [104, 92, 148]],
  DRONES: [[48, 60, 78], [190, 70, 60]],
  OTHER: [[214, 96, 32], [92, 108, 124], [176, 160, 128]],
};

module.exports = { CATALOG, FILAMENTS };
