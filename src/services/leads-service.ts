import ApiError from '../error/api-error';
import { logInvocation } from '../lib/utils';
import ApiRepository from '../repositories/api-repository';

class LeadsService {
  @logInvocation
  async getLeads() {
    // Implementation here
  }

  @logInvocation
  async getLead(id: string | number) {
    const lead = await ApiRepository.fetchLead(id);

    if (!lead) {
      throw new ApiError(404, `Сделка с ID ${id} не найдена`);
    }

    return lead;
  }
}

export default new LeadsService();
