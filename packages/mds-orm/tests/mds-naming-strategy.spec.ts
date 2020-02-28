import test from 'unit.js'
import { MdsNamingStrategy } from '../naming-strategies'

const strategy = new MdsNamingStrategy()

describe('Test Naming Strategy', () => {
  it('Primary Key Naming Strategy', done => {
    test.value(strategy.primaryKeyName('table', ['column'])).is('table_pkey')
    done()
  })

  it('Index Naming Strategy', done => {
    test.value(strategy.indexName('table', ['column'])).is('idx_column_table')
    done()
  })
})
