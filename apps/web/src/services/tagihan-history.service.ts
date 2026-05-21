import { historyRepository } from '@/features/tagihan/services/history.repository';

export const historyService = {
  getByTagihan: historyRepository.getByTagihan,
  create: historyRepository.create,
};

export const tagihanHistoryService = historyService;
