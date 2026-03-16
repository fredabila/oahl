import fs from 'node:fs';
import path from 'node:path';

const registryListFile = 'registry/adapters.txt';
const outputFile = 'registry/registry.json';

async function fetchNpmData(packageName) {
  try {
    const res = await fetch(`https://registry.npmjs.org/${packageName}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

async function fetchManifest(packageName, version) {
  try {
    // Attempt to fetch oahl-manifest.json from unpkg
    const res = await fetch(`https://unpkg.com/${packageName}@${version}/oahl-manifest.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

async function buildRegistry() {
  const adapters = [];
  const packageNames = fs.readFileSync(registryListFile, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  for (const pkgName of packageNames) {
    console.log(`Processing ${pkgName}...`);
    const npmData = await fetchNpmData(pkgName);
    
    if (!npmData) {
      console.log(`  Failed to fetch NPM data for ${pkgName}. Skipping.`);
      continue;
    }

    const latestVersion = npmData['dist-tags']?.latest;
    if (!latestVersion) continue;

    const versionData = npmData.versions[latestVersion];
    
    // First try remote manifest, fallback to local file if developing
    let manifest = await fetchManifest(pkgName, latestVersion);
    
    if (!manifest) {
      // Local fallback for workspace packages before publishing
      const localPath = path.join(process.cwd(), 'adapters', pkgName.replace('@oahl/', ''), 'oahl-manifest.json');
      if (fs.existsSync(localPath)) {
        console.log(`  Using local manifest fallback for ${pkgName}`);
        manifest = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      }
    }

    if (!manifest) {
      console.log(`  No oahl-manifest.json found for ${pkgName}. Skipping.`);
      continue;
    }

    // Merge NPM data with Manifest data
    const repository = versionData.repository?.url?.replace(/^git\+/, '').replace(/\.git$/, '') 
                       || `https://www.npmjs.com/package/${pkgName}`;

    let authorName = "community";
    if (typeof versionData.author === 'string') authorName = versionData.author;
    else if (versionData.author?.name) authorName = versionData.author.name;
    else if (versionData.maintainers?.[0]?.name) authorName = versionData.maintainers[0].name;

    adapters.push({
      id: pkgName.replace('@', '').replace('/', '-'),
      name: manifest.name || pkgName,
      description: manifest.description || versionData.description || '',
      author: authorName,
      repository: repository,
      npm_package: pkgName,
      version: latestVersion,
      hardware_tags: manifest.hardware_tags || [],
      capabilities: manifest.capabilities || [],
      license: versionData.license || 'Unknown',
      featured: manifest.featured || false,
      readme_url: `https://unpkg.com/${pkgName}@${latestVersion}/README.md`
    });
  }

  fs.writeFileSync(outputFile, JSON.stringify(adapters, null, 2), 'utf8');
  console.log(`Generated ${outputFile} with ${adapters.length} adapters.`);
}

buildRegistry();
