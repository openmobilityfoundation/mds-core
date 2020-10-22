/*
    Copyright 2019-2020 City of Los Angeles.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

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

  it('Unique Constraint Naming Strategy', done => {
    test.value(strategy.uniqueConstraintName('table', ['column'])).is('uc_column_table')
    done()
  })

  it('Foreign Key Naming Strategy', done => {
    test
      .value(strategy.foreignKeyName('table', ['column'], 'referencedtable', ['referencedcolumn']))
      .is('fk_referencedtable_referencedcolumn')
    done()
  })
})
