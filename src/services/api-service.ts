import z from "zod";
import { CatalogElementDataSchema } from "../dto/catalog-element.dto";
import { RawLeadDataSchema } from "../dto/lead.dto";
import APIRepository from "../repositories/api-repository";

export default class APIService {
  private repository: APIRepository;

  constructor(subdomain: string) {
    this.repository = new APIRepository(subdomain);
  }

  async getLead(id: string | number) {
    const lead = await this.repository.fetchLead(id);

    const parsedLead = RawLeadDataSchema.safeParse(lead);
    if (!parsedLead.success) {
      throw new Error(
        JSON.stringify(
          {
            rawLead: lead,
            errors: z.treeifyError(parsedLead.error),
          },
          null,
          2
        )
      );
    }
    return parsedLead.data;
  }

  async getCatalogElement(
    catalogId: string | number,
    elementId: string | number
  ) {
    const catalogElement = await this.repository.fetchCatalogElement(
      catalogId,
      elementId
    );
    const parsedCatalogElements =
      CatalogElementDataSchema.safeParse(catalogElement);
    if (!parsedCatalogElements.success) {
      throw new Error(
        JSON.stringify(
          {
            rawCatalogElement: catalogElement,
            errors: z.treeifyError(parsedCatalogElements.error),
          },
          null,
          2
        )
      );
    }

    return parsedCatalogElements.data;
  }
}
