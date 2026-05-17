const { execSync } = require('child_process');

try {
  console.log("Running next build...");
  const stdout = execSync('npx next build', { stdio: 'pipe', encoding: 'utf-8' });
  console.log("BUILD SUCCESS:");
  console.log(stdout);
} catch (error) {
  console.log("BUILD FAILED:");
  console.log(error.stdout);
  console.log(error.stderr);
}
