import { logInvocation } from '../lib/utils';
import ApiRepository from '../repositories/api-repository';
import { EventsFilters } from '../types/event';

class EventsService {
  @logInvocation
  async getEvents(filters: EventsFilters = {}) {
    const events = await ApiRepository.fetchEvents(filters);

    return events;
  }
}

export default new EventsService();
