describe('cors-delete', function() {
  it('successfully initializes', function() {
    cy.request({
      url: 'http://localhost/policy-author/policies/0079b462-a622-4d92-8af0-49b63a70f062',
      method: 'OPTIONS',
      headers: {
        'Sec-Fetch-Mode': 'no-cors',
        'Access-Control-Request': 'DELETE',
        'Origin': 'https://dev.lacuna.city',
        'Referer': 'https://dev.lacuna.city/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
        'Access-Control-Request-Headers': 'authorization,content-type'
      }
    })
    .then((resp) => {
      // todo: write verification
    })
  })
})
