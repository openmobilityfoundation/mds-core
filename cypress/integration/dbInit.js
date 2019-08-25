describe('dbInit', function() {
  it('successfully initializes', function() {
    cy.request('http://mds-agency:4001/agency/test/initialize')
  })
})
