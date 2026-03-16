import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const rootPackagePath = path.join(rootDir, 'package.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function parseArgs(argv) {
  const args = {
    release: 'patch',
    dryRun: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--release' && argv[index + 1]) {
      args.release = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--dry-run') {
      args.dryRun = true;
    }
  }

  return args;
}

function isValidSemver(version) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?$/.test(version);
}

function bumpVersion(version, release) {
  if (!isValidSemver(version)) {
    throw new Error(`Unsupported version format: ${version}`);
  }

  const [baseVersion, prereleasePart] = version.split('-');
  const [majorRaw, minorRaw, patchRaw] = baseVersion.split('.');
  let major = Number.parseInt(majorRaw, 10);
  let minor = Number.parseInt(minorRaw, 10);
  let patch = Number.parseInt(patchRaw, 10);

  if (release === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
    return `${major}.${minor}.${patch}`;
  }

  if (release === 'minor') {
    minor += 1;
    patch = 0;
    return `${major}.${minor}.${patch}`;
  }

  if (release === 'patch') {
    patch += 1;
    return `${major}.${minor}.${patch}`;
  }

  if (release === 'prerelease') {
    if (!prereleasePart) {
      patch += 1;
      return `${major}.${minor}.${patch}-rc.0`;
    }

    const prereleaseMatch = prereleasePart.match(/^(.*?)(?:\.(\d+))?$/);
    if (!prereleaseMatch) {
      return `${major}.${minor}.${patch}-rc.0`;
    }

    const prereleaseLabel = prereleaseMatch[1] || 'rc';
    const prereleaseNumber = Number.parseInt(prereleaseMatch[2] || '0', 10) + 1;
    return `${major}.${minor}.${patch}-${prereleaseLabel}.${prereleaseNumber}`;
  }

  throw new Error(`Unsupported release type: ${release}`);
}

function resolveWorkspaceDirs(rootPackage) {
  const patterns = Array.isArray(rootPackage.workspaces) ? rootPackage.workspaces : [];
  const workspaceDirs = [];

  for (const pattern of patterns) {
    const normalized = pattern.replace(/\\/g, '/');
    if (!normalized.endsWith('/*')) {
      continue;
    }

    const parentDir = normalized.slice(0, -2);
    const absoluteParentDir = path.join(rootDir, parentDir);

    if (!fs.existsSync(absoluteParentDir)) {
      continue;
    }

    const children = fs.readdirSync(absoluteParentDir, { withFileTypes: true });
    for (const child of children) {
      if (!child.isDirectory()) continue;
      const packageDir = path.join(absoluteParentDir, child.name);
      const packageJsonPath = path.join(packageDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        workspaceDirs.push(packageDir);
      }
    }
  }

  // Add support for pyproject.toml
  const pyprojectPath = path.join(rootDir, 'sdk-python', 'pyproject.toml');
  if (fs.existsSync(pyprojectPath)) {
    workspaceDirs.push(path.join(rootDir, 'sdk-python'));
  }

  return workspaceDirs;
}

function readPyproject(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writePyproject(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function main() {
  const { release, dryRun } = parseArgs(process.argv.slice(2));

  if (!['patch', 'minor', 'major', 'prerelease'].includes(release)) {
    throw new Error(`Invalid --release value: ${release}`);
  }

  const rootPackage = readJson(rootPackagePath);
  const workspaceDirs = resolveWorkspaceDirs(rootPackage);

  const updates = [];

  for (const workspaceDir of workspaceDirs) {
    const packageJsonPath = path.join(workspaceDir, 'package.json');
    const pyprojectPath = path.join(workspaceDir, 'pyproject.toml');

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = readJson(packageJsonPath);
      if (packageJson.private || !packageJson.version || !packageJson.name) {
        continue;
      }

      const nextVersion = bumpVersion(packageJson.version, release);
      updates.push({
        path: packageJsonPath,
        name: packageJson.name,
        from: packageJson.version,
        to: nextVersion,
        type: 'json'
      });

      if (!dryRun) {
        packageJson.version = nextVersion;
        writeJson(packageJsonPath, packageJson);
      }
    } else if (fs.existsSync(pyprojectPath)) {
      let content = readPyproject(pyprojectPath);
      const versionMatch = content.match(/^version\s*=\s*"(.*?)"/m);
      if (!versionMatch) continue;

      const currentVersion = versionMatch[1];
      const nextVersion = bumpVersion(currentVersion, release);
      updates.push({
        path: pyprojectPath,
        name: 'oahl (python)',
        from: currentVersion,
        to: nextVersion,
        type: 'toml'
      });

      if (!dryRun) {
        content = content.replace(/^version\s*=\s*"(.*?)"/m, `version = "${nextVersion}"`);
        writePyproject(pyprojectPath, content);
      }
    }
  }

  if (updates.length === 0) {
    console.log('No public workspace packages found to bump.');
    return;
  }

  console.log(dryRun ? 'Version bump preview:' : 'Bumped versions:');
  for (const update of updates) {
    console.log(`- ${update.name}: ${update.from} -> ${update.to}`);
  }
}

main();
