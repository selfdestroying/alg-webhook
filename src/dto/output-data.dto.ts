import z from "zod";

export const OutputDataSchema = z.object({
  leadId: z.union([z.number(), z.string()]),
  data: z.object({
    name: z.string(),
    products: z.array(
      z.object({
        productId: z.number(),
        productName: z.string(),
        price: z.number(),
        lessonCount: z.number(),
      })
    ),
  }),
});

export type OutputDataSchemaType = z.infer<typeof OutputDataSchema>;
