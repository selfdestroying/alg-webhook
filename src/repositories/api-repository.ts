import dotenv from "dotenv";
dotenv.config({ debug: true, path: [".env"], encoding: "UTF-8" });

export default class APIRepository {
  private CRM_TOKEN: string;
  private subdomain: string;

  constructor(subdomain: string) {
    this.subdomain = subdomain;
    const token = process.env.CRM_TOKEN;
    if (!token) {
      throw new Error("Не задан CRM_TOKEN");
    }
    this.CRM_TOKEN = token;
  }

  private async request(url: string) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.CRM_TOKEN}`,
        },
        redirect: "follow",
      });

      if (!res.ok) {
        throw new Error(`CRM API вернул ${res.status}: ${res.statusText}`);
      }

      return await res.json();
    } catch (err) {
      if (err instanceof Error) {
        console.error("Ошибка при запросе к CRM:", err.message);
      } else {
        console.error("Неизвестная ошибка при запросе к CRM:", err);
      }
      return null;
    }
  }

  async fetchLead(leadId: string | number) {
    if (leadId == null) {
      throw new Error("Некорректный leadId");
    }

    const url = `https://${encodeURIComponent(
      this.subdomain
    )}.amocrm.ru/api/v4/leads/${encodeURIComponent(
      leadId
    )}?with=catalog_elements`;

    return this.request(url);
  }

  async fetchCatalogElement(
    catalogId: string | number,
    elementId: string | number
  ) {
    if (catalogId == null || elementId == null) {
      throw new Error("Некорректные аргументы: catalogId или elementId пустые");
    }

    const url = `https://${encodeURIComponent(
      this.subdomain
    )}.amocrm.ru/api/v4/catalogs/${encodeURIComponent(
      catalogId
    )}/elements/${encodeURIComponent(elementId)}`;

    return this.request(url);
  }
}
