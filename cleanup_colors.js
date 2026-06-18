const fs = require('fs');
const path = require('path');

const directories = [
  'src/app/(admin)/dashboard',
  'src/app/(admin)/data/kecamatan',
  'src/app/(admin)/data/sekolah',
  'src/app/(admin)/data/upload',
  'src/app/(admin)/clustering',
  'src/app/(admin)/hasil',
  'src/app/(admin)/laporan',
];

const fileExts = ['.tsx'];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/bg-blue-100/g, 'bg-indigo-500/10');
  content = content.replace(/border-blue-100/g, 'border-indigo-500/20');
  content = content.replace(/text-blue-700/g, 'text-indigo-400');
  
  content = content.replace(/bg-amber-50(?!0)/g, 'bg-amber-500/10');
  content = content.replace(/border-amber-100/g, 'border-amber-500/20');
  content = content.replace(/text-amber-700/g, 'text-amber-400');

  content = content.replace(/bg-red-50(?!0)/g, 'bg-rose-500/10');
  content = content.replace(/border-red-200/g, 'border-rose-500/20');
  content = content.replace(/text-red-700/g, 'text-rose-400');

  content = content.replace(/bg-green-50(?!0)/g, 'bg-emerald-500/10');
  content = content.replace(/border-green-200/g, 'border-emerald-500/20');
  content = content.replace(/text-green-700/g, 'text-emerald-400');

  content = content.replace(/bg-yellow-50(?!0)/g, 'bg-yellow-500/10');
  content = content.replace(/border-yellow-200/g, 'border-yellow-500/20');
  content = content.replace(/text-yellow-700/g, 'text-yellow-400');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Cleaned: ' + filePath);
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fileExts.includes(path.extname(fullPath))) {
      processFile(fullPath);
    }
  }
}

directories.forEach(walkDir);
