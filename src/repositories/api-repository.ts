import dotenv from 'dotenv';
import ApiError from '../error/api-error';
import { delay, logInvocation } from '../lib/utils';
import { EventsFilters, EventsResponse } from '../types/event';
import { Invoice, InvoiceLinks, InvoiceLinksFilters } from '../types/invoice';
import { Lead } from '../types/lead';

dotenv.config({ debug: true, path: '.env', encoding: 'utf-8' });

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
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

class APIRepository {
  private readonly CRM_TOKEN: string;
  private readonly CRM_SUBDOMAIN: string;
  private readonly baseUrl: string;

  constructor() {
    const token = process.env.CRM_TOKEN;
    const subdomain = process.env.CRM_SUBDOMAIN;
    if (!subdomain) {
      throw new ApiError(500, 'CRM_SUBDOMAIN не задан в переменных окружения');
    }
    if (!token) {
      throw new ApiError(500, 'CRM_TOKEN не задан в переменных окружения');
    }

    this.CRM_SUBDOMAIN = subdomain;
    this.CRM_TOKEN = token;
    this.baseUrl = `https://${encodeURIComponent(this.CRM_SUBDOMAIN)}.amocrm.ru/api/v4`;
  }

  @logInvocation
  private async request<T = unknown>(endpoint: string, options: RequestOptions = {}) {
    const { method = 'GET', body } = options;
    const url = `${this.baseUrl}${endpoint}`;

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.CRM_TOKEN}`,
      },
      redirect: 'follow',
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const startTime = Date.now();
    const response = await fetch(url, {
      ...fetchOptions,
    });
    const duration = Date.now() - startTime;

    await delay(500);

    if (!response.ok) {
      const errorDetails: CRMAPIError = {
        status: response.status,
        statusText: response.statusText,
        url,
        message:
          'Ошибка запроса к CRM API\n' +
          `Метод: ${method}\n` +
          `URL: ${url}\n` +
          `Статус: ${response.status} ${response.statusText}\n` +
          `Время выполнения: ${duration}ms\n`,
      };

      throw new ApiError(response.status === 204 ? 404 : response.status, errorDetails.message);
    }

    if (response.status === 204) {
      return null;
    }

    const data = await response.json();

    return data as T;
  }

  @logInvocation
  async fetchLead(id: string | number) {
    if (id == null) {
      throw new ApiError(404, 'Некорректный id (пустое значение)');
    }

    const endpoint = `/leads/${encodeURIComponent(id)}?with=catalog_elements`;
    const result = await this.request<Lead>(endpoint);

    return result;
  }

  @logInvocation
  async fetchEvents(filters: EventsFilters = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(`filter[${key}]`, String(value));
      }
    });

    const endpoint = `/events?${searchParams.toString()}`;
    const result = await this.request<EventsResponse>(endpoint);

    if (!result) {
      return {
        _page: -1,
        _links: {
          self: { href: '' },
        },
        _embedded: {
          events: [],
        },
      };
    }
    return result;
  }

  @logInvocation
  async fetchInvoice(id: string | number) {
    const catalogId = 9405;
    if (id == null) {
      throw new ApiError(404, 'Некорректный id (пустое значение)');
    }

    const endpoint = `/catalogs/${encodeURIComponent(
      catalogId,
    )}/elements/${encodeURIComponent(id)}`;
    const result = await this.request<Invoice>(endpoint);

    return result;
  }

  @logInvocation
  async fetchInvoiceLinks(id: string | number, filters: InvoiceLinksFilters = {}) {
    const catalogId = 9405;
    if (id == null) {
      throw new ApiError(404, 'Некорректный id (пустое значение)');
    }

    const searchParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(`filter[${key}]`, String(value));
      }
    });

    const endpoint = `/catalogs/${encodeURIComponent(
      catalogId,
    )}/elements/${encodeURIComponent(id)}/links?${searchParams.toString()}`;
    const result = await this.request<InvoiceLinks>(endpoint);

    return result;
  }
}

export default new APIRepository();
