/**
 * Raw PI Web API response types
 * These shapes stay within the piwebapi/ module only
 */

export interface PiWebApiUserInfo {
  IdentityType: string
  Name: string
  IsAuthenticated: boolean
  SID: string
}

export interface PiWebApiElement {
  WebId: string
  Name: string
  Description?: string
  Path: string
  HasChildren: boolean
  Links: {
    Self: string
    Elements?: string
    Attributes?: string
  }
}

export interface PiWebApiAttribute {
  WebId: string
  Name: string
  Description?: string
  Type: string
  Value?: unknown
  Links: {
    Self: string
    Value?: string
  }
}

export interface PiWebApiPoint {
  WebId: string
  Name: string
  Path: string
  Descriptor?: string
  PointType: string
  EngineeringUnits?: string
}

export interface PiWebApiItemsResponse<T> {
  Items: T[]
}
