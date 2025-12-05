import z from "zod";

export const OutputDataSchema = z.object({
  lead_id: z.union([z.number(), z.string(), z.null()]).optional(),
  data: z.object({
    name: z.union([z.string(), z.null()]).optional(),
    products: z.array(
      z.object({
        product_id: z.union([z.number(), z.string(), z.null()]).optional(),
        product_name: z.union([z.string(), z.null()]).optional(),
        price: z.union([z.number(), z.null()]).optional(),
        lesson_count: z.union([z.number(), z.null()]).optional(),
      })
    ),
  }),
});

export type OutputDataSchemaType = z.infer<typeof OutputDataSchema>;
