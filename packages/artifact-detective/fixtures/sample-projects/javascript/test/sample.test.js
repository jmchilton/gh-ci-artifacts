describe('Sample tests', () => {
  it('passes basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('passes string match', () => {
    expect('hello').toMatch(/ello/)
  })

  it('passes array check', () => {
    expect([1, 2, 3]).toHaveLength(3)
  })

  it('passes object check', () => {
    expect({ name: 'test' }).toHaveProperty('name')
  })

  it('passes async check', async () => {
    const result = await Promise.resolve(42)
    expect(result).toBe(42)
  })

  it('fails deliberately', () => {
    expect(1 + 1).toBe(3) // Deliberate failure
  })

  it('fails with async error', async () => {
    await Promise.resolve()
    throw new Error('Async test failed')
  })

  it.skip('skipped test', () => {
    expect(true).toBe(false)
  })
})
