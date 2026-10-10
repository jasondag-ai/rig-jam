// WHERE THE TEST SUITES SAVE THEIR SCREENSHOTS AND CLIPS (Jay, Oct 10): a folder IN THE REPO that git ignores,
// `qc-out/<name>/`, never the Desktop. `OUT=<folder>` sends a run somewhere else. Only what Jay is asked to look at
// is copied to `~/Desktop/RHR Art Inbox/qc/`, by hand, and named in the job's summary.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const QC_OUT = join(dirname(dirname(fileURLToPath(import.meta.url))), 'qc-out');
/** The folder a suite saves into (made if it is not there): `OUT`, or `qc-out/<name>` in the repo. */
export function outDir(name) {
  const dir = process.env.OUT ?? join(QC_OUT, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}
