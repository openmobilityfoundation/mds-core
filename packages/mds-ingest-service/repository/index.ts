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

import { InsertReturning, ReadWriteRepository, RepositoryError } from '@mds-core/mds-repository'
import { UUID } from '@mds-core/mds-types'
import { isUUID, ValidationError } from '@mds-core/mds-utils'
import { Any } from 'typeorm'
import { buildPaginator, Cursor } from 'typeorm-cursor-pagination'
import {
  DeviceDomainCreateModel,
  DeviceDomainModel,
  EventAnnotationDomainCreateModel,
  EventAnnotationDomainModel,
  EventDomainCreateModel,
  GetVehicleEventsFilterParams,
  GetVehicleEventsResponse,
  TelemetryDomainCreateModel
} from '../@types'
import entities from './entities'
import { DeviceEntity } from './entities/device-entity'
import { EventAnnotationEntity } from './entities/event-annotation-entity'
import { EventEntity } from './entities/event-entity'
import { TelemetryEntity } from './entities/telemetry-entity'
import {
  DeviceDomainToEntityCreate,
  DeviceEntityToDomain,
  EventAnnotationDomainToEntityCreate,
  EventAnnotationEntityToDomain,
  EventDomainToEntityCreate,
  EventEntityToDomain,
  TelemetryDomainToEntityCreate,
  TelemetryEntityToDomain
} from './mappers'
import migrations from './migrations'

type VehicleEventsQueryParams = GetVehicleEventsFilterParams & Cursor

/**
 * Aborts execution if not running under a test environment.
 */
const testEnvSafeguard = () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(`This method is only supported when executing tests`)
  }
}
class IngestReadWriteRepository extends ReadWriteRepository {
  constructor() {
    super('ingest', { entities, migrations })
  }

  private buildCursor = (cursor: VehicleEventsQueryParams) =>
    Buffer.from(JSON.stringify(cursor), 'utf-8').toString('base64')

