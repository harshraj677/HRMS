const { execSync } = require('child_process');
console.log("Pushing to github...");
try {
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "Fix typescript build errors"', { stdio: 'inherit' });
  execSync('git push', { stdio: 'inherit' });
  console.log("Push successful");
} catch(e) {
  console.log("Error:", e.message);
}