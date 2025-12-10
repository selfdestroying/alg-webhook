export interface EventsFilters {
  type?: string;
  created_at?: number | string;
}

export interface EventLink {
  href: string;
}

export interface EventLinks {
  self: EventLink;
}

export interface EventEntity {
  id: number;
  catalog_id: number;
  _links: EventLinks;
}

export interface EventEmbedded {
  entity: EventEntity;
}

export interface Event {
  id: string;
  type: string;
  entity_id: number;
  entity_type: string;
  created_by: number;
  created_at: number;
  value_after: unknown[];
  value_before: unknown[];
  account_id: number;
  _links: EventLinks;
  _embedded: EventEmbedded;
}

export interface EventsEmbedded {
  events: Event[];
}

export interface EventsResponse {
  _page: number;
  _links: EventLinks;
  _embedded: EventsEmbedded;
}
