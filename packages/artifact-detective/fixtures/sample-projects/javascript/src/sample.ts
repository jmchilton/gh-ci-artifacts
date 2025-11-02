// TypeScript type errors for fixture generation

function badTypes(x): string { // Missing parameter type annotation
  return x + 1 // Type error: returning number, expected string
}

const obj: { name: string } = {
  name: 'test',
  extra: 'property' // Type error: excess property
}

let val: string = 42 // Type error: number assigned to string

interface User {
  id: number
  name: string
}

function processUser(user: User) {
  return user.email // Type error: Property 'email' does not exist
}

export { badTypes, obj, val, processUser }
