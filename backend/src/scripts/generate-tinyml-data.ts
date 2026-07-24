import fs from 'fs';
import path from 'path';

interface SensorSample {
  timestamp: number;
  voltage: number;
  current_amps: number;
  frequency: number;
  power_factor: number;
  label: 'normal' | 'surge' | 'brownout' | 'arc_fault';
}

function generateDataset() {
  const outputDir = path.resolve(process.cwd(), 'tinyml_data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const sampleRateHz = 50; // 50 samples per sec
  const durationSec = 10;
  const totalSamples = sampleRateHz * durationSec;

  const categories: Array<'normal' | 'surge' | 'brownout' | 'arc_fault'> = ['normal', 'surge', 'brownout', 'arc_fault'];

  categories.forEach((label) => {
    for (let fileIdx = 1; fileIdx <= 15; fileIdx++) {
      const rows: string[] = ['timestamp,voltage,current_amps,frequency,power_factor'];
      let baseVoltage = 220;
      let baseCurrent = 3.5;
      let baseFreq = 50.0;
      let basePF = 0.97;

      for (let i = 0; i < totalSamples; i++) {
        const timestamp = i * (1000 / sampleRateHz); // ms
        let v = baseVoltage + (Math.random() * 2 - 1);
        let c = baseCurrent + (Math.random() * 0.4 - 0.2);
        let f = baseFreq + (Math.random() * 0.2 - 0.1);
        let pf = basePF + (Math.random() * 0.02 - 0.01);

        if (label === 'surge' && i > 150 && i < 350) {
          v = 310 + Math.random() * 25;
          c = 18.5 + Math.random() * 4;
        } else if (label === 'brownout' && i > 150 && i < 350) {
          v = 140 - Math.random() * 20;
          c = 1.2 - Math.random() * 0.5;
        } else if (label === 'arc_fault' && i > 100 && i < 400) {
          v += (Math.random() * 40 - 20);
          c += (Math.random() * 8 - 4);
          f += (Math.random() * 3 - 1.5);
          pf = 0.70 + Math.random() * 0.15;
        }

        rows.push(`${timestamp.toFixed(0)},${v.toFixed(2)},${c.toFixed(2)},${f.toFixed(2)},${pf.toFixed(2)}`);
      }

      const fileName = `${label}.${label}_sample_${fileIdx}.csv`;
      fs.writeFileSync(path.join(outputDir, fileName), rows.join('\n'));
    }
  });

  console.log(`✅ Successfully generated 60 Edge Impulse CSV samples in ${outputDir}`);
}

generateDataset();
