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

  // Generic color replacements for dark theme
  content = content.replace(/bg-white/g, 'bg-slate-900/60 backdrop-blur-md');
  content = content.replace(/border-gray-100/g, 'border-white/10');
  content = content.replace(/border-gray-200/g, 'border-white/10');
  content = content.replace(/border-slate-100/g, 'border-white/10');
  content = content.replace(/border-slate-200/g, 'border-white/10');
  
  content = content.replace(/text-gray-800/g, 'text-slate-100');
  content = content.replace(/text-gray-700/g, 'text-slate-200');
  content = content.replace(/text-gray-600/g, 'text-slate-300');
  content = content.replace(/text-gray-500/g, 'text-slate-400');
  
  content = content.replace(/text-slate-800/g, 'text-slate-100');
  content = content.replace(/text-slate-700/g, 'text-slate-200');
  content = content.replace(/text-slate-600/g, 'text-slate-300');
  content = content.replace(/text-slate-500/g, 'text-slate-400');
  
  content = content.replace(/bg-gray-50\/50/g, 'bg-slate-800/50');
  content = content.replace(/bg-gray-50/g, 'bg-slate-800/50');
  content = content.replace(/bg-slate-50/g, 'bg-slate-800/50');
  content = content.replace(/hover:bg-gray-50\/50/g, 'hover:bg-slate-800/50');
  content = content.replace(/hover:bg-gray-50/g, 'hover:bg-slate-800/50');
  
  // Specific icon backgrounds
  content = content.replace(/bg-blue-50(?!0)/g, 'bg-indigo-500/10');
  content = content.replace(/bg-green-50(?!0)/g, 'bg-emerald-500/10');
  content = content.replace(/bg-purple-50(?!0)/g, 'bg-violet-500/10');
  content = content.replace(/bg-red-50(?!0)/g, 'bg-rose-500/10');
  content = content.replace(/bg-yellow-50(?!0)/g, 'bg-amber-500/10');

  // Specific text colors for icons
  content = content.replace(/text-blue-600/g, 'text-indigo-400');
  content = content.replace(/text-green-600/g, 'text-emerald-400');
  content = content.replace(/text-purple-600/g, 'text-violet-400');

  // Other structural
  content = content.replace(/divide-gray-100/g, 'divide-white/10');
  content = content.replace(/divide-gray-200/g, 'divide-white/10');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated: ' + filePath);
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

// Also process ClusterMap component
const clusterMapPath = path.join('src/components/ClusterMap.tsx');
if (fs.existsSync(clusterMapPath)) {
  processFile(clusterMapPath);
}
