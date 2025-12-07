import z from "zod";
import APIRepository from "../repositories/api-repository";
import { CatalogElementDataSchema } from "../schemas/catalog-element-schema";
import {
  CatalogElementLinksResponseSchema,
  EventsResponseSchema,
} from "../schemas/events-schema";
import { RawLeadDataSchema } from "../schemas/lead-schema";
import emailLogger from "./email-logger-service";

export default class APIService {
  private readonly repository: APIRepository;
  private readonly subdomain: string;

  constructor(subdomain: string) {
    this.subdomain = subdomain;
    this.repository = new APIRepository(subdomain);
    console.log(
      `[${this.getTimestamp()}] [APIService] Initialized for subdomain: ${subdomain}`
    );
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  async getLead(id: string | number) {
    console.log(
      `[${this.getTimestamp()}] [APIService] Fetching lead with ID: ${id}`
    );

    try {
      const lead = await this.repository.fetchLead(id);
      console.log(
        `[${this.getTimestamp()}] [APIService] Raw lead data received for ID: ${id}`
      );

      const parsedLead = RawLeadDataSchema.safeParse(lead);

      if (!parsedLead.success) {
        const errorDetails = {
          leadId: id,
          subdomain: this.subdomain,
          rawLead: lead,
          validationErrors: z.treeifyError(parsedLead.error),
        };

        const errorMessage = `Lead validation failed for ID: ${id}\n${JSON.stringify(
          errorDetails,
          null,
          2
        )}`;
        console.error(`[${this.getTimestamp()}] [APIService] ${errorMessage}`);

        await emailLogger.logError(
          `[APIService] Lead Validation Error\n\nSubdomain: ${
            this.subdomain
          }\nLead ID: ${id}\n\n${JSON.stringify(errorDetails, null, 2)}`
        );

        throw new Error(
          `Lead validation failed: ${JSON.stringify(errorDetails, null, 2)}`
        );
      }

      console.log(
        `[${this.getTimestamp()}] [APIService] Lead successfully validated for ID: ${id}`
      );
      return parsedLead.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[${this.getTimestamp()}] [APIService] Error fetching lead ${id}:`,
        errorMessage
      );

      await emailLogger.logError(
        `[APIService] Lead Fetch Error\n\nSubdomain: ${this.subdomain}\nLead ID: ${id}\nError: ${errorMessage}`
      );

      throw error;
    }
  }

  async getCatalogElement(
    catalogId: string | number | null | undefined,
    elementId: string | number | null | undefined
  ) {
    console.log(
      `[${this.getTimestamp()}] [APIService] Fetching catalog element - catalogId: ${catalogId}, elementId: ${elementId}`
    );

    try {
      if (catalogId == null || elementId == null) {
        throw new Error(
          `Invalid arguments: catalogId or elementId is null or undefined - catalogId: ${catalogId}, elementId: ${elementId}`
        );
      }
      const catalogElement = await this.repository.fetchCatalogElement(
        catalogId,
        elementId
      );
      console.log(
        `[${this.getTimestamp()}] [APIService] Raw catalog element data received - catalogId: ${catalogId}, elementId: ${elementId}`
      );

      const parsedCatalogElement =
        CatalogElementDataSchema.safeParse(catalogElement);

      if (!parsedCatalogElement.success) {
        const errorDetails = {
          catalogId,
          elementId,
          subdomain: this.subdomain,
          rawCatalogElement: catalogElement,
          validationErrors: z.treeifyError(parsedCatalogElement.error),
        };

        const errorMessage = `Catalog element validation failed - catalogId: ${catalogId}, elementId: ${elementId}\n${JSON.stringify(
          errorDetails,
          null,
          2
        )}`;
        console.error(`[${this.getTimestamp()}] [APIService] ${errorMessage}`);

        await emailLogger.logError(
          `[APIService] Catalog Element Validation Error\n\nSubdomain: ${
            this.subdomain
          }\nCatalog ID: ${catalogId}\nElement ID: ${elementId}\n\n${JSON.stringify(
            errorDetails,
            null,
            2
          )}`
        );

        throw new Error(
          `Catalog element validation failed: ${JSON.stringify(
            errorDetails,
            null,
            2
          )}`
        );
      }

      console.log(
        `[${this.getTimestamp()}] [APIService] Catalog element successfully validated - catalogId: ${catalogId}, elementId: ${elementId}`
      );
      return parsedCatalogElement.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[${this.getTimestamp()}] [APIService] Error fetching catalog element - catalogId: ${catalogId}, elementId: ${elementId}:`,
        errorMessage
      );

      await emailLogger.logError(
        `[APIService] Catalog Element Fetch Error\n\nSubdomain: ${this.subdomain}\nCatalog ID: ${catalogId}\nElement ID: ${elementId}\nError: ${errorMessage}`
      );

      throw error;
    }
  }

