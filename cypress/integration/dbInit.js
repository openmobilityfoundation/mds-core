// fixme: move creds to fixtures
describe('dbInit', function() {
  it('successfully initializes', function() {
    cy.request({
      url: 'http://mds-agency:4001/agency/test/initialize',
      auth: {
        bearer: ".eyJzY29wZSI6ICJhZG1pbjphbGwgdGVzdDphbGwifQo=",
      },
    })
    .then((resp) => {
      expect(resp.status).to.eq(200)
    })
  })
})
