import fs from 'node:fs';
import path from 'node:path';

import esbuild from 'esbuild';

const root = path.resolve('spartina_source');

// Build React + Recharts comparison chart bundle
if (fs.existsSync(path.join(root, 'src/chart_component.tsx'))) {
  esbuild.buildSync({
    entryPoints: [path.join(root, 'src/chart_component.tsx')],
    outfile: path.join(root, 'src/chart_bundle.js'),
    bundle: true,
    minify: true,
    format: 'iife',
    define: { 'process.env.NODE_ENV': '"production"' }
  });
}

let template = fs.readFileSync(path.join(root, 'src/index.template.html'), 'utf8');
const font = fs.readFileSync(path.join(root, 'data/vaz.woff2')).toString('base64');
const foods = fs.readFileSync(path.join(root, 'data/foods.json'), 'utf8').trim().replace(/^\uFEFF/, '');
const reportCss = fs.readFileSync(path.join(root, 'src/report.css'), 'utf8');
const jsFiles = ['meta.js', 'supplements_data.js', 'content.js', 'engine.js', 'report.js', 'docx.js', 'tibb.js', 'chart_bundle.js', 'compare.js', 'app.js'];
const js = jsFiles.map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');

template = template.replace('<title>برنامه‌ی تغذیه‌ی اسپارتینا</title>',
  '<title>برنامه تغذیه اسپارتینا و بدنسازی — دکتر حسن صادقی</title>\n' +
  '<meta name="description" content="سامانه تخصصی برنامه‌ریزی تغذیه، درمان چاقی با اسپارتینا (تیرزپاتاید)، بدنسازی و طب ایرانی دکتر حسن صادقی" />\n' +
  '<meta property="og:title" content="برنامه تغذیه اسپارتینا و بدنسازی — دکتر حسن صادقی" />\n' +
  '<meta property="og:description" content="سامانه تخصصی برنامه‌ریزی تغذیه، درمان چاقی با اسپارتینا (تیرزپاتاید)، بدنسازی و طب ایرانی دکتر حسن صادقی" />\n' +
  '<meta property="og:type" content="website" />\n' +
  '<meta name="twitter:card" content="summary_large_image" />'
);

const html = template
  .replace('/*@@FONT@@*/', () => font)
  .replace('/*@@REPORTCSS@@*/', () => reportCss)
  .replace('/*@@FOODS@@*/', () => foods)
  .replace('/*@@JS@@*/', () => js);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully built index.html (' + Math.round(html.length / 1024) + ' KB)');
