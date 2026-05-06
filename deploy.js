#!/usr/bin/env node

const { exec } = require("child_process");
const path = require("path");

const projectDir = __dirname;

console.log("🚀 Starting Firebase Deployment Process...\n");

function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`📋 ${description}...`);
    const child = exec(command, { cwd: projectDir }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ ${description} failed:`);
        console.error(stderr || error.message);
        reject(error);
      } else {
        console.log(`✅ ${description} completed`);
        if (stdout) console.log(stdout);
        resolve(stdout);
      }
    });
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  });
}

async function deploy() {
  try {
    // Step 1: Build the Next.js app
    await runCommand("npm run build", "Building Next.js application");

    // Step 2: Deploy to Firebase
    await runCommand("firebase deploy --only hosting", "Deploying to Firebase Hosting");

    console.log("\n🎉 Deployment completed successfully!");
    console.log(
      "📍 Check your Firebase Console to see the deployed site."
    );
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

deploy();
