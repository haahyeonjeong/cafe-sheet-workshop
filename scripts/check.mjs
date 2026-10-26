import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { menu } from '../public/catalog.js';
let count = 0;
for (const folder of ['api', 'lib', 'public', 'scripts', 'tests']) {
  for (const name of await readdir(new URL(`../${folder}/`, import.meta.url))) {
    if (!/\.(js|mjs)$/.test(name)) continue;
    const result = spawnSync(process.execPath, ['--check', `${folder}/${name}`], { encoding: 'utf8' });
    if (result.status !== 0) { process.stderr.write(result.stderr); process.exit(1); }
    count++;
  }
}
for (const name of ['package.json', 'vercel.json']) JSON.parse(await readFile(new URL(`../${name}`, import.meta.url), 'utf8'));
for (const item of menu) {
  if (!item.image?.startsWith('/images/') || !item.imageAlt) throw new Error(`${item.id} 사진 정보가 없습니다.`);
  const photo = await readFile(new URL(`../public${item.image}`, import.meta.url));
  if (photo.length < 1000 || photo[0] !== 0xff || photo[1] !== 0xd8) throw new Error(`${item.id} JPEG 파일을 확인해 주세요.`);
}
console.log(`JavaScript ${count}개 문법·JSON 설정·메뉴 사진 ${menu.length}개를 확인했습니다.`);
