'use strict';

// Seed identities. Hand-written rather than faker-generated because the
// existing real accounts in this database are KNUST students and staff
// (@st.knust.edu.gh), and a marketplace populated with "Teri Corwin IV"
// and "Golden Crooks" reads as obviously synthetic next to them.
//
// Designers get a studio/handle-style name and a personal address, the way
// someone selling work would present themselves. Students get their
// university address.

const DESIGNERS = [
  { name: 'Kwabena Osei',        email: 'kwabena.osei.designs@gmail.com',    bio: 'Functional printer upgrades and drivetrain parts' },
  { name: 'Ama Serwaa Boateng',  email: 'ama.serwaa.makes@gmail.com',        bio: 'Enclosures and electronics housings' },
  { name: 'Yaw Mensah',          email: 'yaw.mensah.forge@gmail.com',        bio: 'FPV frames and drone hardware' },
  { name: 'Adjoa Nyarko',        email: 'adjoa.nyarko.studio@gmail.com',     bio: 'Display miniatures and busts' },
  { name: 'Kofi Asante',         email: 'kofi.asante.cad@outlook.com',       bio: 'Precision mechanical components' },
  { name: 'Efua Danso',          email: 'efua.danso.prints@gmail.com',       bio: 'Articulated models and creature builds' },
  { name: 'Samuel Adjei',        email: 'samuel.adjei.works@gmail.com',      bio: 'Brackets, clips and shop fixtures' },
  { name: 'Nana Akua Frimpong',  email: 'nanaakua.frimpong@gmail.com',       bio: 'Scanned sculpture and heritage pieces' },
  { name: 'Ibrahim Fuseini',     email: 'ibrahim.fuseini.3d@gmail.com',      bio: 'Multi-material and tool-changer parts' },
  { name: 'Akosua Owusu',        email: 'akosua.owusu.design@outlook.com',   bio: 'Everyday functional prints' },
];

const STUDENTS = [
  { name: 'Michael Anane',       email: 'manane.seed@st.knust.edu.gh' },
  { name: 'Priscilla Amoah',     email: 'pamoah.seed@st.knust.edu.gh' },
  { name: 'Daniel Ofori',        email: 'dofori.seed@st.knust.edu.gh' },
  { name: 'Gifty Tetteh',        email: 'gtetteh.seed@st.knust.edu.gh' },
  { name: 'Emmanuel Baidoo',     email: 'ebaidoo.seed@st.knust.edu.gh' },
  { name: 'Sandra Appiah',       email: 'sappiah.seed@st.knust.edu.gh' },
  { name: 'Joseph Quartey',      email: 'jquartey.seed@st.knust.edu.gh' },
  { name: 'Abena Kyei',          email: 'akyei.seed@st.knust.edu.gh' },
  { name: 'Richard Bediako',     email: 'rbediako.seed@st.knust.edu.gh' },
  { name: 'Comfort Agyeman',     email: 'cagyeman.seed@st.knust.edu.gh' },
];

// Lab hardware. Names follow the "Prusa-MK3-04" convention that
// Printer.printerName's own comment gives as the expected format.
const PRINTERS = [
  { name: 'Prusa-MK3S-01',   location: 'College of Engineering — Fab Lab',      status: 'AVAILABLE' },
  { name: 'Prusa-MK3S-02',   location: 'College of Engineering — Fab Lab',      status: 'AVAILABLE' },
  { name: 'Prusa-MK4-03',    location: 'College of Engineering — Fab Lab',      status: 'BUSY' },
  { name: 'Prusa-XL-04',     location: 'Design Studio Annex',                   status: 'AVAILABLE' },
  { name: 'Bambu-X1C-05',    location: 'Design Studio Annex',                   status: 'BUSY' },
  { name: 'Bambu-P1S-06',    location: 'Innovation Hub — Ground Floor',         status: 'AVAILABLE' },
  { name: 'Ender-3V2-07',    location: 'Innovation Hub — Ground Floor',         status: 'MAINTENANCE' },
  { name: 'Ender-3V2-08',    location: 'Innovation Hub — Ground Floor',         status: 'AVAILABLE' },
  { name: 'Elegoo-Mars4-09', location: 'Resin Bay — Materials Lab',             status: 'OFFLINE' },
  { name: 'FormLabs-3L-10',  location: 'Resin Bay — Materials Lab',             status: 'AVAILABLE' },
];

module.exports = { DESIGNERS, STUDENTS, PRINTERS };
