import type { PiWebApiUserInfo, PiWebApiElement, PiWebApiAttribute, PiWebApiPoint } from '../../piwebapi/types'
import type { DataFrame, CreateDataFrameInput, DataFramePermissions } from '../../domain/dataframe'
import type { Column, CreateColumnInput } from '../../domain/column'
import type { Tag, TagSearchResult, TagSearchOptions } from '../../domain/tag'

/**
 * Mock data for testing without PI Web API server
 */

export interface MockState {
  enabled: boolean
  delay: number
  user: PiWebApiUserInfo
  elements: Map<string, PiWebApiElement>
  attributes: Map<string, PiWebApiAttribute[]>
  dataframes: Map<string, DataFrame>
  columns: Map<string, Column[]>  // key is dataframe id
}

const defaultMockUser: PiWebApiUserInfo = {
  IdentityType: 'WindowsIdentity',
  Name: 'COMPANY\\testuser',
  IsAuthenticated: true,
  SID: 'S-1-5-21-1234567890-1234567890-1234567890-1001',
}

const mockState: MockState = {
  enabled: false,
  delay: 100,
  user: { ...defaultMockUser },
  elements: new Map(),
  attributes: new Map(),
  dataframes: new Map(),
  columns: new Map(),
}

export function enableMock(options: Partial<Pick<MockState, 'delay' | 'user'>> = {}): void {
  mockState.enabled = true
  if (options.delay !== undefined) {
    mockState.delay = options.delay
  }
  if (options.user) {
    mockState.user = options.user
  }
}

export function disableMock(): void {
  mockState.enabled = false
}

export function isMockEnabled(): boolean {
  return mockState.enabled
}

export function getMockState(): MockState {
  return mockState
}

export function resetMockState(): void {
  mockState.elements.clear()
  mockState.attributes.clear()
  mockState.dataframes.clear()
  mockState.columns.clear()
  mockState.user = { ...defaultMockUser }
}

export function setMockUser(user: Partial<PiWebApiUserInfo>): void {
  mockState.user = { ...mockState.user, ...user }
}

export function addMockElement(element: PiWebApiElement): void {
  mockState.elements.set(element.WebId, element)
}

export function addMockAttributes(elementWebId: string, attributes: PiWebApiAttribute[]): void {
  mockState.attributes.set(elementWebId, attributes)
}

async function delay(): Promise<void> {
  if (mockState.delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, mockState.delay))
  }
}

export async function mockGetUserInfo(): Promise<PiWebApiUserInfo> {
  await delay()
  return { ...mockState.user }
}

export async function mockGetElement(webId: string): Promise<PiWebApiElement | null> {
  await delay()
  return mockState.elements.get(webId) ?? null
}

export async function mockGetChildElements(parentWebId: string): Promise<PiWebApiElement[]> {
  await delay()
  const children: PiWebApiElement[] = []
  for (const element of mockState.elements.values()) {
    if (element.Path.includes(parentWebId) && element.WebId !== parentWebId) {
      children.push(element)
    }
  }
  return children
}

export async function mockGetAttributes(elementWebId: string): Promise<PiWebApiAttribute[]> {
  await delay()
  return mockState.attributes.get(elementWebId) ?? []
}

export async function mockSearchPoints(query: string): Promise<PiWebApiPoint[]> {
  await delay()
  if (!query || query.length < 2) {
    return []
  }

  const samplePoints: PiWebApiPoint[] = [
    {
      WebId: 'P1AbCDeFgHiJk1',
      Name: 'SINUSOID',
      Path: '\\\\PISRV01\\SINUSOID',
      Descriptor: 'PI System Demo Tag - Sine Wave',
      PointType: 'Float64',
      EngineeringUnits: '',
    },
    {
      WebId: 'P1AbCDeFgHiJk2',
      Name: 'CDT158',
      Path: '\\\\PISRV01\\CDT158',
      Descriptor: 'Continuous Demo Tag',
      PointType: 'Float64',
      EngineeringUnits: 'bar',
    },
    {
      WebId: 'P1AbCDeFgHiJk3',
      Name: 'BA:TEMP.1',
      Path: '\\\\PISRV01\\BA:TEMP.1',
      Descriptor: 'Temperature Sensor 1',
      PointType: 'Float32',
      EngineeringUnits: 'deg C',
    },
  ]

  const lowerQuery = query.toLowerCase()
  return samplePoints.filter(
    (p) =>
      p.Name.toLowerCase().includes(lowerQuery) ||
      (p.Descriptor?.toLowerCase().includes(lowerQuery) ?? false)
  )
}

