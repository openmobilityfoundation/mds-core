/**
 * Copyright 2020 City of Los Angeles
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CreateDevicesTable1603212409274 } from './1603212409274-CreateDevicesTable'
import { CreateEventsTable1603212540962 } from './1603212540962-CreateEventsTable'
import { CreateTelemetryTable1603212619514 } from './1603212619514-CreateTelemetryTable'
import { AddAccessibilityOptionsColumn1616681612878 } from './1616681612878-AddAccessibilityOptionsColumn'
import { AddModalityColumn1616682680014 } from './1616682680014-AddModalityColumn'
import { AddTripStateColumn1616686180925 } from './1616686180925-AddTripStateColumn'
import { AddTelemetryStopIdHdopSatellitesColumns1624574421590 } from './1624574421590-AddTelemetryStopIdHdopSatellitesColumns'
import { AddEventAnnotationEntity1624574823000 } from './1624574823000-AddEventAnnotationEntity'
import { CreateMigrationColumns1625241719659 } from './1625241719659-CreateMigrationColumns'
import { AddEventsTripIdTimestampIndex1625676583247 } from './1625676583247-AddEventsTripIdTimestampIndex'
import { AddEventsTimestampIdIndex1627315083728 } from './1627315083728-AddEventsTimestampIdIndex'
import { AddEventsProviderIdIdIndex1627315276644 } from './1627315276644-AddEventsProviderIdIdIndex'
import { AddEventsVehicleStateIdIndex1627315357677 } from './1627315357677-AddEventsVehicleStateIdIndex'

export default [
  CreateDevicesTable1603212409274,
  CreateEventsTable1603212540962,
  CreateTelemetryTable1603212619514,
  AddAccessibilityOptionsColumn1616681612878,
  AddModalityColumn1616682680014,
  AddTripStateColumn1616686180925,
  AddTelemetryStopIdHdopSatellitesColumns1624574421590,
  AddEventAnnotationEntity1624574823000,
  CreateMigrationColumns1625241719659,
  AddEventsTripIdTimestampIndex1625676583247,
  AddEventsTimestampIdIndex1627315083728,
  AddEventsProviderIdIdIndex1627315276644,
  AddEventsVehicleStateIdIndex1627315357677
]