  async getInvoicePaidEvents(createdAtSince?: number) {
    console.log(
      `[${this.getTimestamp()}] [APIService] Запрашиваем события invoice_paid${
        Number.isFinite(createdAtSince)
          ? ` с created_at > ${createdAtSince}`
          : ""
      }`
    );

    try {
      const eventsResponse = await this.repository.fetchInvoicePaidEvents(
        createdAtSince
      );

      const parsed = EventsResponseSchema.safeParse(eventsResponse);

      if (!parsed.success) {
        const errorDetails = {
          subdomain: this.subdomain,
          rawResponse: eventsResponse,
          validationErrors: z.treeifyError(parsed.error),
        };

        const errorMessage = `Валидация событий invoice_paid не прошла\n${JSON.stringify(
          errorDetails,
          null,
          2
        )}`;
        console.error(`[${this.getTimestamp()}] [APIService] ${errorMessage}`);

        await emailLogger.logError(
          `[APIService] Invoice Paid Events Validation Error\n\nSubdomain: ${
            this.subdomain
          }\n${JSON.stringify(errorDetails, null, 2)}`
        );

        throw new Error(errorMessage);
      }

      console.log(
        `[${this.getTimestamp()}] [APIService] События invoice_paid успешно получены и провалидированы`
      );
      return parsed.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[${this.getTimestamp()}] [APIService] Ошибка при получении событий invoice_paid:`,
        errorMessage
      );

      await emailLogger.logError(
        `[APIService] Invoice Paid Events Fetch Error\n\nSubdomain: ${this.subdomain}\nError: ${errorMessage}`
      );

      throw error;
    }
  }

  async getCatalogElementLinks(
    catalogId: string | number,
    elementId: string | number,
    toEntityType: string
  ) {
    console.log(
      `[${this.getTimestamp()}] [APIService] Запрашиваем связи элемента каталога ${elementId} с типом ${toEntityType}`
    );

    try {
      const response = await this.repository.fetchCatalogElementLinks(
        catalogId,
        elementId,
        toEntityType
      );
      const parsed = CatalogElementLinksResponseSchema.safeParse(response);

      if (!parsed.success) {
        const errorDetails = {
          catalogId,
          elementId,
          toEntityType,
          subdomain: this.subdomain,
          rawResponse: response,
          validationErrors: z.treeifyError(parsed.error),
        };

        const errorMessage = `Валидация связей элемента каталога не прошла\n${JSON.stringify(
          errorDetails,
          null,
          2
        )}`;
        console.error(`[${this.getTimestamp()}] [APIService] ${errorMessage}`);

        await emailLogger.logError(
          `[APIService] Catalog Element Links Validation Error\n\nSubdomain: ${
            this.subdomain
          }\nCatalog ID: ${catalogId}\nElement ID: ${elementId}\n${JSON.stringify(
            errorDetails,
            null,
            2
          )}`
        );

        throw new Error(errorMessage);
      }

      console.log(
        `[${this.getTimestamp()}] [APIService] Связи элемента каталога ${elementId} успешно получены и провалидированы`
      );
      return parsed.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[${this.getTimestamp()}] [APIService] Ошибка при получении связей элемента каталога ${elementId}:`,
        errorMessage
      );

      await emailLogger.logError(
        `[APIService] Catalog Element Links Fetch Error\n\nSubdomain: ${this.subdomain}\nCatalog ID: ${catalogId}\nElement ID: ${elementId}\nError: ${errorMessage}`
      );

      throw error;
    }
  }
}
