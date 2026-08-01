export type ChecklistPayload = {
  label: string
  is_done?: boolean
  position?: number
}

export type ProgLinkPayload = {
  url: string
  platform: string
  position?: number
}

export type SyncPayload = {
  [key: string]: unknown
  checklist?: ChecklistPayload[]
  links?: ProgLinkPayload[]
}
