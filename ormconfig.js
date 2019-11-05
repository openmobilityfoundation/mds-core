const { PG_HOST: host, PG_PORT: port, PG_USER: username, PG_PASS: password, PG_NAME: database } = process.env

module.exports = { type: 'postgres', host, port, username, password, database }
