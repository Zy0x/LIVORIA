import { strukRepository } from '@/features/tagihan/services/struk.repository';

export const strukService = {
  getByTagihan: strukRepository.getByTagihan,
  create: strukRepository.create,
  delete: strukRepository.delete,
  upload: strukRepository.upload,
};