  private parseCursor = (cursor: string): VehicleEventsQueryParams & { limit: number } => {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'))
    } catch (error) {
      throw new ValidationError('Invalid cursor', error)
    }
  }

  public createEvents = async (events: EventDomainCreateModel[]) => {
    const { connect } = this
    try {
      const connection = await connect('rw')
      const { raw: entities }: InsertReturning<EventEntity> = await connection
        .getRepository(EventEntity)
        .createQueryBuilder()
        .insert()
        .values(events.map(EventDomainToEntityCreate.mapper()))
        .returning('*')
        .execute()
      return entities.map(EventEntityToDomain.map)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public createTelemetries = async (events: TelemetryDomainCreateModel[]) => {
    const { connect } = this
    try {
      const connection = await connect('rw')
      const { raw: entities }: InsertReturning<TelemetryEntity> = await connection
        .getRepository(TelemetryEntity)
        .createQueryBuilder()
        .insert()
        .values(events.map(TelemetryDomainToEntityCreate.mapper()))
        .returning('*')
        .execute()
      return entities.map(TelemetryEntityToDomain.map)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public createDevices = async (events: DeviceDomainCreateModel[]) => {
    const { connect } = this
    try {
      const connection = await connect('rw')
      const { raw: entities }: InsertReturning<DeviceEntity> = await connection
        .getRepository(DeviceEntity)
        .createQueryBuilder()
        .insert()
        .values(events.map(DeviceDomainToEntityCreate.mapper()))
        .returning('*')
        .execute()
      return entities.map(DeviceEntityToDomain.map)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public createEventAnnotations = async (
    eventAnnotations: EventAnnotationDomainCreateModel[]
  ): Promise<EventAnnotationDomainModel[]> => {
    const { connect } = this
    try {
      const connection = await connect('rw')
      const { raw: entities }: InsertReturning<EventAnnotationEntity> = await connection
        .getRepository(EventAnnotationEntity)
        .createQueryBuilder()
        .insert()
        .values(eventAnnotations.map(EventAnnotationDomainToEntityCreate.mapper()))
        .returning('*')
        .execute()
      return entities.map(EventAnnotationEntityToDomain.map)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public getDevices = async (ids: UUID[]): Promise<DeviceDomainModel[]> => {
    try {
      const connection = await this.connect('ro')
      const entities = await connection.getRepository(DeviceEntity).find({ where: { device_id: Any(ids) } })
      return entities.map(DeviceEntityToDomain.map)
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  private getEvents = async (params: VehicleEventsQueryParams): Promise<GetVehicleEventsResponse> => {
    const { connect } = this
    const {
      time_range,
      // geography_ids,
      grouping_type = 'latest_per_vehicle',
      event_types,
      vehicle_states,
      vehicle_types,
      vehicle_id,
      device_ids,
      propulsion_types,
      provider_ids,
      limit,
      beforeCursor,
      afterCursor,
      order
    } = params

    const { start, end } = time_range

    try {
      const connection = await connect('ro')

      const query = connection
        .getRepository(EventEntity)
        .createQueryBuilder('events')
        .innerJoin(qb => qb.from(DeviceEntity, 'd'), 'devices', 'devices.device_id = events.device_id')
        .leftJoinAndMapOne(
          'events.telemetry',
          TelemetryEntity,
          'telemetry',
          'telemetry.device_id = events.device_id AND telemetry.timestamp = events.telemetry_timestamp'
        )

      if (grouping_type === 'latest_per_vehicle') {
        query.innerJoin(
          qb => {
            return qb
              .select(
                'device_id, id as event_id, RANK() OVER (PARTITION BY device_id ORDER BY timestamp DESC) AS rownum'
              )
              .from(EventEntity, 'e')
              .where('timestamp >= :start AND timestamp <= :end', { start, end })
          },
          'last_device_event',
          'last_device_event.event_id = events.id AND last_device_event.rownum = 1'
        )
      }

      if (grouping_type === 'latest_per_trip') {
        query.innerJoin(
          qb => {
            return qb
              .select('trip_id, id as event_id, RANK() OVER (PARTITION BY trip_id ORDER BY timestamp DESC) AS rownum')
              .from(EventEntity, 'e')
              .where('timestamp >= :start AND timestamp <= :end', { start, end })
          },
          'last_trip_event',
          'last_trip_event.event_id = events.id AND last_trip_event.rownum = 1'
        )
      }

      if (grouping_type === 'all_events') {
        query.andWhere('events.timestamp >= :start AND events.timestamp <= :end', { start, end })
      }

      if (event_types) {
        query.andWhere('events.event_types && :event_types', { event_types })
      }

      if (propulsion_types) {
        query.andWhere('devices.propulsion_types && :propulsion_types', { propulsion_types })
      }

      if (device_ids) {
        query.andWhere('events.device_id = ANY(:device_ids)', { device_ids })
      }

      if (vehicle_types) {
        query.andWhere('devices.vehicle_type = ANY(:vehicle_types)', { vehicle_types })
      }

      if (vehicle_states) {
        query.andWhere('events.vehicle_state = ANY(:vehicle_states)', { vehicle_states })
      }

      if (vehicle_id) {
        query.andWhere('devices.vehicle_id = :vehicle_id', { vehicle_id })
      }

      if (provider_ids && provider_ids.every(isUUID)) {
        query.andWhere('events.provider_id = ANY(:provider_ids)', { provider_ids })
      }

      const pager = buildPaginator({
        entity: EventEntity,
        alias: 'events',
        paginationKeys: [order?.column ?? 'timestamp', 'id'],
        query: {
          limit,
          order: order?.direction ?? (order?.column === undefined ? 'DESC' : 'ASC'),
          beforeCursor: beforeCursor ?? undefined, // typeorm-cursor-pagination type weirdness
          afterCursor: afterCursor ?? undefined // typeorm-cursor-pagination type weirdness
        }
      })

      const {
        data,
        cursor: { beforeCursor: nextBeforeCursor, afterCursor: nextAfterCursor }
      } = await pager.paginate(query)

      const cursor = {
        time_range,
        // geography_ids,
        grouping_type,
        event_types,
        vehicle_states,
        vehicle_types,
        vehicle_id,
        device_ids,
        propulsion_types,
        provider_ids,
        limit,
        order
      }

      return {
        events: data.map(EventEntityToDomain.map),
        cursor: {
          next: nextAfterCursor && this.buildCursor({ ...cursor, beforeCursor: null, afterCursor: nextAfterCursor }),
          prev: nextBeforeCursor && this.buildCursor({ ...cursor, beforeCursor: nextBeforeCursor, afterCursor: null })
        }
      }
    } catch (error) {
      throw RepositoryError(error)
    }
  }

  public getEventsUsingOptions = async (options: GetVehicleEventsFilterParams): Promise<GetVehicleEventsResponse> =>
    this.getEvents({ ...options, beforeCursor: null, afterCursor: null, limit: options.limit ?? 100 })

  public getEventsUsingCursor = async (cursor: string): Promise<GetVehicleEventsResponse> =>
    this.getEvents(this.parseCursor(cursor))

  /**
   * Nukes everything from orbit. Boom.
   */

  public deleteAll = async () => {
    testEnvSafeguard()
    try {
      const connection = await this.connect('rw')
      await connection.getRepository(EventEntity).query('TRUNCATE events, devices, telemetry RESTART IDENTITY')
    } catch (error) {
      throw RepositoryError(error)
    }
  }
}

export const IngestRepository = new IngestReadWriteRepository()
