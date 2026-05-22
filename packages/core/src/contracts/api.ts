export type ApiError = {
  code: string;
  message: string;
  detail?: string;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
};

export type PaginatedResult<T> = {
  data: T[];
  pagination: Pagination;
};
