const branch = process.env.VERCEL_GIT_COMMIT_REF

if (branch === "main") {
  console.log("Vercel build allowed: production source branch is main.")
  process.exit(1)
}

console.log(
  `Vercel build skipped: ${branch || "unknown branch"} is not the production source branch.`,
)
process.exit(0)
