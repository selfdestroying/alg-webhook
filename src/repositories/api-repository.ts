import dotenv from "dotenv";
import emailLogger from "../services/email-logger-service";

dotenv.config({ debug: true, path: ".env", encoding: "utf-8" });

const getTimestamp = () => new Date().toISOString();

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

interface CRMAPIError {
  status: number;
  statusText: string;
  url: string;
  message: string;
}

export default class APIRepository {
  private readonly CRM_TOKEN: string;
  private readonly subdomain: string;
  private readonly baseUrl: string;

  constructor(subdomain: string) {
    this.subdomain = subdomain;

    const token = process.env.CRM_TOKEN;
    if (!token) {
      const error = "CRM_TOKEN не задан в переменных окружения";
      console.error(`[${getTimestamp()}] [APIRepository] ${error}`);
      throw new Error(error);
    }

    this.CRM_TOKEN = token;
    this.baseUrl = `https://${encodeURIComponent(
      this.subdomain
    )}.amocrm.ru/api/v4`;

    console.log(
      `[${getTimestamp()}] [APIRepository] Инициализирован для поддомена: ${
        this.subdomain
      }`
    );
  }

  private async request<T = unknown>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T | null> {
    const {
      method = "GET",
      body,
      timeoutMs = 15000,
      retries = 2,
      retryDelayMs = 500,
    } = options;
    const url = `${this.baseUrl}${endpoint}`;

    console.log(`[${getTimestamp()}] [APIRepository] ${method} запрос: ${url}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.CRM_TOKEN}`,
      },
      redirect: "follow",
    };

    if (body && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const startTime = Date.now();
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });
        clearTimeout(timer);
        const duration = Date.now() - startTime;

        if (!response.ok) {
          const errorDetails: CRMAPIError = {
            status: response.status,
            statusText: response.statusText,
            url,
            message: `CRM API вернул ошибку ${response.status}: ${response.statusText}`,
          };

          console.error(
            `[${getTimestamp()}] [APIRepository] ${
              errorDetails.message
            } (попытка ${attempt + 1}/${retries + 1}, ${duration}ms)`
          );

          if (attempt === retries) {
            await emailLogger.logError(
              `Ошибка запроса к CRM API\n` +
                `Метод: ${method}\n` +
                `URL: ${url}\n` +
                `Статус: ${response.status} ${response.statusText}\n` +
                `Время выполнения: ${duration}ms\n` +
                `Попытка: ${attempt + 1}/${retries + 1}`
            );
            throw new Error(errorDetails.message);
          }

          await this.delay(retryDelayMs * (attempt + 1));
          continue;
        }

        if (response.status === 204) {
          console.log(
            `[${getTimestamp()}] [APIRepository] Пустой ответ (204 No Content) за ${duration}ms (попытка ${
              attempt + 1
            }/${retries + 1})`
          );
          return null;
        }

        const data = await response.json();
        console.log(
          `[${getTimestamp()}] [APIRepository] Успешный ответ за ${duration}ms (попытка ${
            attempt + 1
          })`
        );

        return data as T;
      } catch (error) {
        clearTimeout(timer);
        const errorMessage =
          error instanceof Error ? error.message : "Неизвестная ошибка";
        const isTimeout = error instanceof Error && error.name === "AbortError";

        console.error(
          `[${getTimestamp()}] [APIRepository] Исключение при запросе к CRM (попытка ${
            attempt + 1
          }/${retries + 1}):`,
          errorMessage
        );

        if (attempt === retries) {
          await emailLogger.logError(
            `Критическая ошибка при запросе к CRM API\n` +
              `Метод: ${method}\n` +
              `URL: ${url}\n` +
              `Ошибка: ${errorMessage}\n` +
              `Таймаут: ${isTimeout}\n` +
              `Попытка: ${attempt + 1}/${retries + 1}`
          );

          throw error instanceof Error ? error : new Error(errorMessage);
        }

        await this.delay(retryDelayMs * (attempt + 1));
      }
    }

    return null;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async fetchLead(leadId: string | number): Promise<unknown | null> {
    if (leadId == null) {
      const error = "Некорректный leadId (пустое значение)";
      console.error(`[${getTimestamp()}] [APIRepository] ${error}`);
      throw new Error(error);
    }

    console.log(
      `[${getTimestamp()}] [APIRepository] Запрос лида с ID: ${leadId}`
    );

    const endpoint = `/leads/${encodeURIComponent(
      leadId
    )}?with=catalog_elements`;
    const result = await this.request(endpoint);

    if (result) {
      console.log(
        `[${getTimestamp()}] [APIRepository] Лид ${leadId} успешно получен`
      );
    }

    return result;
  }

  async fetchCatalogElement(
    catalogId: string | number,
    elementId: string | number
  ): Promise<unknown | null> {
    if (catalogId == null || elementId == null) {
      const error = "Некорректные аргументы: catalogId или elementId пустые";
      console.error(`[${getTimestamp()}] [APIRepository] ${error}`);
      throw new Error(error);
    }

    console.log(
      `[${getTimestamp()}] [APIRepository] Запрос элемента каталога: catalogId=${catalogId}, elementId=${elementId}`
    );

    const endpoint = `/catalogs/${encodeURIComponent(
      catalogId
    )}/elements/${encodeURIComponent(elementId)}`;

    const result = await this.request(endpoint);

    if (result) {
      console.log(
        `[${getTimestamp()}] [APIRepository] Элемент каталога ${elementId} успешно получен`
      );
    }

    return result;
  }

  async fetchInvoicePaidEvents(
    createdAtSince?: number
  ): Promise<unknown | null> {
    const searchParams = new URLSearchParams();
    searchParams.append("filter[type][]", "invoice_paid");

    if (Number.isFinite(createdAtSince)) {
      searchParams.append("filter[created_at]", String(createdAtSince));
    }

    const endpoint = `/events?${searchParams.toString()}`;
    const result = await this.request(endpoint);

    if (result) {
      console.log(
        `[${getTimestamp()}] [APIRepository] События invoice_paid успешно получены`
      );
    }

    return result;
  }

  async fetchCatalogElementLinks(
    catalogId: string | number,
    elementId: string | number,
    toEntityType: string
  ): Promise<unknown | null> {
    if (catalogId == null || elementId == null) {
      const error = "Некорректные аргументы: catalogId или elementId пустые";
      console.error(`[${getTimestamp()}] [APIRepository] ${error}`);
      throw new Error(error);
    }

    const endpoint = `/catalogs/${encodeURIComponent(
      catalogId
    )}/elements/${encodeURIComponent(
      elementId
    )}/links?filter[to_entity_type]=${encodeURIComponent(toEntityType)}`;

    const result = await this.request(endpoint);

    if (result) {
      console.log(
        `[${getTimestamp()}] [APIRepository] Связи элемента каталога ${elementId} успешно получены`
      );
    }

    return result;
  }
}
