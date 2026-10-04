// Argument parsing and probe selection for the eval runner.
// Live spend is opt-in: dry is the default, `--run` is required.

export function parseArgs(argv = []) {
  const opts = {
    dry: true,
    run: false,
    model: undefined,
    filter: undefined,
    maxProbes: 10,
    outDir: 'eval/results',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--run') { opts.run = true; opts.dry = false; }
    else if (a === '--dry') { opts.dry = true; opts.run = false; }
    else if (a === '--model') opts.model = argv[++i];
    else if (a === '--filter') opts.filter = argv[++i];
    else if (a === '--max-probes') {
      const n = Number(argv[++i]);
      if (Number.isInteger(n) && n >= 0) opts.maxProbes = n;
    } else if (a === '--out') opts.outDir = argv[++i];
  }
  return opts;
}

export function selectProbes(probes, { filter, maxProbes } = {}) {
  let list = probes;
  if (filter) list = list.filter((p) => p.id.includes(filter) || p.group === filter);
  const cap = Number.isInteger(maxProbes) && maxProbes >= 0 ? maxProbes : list.length;
  return list.slice(0, cap);
}
