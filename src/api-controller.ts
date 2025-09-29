import APIService from "./api-service";
import { RawCatalogElementSchema, RawLeadDataSchema } from "./lead.dto";

export default class APIController {

    private service: APIService

    constructor(subdomain: string) {
        this.service = new APIService(subdomain)
    }

    async getLead(id: string | number) {
        const lead = await this.service.fetchLead(id)
        
        const parsedLead = RawLeadDataSchema.safeParse(lead)
        if (!parsedLead.success)
        {
            return null
        }
        return parsedLead.data
    }

    async getCatalogElement(catalogId: string | number, elementId: string | number) {
        const catalogElement = await this.service.fetchCatalogElement(catalogId, elementId)
        const parsedCatalogElements = RawCatalogElementSchema.safeParse(catalogElement)
        if (!parsedCatalogElements.success) {
            return null
        } 

        return parsedCatalogElements.data
    }
}

