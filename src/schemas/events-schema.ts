import { z } from "zod";

const LinkHrefSchema = z.object({ href: z.string().optional() }).partial();

export const EventSchema = z
  .object({
    id: z.union([z.number(), z.string(), z.null()]).optional(),
    type: z.union([z.string(), z.null()]).optional(),
    entity_id: z.union([z.number(), z.string(), z.null()]).optional(),
    entity_type: z.union([z.string(), z.null()]).optional(),
    created_at: z.union([z.number(), z.string(), z.null()]).optional(),
    _embedded: z
      .object({
        entity: z.object({
          id: z.union([z.number(), z.string(), z.null()]).optional(),
          catalog_id: z.union([z.number(), z.string(), z.null()]).optional(),
        }),
      })
      .partial()
      .optional(),
  })
  .passthrough();

export const EventsResponseSchema = z
  .object({
    _page: z.union([z.number(), z.null()]).optional(),
    _links: z
      .object({
        self: LinkHrefSchema.optional(),
        next: LinkHrefSchema.optional(),
      })
      .partial()
      .optional(),
    _embedded: z
      .object({
        events: z.array(EventSchema).default([]),
      })
      .optional(),
  })
  .nullable();

export type EventSchemaType = z.infer<typeof EventSchema>;
export type EventsResponseSchemaType = z.infer<typeof EventsResponseSchema>;

export const EntityLinkSchema = z
  .object({
    to_entity_id: z.union([z.number(), z.string(), z.null()]).optional(),
    to_entity_type: z.union([z.string(), z.null()]).optional(),
    metadata: z.unknown().optional(),
  })
  .passthrough();

export const CatalogElementLinksResponseSchema = z.object({
  _links: z
    .object({
      self: LinkHrefSchema.optional(),
    })
    .partial()
    .optional(),
  _embedded: z
    .object({
      links: z.array(EntityLinkSchema).default([]),
    })
    .optional(),
});

export type CatalogElementLinksResponseSchemaType = z.infer<
  typeof CatalogElementLinksResponseSchema
>;
