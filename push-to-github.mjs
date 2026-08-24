/**
 * Pushes the project files to GitHub using the REST API (no git binary needed).
 * Uses isomorphic-git under the hood.
 */
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';

const TOKEN = process.env.GH_TOKEN;
const OWNER = 'theprincelive2';
const REPO = 'Mechanic';
const dir = process.env.PROJECT_DIR;

if (!TOKEN || !dir) {
  console.error('Missing GH_TOKEN or PROJECT_DIR env vars');
  process.exit(1);
}

const url = `https://github.com/${OWNER}/${REPO}.git`;

async function main() {
  console.log('Initializing git repo at:', dir);
  await git.init({ fs, dir, defaultBranch: 'main' });

  console.log('Setting author config...');
  await git.setConfig({ fs, dir, path: 'user.name', value: 'theprincelive2' });
  await git.setConfig({ fs, dir, path: 'user.email', value: 'noreply@github.com' });

  console.log('Staging all files...');
  await git.add({ fs, dir, filepath: '.' });

  console.log('Creating commit...');
  const sha = await git.commit({
    fs,
    dir,
    message: 'Initial commit: East Legon Auto Care garage management system',
    author: { name: 'theprincelive2', email: 'noreply@github.com' },
  });
  console.log('Commit SHA:', sha);

  console.log('Pushing to GitHub...');
  const result = await git.push({
    fs,
    http,
    dir,
    url,
    remote: 'origin',
    remoteRef: 'main',
    force: true,
    onAuth: () => ({ username: 'theprincelive2', password: TOKEN }),
    onProgress: (p) => {
      if (p.phase) process.stdout.write(`\r  ${p.phase}: ${p.loaded || 0}/${p.total || '?'}   `);
    },
    onMessage: (msg) => console.log(msg),
  });
  console.log('\n✅ Push complete!');
  console.log('Repo:', `https://github.com/${OWNER}/${REPO}`);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  if (err.data) console.error('Details:', JSON.stringify(err.data, null, 2));
  process.exit(1);
});
