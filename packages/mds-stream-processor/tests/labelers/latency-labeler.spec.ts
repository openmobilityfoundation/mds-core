import { LatencyLabeler } from '@mds-core/mds-stream-processor/labelers/latency-labeler'
import assert from 'assert'

describe('LatencyLabeler Tests', async () => {
  it('Tests LatencyLabeler detects latency > 0', async () => {
    const mockTimeChunks = Array.from({ length: 100 }, (_, index) => ({
      timestamp: 1000 * index,
      recorded: 1000 * (index + 1)
    }))
    const latencyLabels = await Promise.all(mockTimeChunks.map(chunk => LatencyLabeler()(chunk)))
    latencyLabels.forEach(({ latency_ms }) => assert(latency_ms === 1000))
  })

  it('Tests LatencyLabeler returns latency == 0', async () => {
    const mockTimeChunks = Array.from({ length: 100 }, (_, index) => ({
      timestamp: 1000 * index,
      recorded: 1000 * index
    }))
    const latencyLabels = await Promise.all(mockTimeChunks.map(chunk => LatencyLabeler()(chunk)))
    latencyLabels.forEach(({ latency_ms }) => assert(latency_ms === 0))
  })
})
