// ESLint violations for fixture generation

var unused = 1 // no-unused-vars, prefer-const

function noReturn(x) {
  if (x > 0) {
    return x
  }
  // Missing return for else branch - consistent-return
}

const obj = {
  duplicateKey: 1,
  duplicateKey: 2 // no-dupe-keys
}

function dangerousCode() {
  eval('console.log("dangerous")') // no-eval
}

const arr = [1, 2, 3,] // comma-dangle (depends on config)

export { noReturn, obj, dangerousCode, arr }
