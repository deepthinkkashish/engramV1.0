const fs = require("fs");
const path = require("path");
// Ensure target directory exists
const destDir = path.join("public");
if (!fs.existsSync(destDir)){ fs.mkdirSync(destDir, { recursive: true }); }

// Copy Worker
const src = path.join("node_modules","pdfjs-dist","build","pdf.worker.min.js");
const dst = path.join("public","pdf.worker.min.js");

if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log("PDF Worker copied successfully.");
} else {
    console.log("Waiting for npm install to finish...");
}
