const expectedMajor = 24
const actual = process.versions.node
const actualMajor = Number(actual.split(".")[0])

if (actualMajor !== expectedMajor) {
  console.error(
    `Anchor requires Node ${expectedMajor}.x for local checks and Electron builds. Current Node: ${actual}.`
  )
  console.error("Switch with your version manager, for example: fnm use")
  process.exit(1)
}

console.log(`Node ${actual} OK`)
