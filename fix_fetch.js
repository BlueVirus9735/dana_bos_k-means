const fs = require('fs');

const fixes = [
  {
    file: 'src/app/(admin)/clustering/page.tsx',
    replacements: [
      { from: "fetch(, { credentials: 'include' }) {", to: "fetch('http://localhost:8000/dashboard.php', { credentials: 'include' });" },
      { from: "fetch(, { credentials: 'include',", to: "fetch('http://localhost:8000/clustering.php', { credentials: 'include'," }
    ]
  },
  {
    file: 'src/app/(admin)/dashboard/page.tsx',
    replacements: [
      { from: "fetch(, { credentials: 'include' }) {", to: "fetch(url, { credentials: 'include' });" },
      { from: "fetch(`http://localhost:8000/ranking.php?tahun_ajaran=${year}`);", to: "fetch(`http://localhost:8000/ranking.php?tahun_ajaran=${year}`, { credentials: 'include' });" }
    ]
  },
  {
    file: 'src/app/(admin)/data/kecamatan/page.tsx',
    replacements: [
      { from: "fetch(, { credentials: 'include' }) {", to: "fetch('http://localhost:8000/kecamatan.php', { credentials: 'include' });" },
      { from: "fetch(, { credentials: 'include',", to: "fetch(url, { credentials: 'include'," },
      { from: "fetch(, { credentials: 'include',", to: "fetch(`http://localhost:8000/kecamatan.php?id=${id}`, { credentials: 'include'," }
    ]
  },
  {
    file: 'src/app/(admin)/data/sekolah/page.tsx',
    replacements: [
      { from: "fetch(, { credentials: 'include' }),", to: "fetch('http://localhost:8000/kecamatan.php', { credentials: 'include' })," },
      { from: "fetch(, { credentials: 'include' }),", to: "fetch('http://localhost:8000/sekolah.php', { credentials: 'include' })," },
      { from: "fetch(, { credentials: 'include',", to: "fetch(url, { credentials: 'include'," },
      { from: "fetch(, { credentials: 'include',", to: "fetch(`http://localhost:8000/sekolah.php?id=${id}`, { credentials: 'include'," }
    ]
  },
  {
    file: 'src/app/(admin)/data/upload/page.tsx',
    replacements: [
      { from: "fetch(, { credentials: 'include',", to: "fetch('http://localhost:8000/upload_excel.php', { credentials: 'include'," }
    ]
  },
  {
    file: 'src/app/(admin)/hasil/page.tsx',
    replacements: [
      { from: "fetch(, { credentials: 'include' }) {", to: "fetch('http://localhost:8000/dashboard.php', { credentials: 'include' });" },
      { from: "fetch(`http://localhost:8000/hasil.php?tahun_ajaran=${year}`);", to: "fetch(`http://localhost:8000/hasil.php?tahun_ajaran=${year}`, { credentials: 'include' });" }
    ]
  },
  {
    file: 'src/app/(admin)/laporan/page.tsx',
    replacements: [
      { from: "fetch(, { credentials: 'include' }) {", to: "fetch('http://localhost:8000/dashboard.php', { credentials: 'include' });" },
      { from: "fetch(\n        `http://localhost:8000/laporan.php?tahun_ajaran=${selectedYear}`\n      );", to: "fetch(`http://localhost:8000/laporan.php?tahun_ajaran=${selectedYear}`, { credentials: 'include' });" }
    ]
  },
  {
    file: 'src/app/login/page.tsx',
    replacements: [
      { from: "fetch(, { credentials: 'include',", to: "fetch('http://localhost:8000/login.php', { credentials: 'include'," }
    ]
  }
];

fixes.forEach(({ file, replacements }) => {
  let content = fs.readFileSync(file, 'utf8');
  replacements.forEach(({ from, to }) => {
    // replace first occurrence of from with to
    content = content.replace(from, to);
  });
  fs.writeFileSync(file, content);
  console.log('Fixed ' + file);
});
