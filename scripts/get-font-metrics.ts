import fs from 'node:fs';
import { readMetrics, generateFontFace } from 'fontaine';

async function run() {
    const outfitBuf = fs.readFileSync('/app/public/fonts/Outfit-Black.ttf');
    const outfit = await readMetrics(outfitBuf);
    console.log('Outfit:', outfit);

    const interBuf = fs.readFileSync('/app/public/fonts/Inter-VariableFont_opsz,wght.ttf');
    const inter = await readMetrics(interBuf);
    console.log('Inter:', inter);
}

run().catch(console.error);
