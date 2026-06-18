const fs = require('fs');

const fixes = [
  {
    file: 'src/app/(admin)/clustering/page.tsx',
    replacements: [
      {
        from: "const response = await fetch('http://localhost:8000/dashboard.php', { credentials: 'include' });\n        setTahunAjaran(data.available_years[0]);\n      }",
        to: "const response = await fetch('http://localhost:8000/dashboard.php', { credentials: 'include' });\n      const data = await response.json();\n      setAvailableYears(data.available_years || []);\n      if (data.available_years && data.available_years.length > 0) {\n        setTahunAjaran(data.available_years[0]);\n      }"
      }
    ]
  },
  {
    file: 'src/app/(admin)/hasil/page.tsx',
    replacements: [
      {
        from: "const response = await fetch('http://localhost:8000/dashboard.php', { credentials: 'include' });\n        setSelectedYear(data.available_years[0]);\n        fetchData(data.available_years[0]);\n      }",
        to: "const response = await fetch('http://localhost:8000/dashboard.php', { credentials: 'include' });\n      const data = await response.json();\n      setAvailableYears(data.available_years || []);\n      if (data.available_years && data.available_years.length > 0) {\n        setSelectedYear(data.available_years[0]);\n        fetchData(data.available_years[0]);\n      }"
      }
    ]
  },
  {
    file: 'src/app/(admin)/laporan/page.tsx',
    replacements: [
      {
        from: "const response = await fetch('http://localhost:8000/dashboard.php', { credentials: 'include' });\n        setSelectedYear(data.available_years[0]);\n      }",
        to: "const response = await fetch('http://localhost:8000/dashboard.php', { credentials: 'include' });\n      const data = await response.json();\n      setAvailableYears(data.available_years || []);\n      if (data.available_years && data.available_years.length > 0) {\n        setSelectedYear(data.available_years[0]);\n      }"
      }
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
  console.log('Fixed lines in ' + file);
});