// DataFrame mocks

let dfIdCounter = 1

export function addMockDataFrame(df: DataFrame): void {
  mockState.dataframes.set(df.id, df)
}

export async function mockListDataFrames(): Promise<DataFrame[]> {
  await delay()
  return Array.from(mockState.dataframes.values())
}

export async function mockGetDataFrame(id: string): Promise<DataFrame | null> {
  await delay()
  return mockState.dataframes.get(id) ?? null
}

export async function mockCreateDataFrame(
  input: CreateDataFrameInput,
  ownerSid: string
): Promise<DataFrame> {
  await delay()

  const id = `DF_${dfIdCounter++}`
  const permissions: DataFramePermissions = {
    mode: input.permissions ?? 'PRIVATE',
    ownerSid,
  }

  const df: DataFrame = {
    id,
    name: input.name.toUpperCase(),
    description: input.description,
    permissions,
    metadata: input.metadata ?? {},
  }

  mockState.dataframes.set(id, df)
  return df
}

export async function mockDeleteDataFrame(id: string): Promise<void> {
  await delay()
  mockState.dataframes.delete(id)
  mockState.columns.delete(id)
}

// Column mocks

let colIdCounter = 1

export async function mockListColumns(dataframeId: string): Promise<Column[]> {
  await delay()
  return mockState.columns.get(dataframeId) ?? []
}

export async function mockCreateColumn(
  dataframeId: string,
  input: CreateColumnInput
): Promise<Column> {
  await delay()

  const id = `COL_${colIdCounter++}`
  const columns = mockState.columns.get(dataframeId) ?? []

  const column: Column = {
    id,
    name: input.name,
    valueSourceType: input.valueSourceType,
    valueSource: input.valueSource,
    engineeringUnit: input.engineeringUnit,
    metadata: input.metadata ?? {},
    order: columns.length,
  }

  columns.push(column)
  mockState.columns.set(dataframeId, columns)
  return column
}

export async function mockDeleteColumn(dataframeId: string, columnId: string): Promise<void> {
  await delay()
  const columns = mockState.columns.get(dataframeId) ?? []
  const filtered = columns.filter(c => c.id !== columnId)
  mockState.columns.set(dataframeId, filtered)
}

// Tag Search mocks

const sampleTags: Tag[] = [
  {
    id: 'P1AbCDeFgHiJk1',
    name: 'SINUSOID',
    path: '\\\\PISRV01\\SINUSOID',
    description: 'PI System Demo Tag - Sine Wave',
    valueType: 'Float64',
    engineeringUnit: '',
  },
  {
    id: 'P1AbCDeFgHiJk2',
    name: 'CDT158',
    path: '\\\\PISRV01\\CDT158',
    description: 'Continuous Demo Tag',
    valueType: 'Float64',
    engineeringUnit: 'bar',
  },
  {
    id: 'P1AbCDeFgHiJk3',
    name: 'BA:TEMP.1',
    path: '\\\\PISRV01\\BA:TEMP.1',
    description: 'Temperature Sensor 1',
    valueType: 'Float32',
    engineeringUnit: 'deg C',
  },
  {
    id: 'P1AbCDeFgHiJk4',
    name: 'BA:TEMP.2',
    path: '\\\\PISRV01\\BA:TEMP.2',
    description: 'Temperature Sensor 2',
    valueType: 'Float32',
    engineeringUnit: 'deg C',
  },
  {
    id: 'P1AbCDeFgHiJk5',
    name: 'BA:PRESSURE.1',
    path: '\\\\PISRV01\\BA:PRESSURE.1',
    description: 'Pressure Sensor 1',
    valueType: 'Float64',
    engineeringUnit: 'psi',
  },
]

export async function mockSearchTags(options: TagSearchOptions): Promise<TagSearchResult> {
  await delay()

  const { query, limit = 50 } = options

  if (!query || query.length < 2) {
    return { tags: [], hasMore: false }
  }

  const lowerQuery = query.toLowerCase()
  const filtered = sampleTags.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description?.toLowerCase().includes(lowerQuery)
  )

  const tags = filtered.slice(0, limit)
  const hasMore = filtered.length > limit

  return { tags, hasMore, totalCount: filtered.length }
}

export async function mockGetTagById(id: string): Promise<Tag | null> {
  await delay()
  return sampleTags.find(t => t.id === id) ?? null
}

export async function mockGetTagByPath(path: string): Promise<Tag | null> {
  await delay()
  return sampleTags.find(t => t.path === path) ?? null
}
