import { tagihanRepository } from '@/features/tagihan/services/tagihan.repository';

export const tagihanService = {
  getAll: tagihanRepository.getAll,
  create: tagihanRepository.create,
  update: tagihanRepository.update,
  delete: tagihanRepository.delete,
  getById: tagihanRepository.getById,
};
