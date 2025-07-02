/**
 * This script replaces environment variable values with placeholders
 * in the built JS files to enable runtime environment variable injection.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current file's directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the actual values and their placeholders
const CONFIG_PLACEHOLDERS = {
    // The actual environment variable values used during build
    [process.env.NEXT_PUBLIC_URL || ""]: "PLACEHOLDER_URL",
    [process.env.NEXT_PUBLIC_BACKEND_URL || ""]: "PLACEHOLDER_BACKEND_URL",
    [process.env.NEXT_PUBLIC_GRAPHQL_URL || ""]: "PLACEHOLDER_GRAPHQL_URL",
    [process.env.NEXT_PUBLIC_AUTH0_DOMAIN || ""]: "PLACEHOLDER_AUTH0_DOMAIN",
    [process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || ""]:
        "PLACEHOLDER_AUTH0_CLIENT_ID",
    [process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI || ""]:
        "PLACEHOLDER_AUTH0_REDIRECT_URI",
    [process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || ""]:
        "PLACEHOLDER_AUTH0_AUDIENCE",
    [process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ""]:
        "PLACEHOLDER_GA_MEASUREMENT_ID",
};

// Filter out empty keys (where environment variables weren't set)
const filteredPlaceholders = Object.entries(CONFIG_PLACEHOLDERS)
    .filter(([key]) => key && key.length > 0)
    .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
    }, {});

console.log("Values that will be replaced:", Object.keys(filteredPlaceholders));

function replaceInFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, "utf8");
        let modified = false;

        for (const [actualValue, placeholder] of Object.entries(
            filteredPlaceholders,
        )) {
            if (actualValue && content.includes(actualValue)) {
                // Use a safe string replacement to avoid regex issues
                content = content.split(actualValue).join(placeholder);
                modified = true;
                console.log(
                    `Replaced ${actualValue} with ${placeholder} in ${filePath}`,
                );
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, content);
            console.log(`Updated: ${filePath}`);
        }
    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
    }
}

function processDirectory(directoryPath) {
    try {
        const files = fs.readdirSync(directoryPath);

        for (const file of files) {
            const filePath = path.join(directoryPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory() && !filePath.includes("node_modules")) {
                processDirectory(filePath);
            } else if (stats.isFile() && filePath.endsWith(".js")) {
                replaceInFile(filePath);
            }
        }
    } catch (error) {
        console.error(`Error processing directory ${directoryPath}:`, error);
    }
}

// Start processing from the build directory
const buildDir = path.resolve(__dirname, ".next");
console.log(
    `Processing files in ${buildDir} to replace environment variables with placeholders...`,
);
processDirectory(buildDir);

// Also process standalone output directory if it exists
const standaloneDir = path.resolve(__dirname, ".next/standalone");
if (fs.existsSync(standaloneDir)) {
    console.log(`Processing files in ${standaloneDir}...`);
    processDirectory(standaloneDir);
}

console.log("Finished processing files.");
