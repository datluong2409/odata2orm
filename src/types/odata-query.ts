/**
 * OData Query Parameters Interface
 */

export interface ODataQueryParams {
  $filter?: string;
  $top?: number;
  $skip?: number;
  $orderby?: string;
  $select?: string;
  $count?: boolean;
}

export interface PrismaQueryOptions {
  where?: any;
  take?: number;
  skip?: number;
  orderBy?: any;
  select?: any;
}

export interface PaginationResult<T = any> {
  data: T[];
  count?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
}

export interface OrderByItem {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ParsedOrderBy {
  [key: string]: 'asc' | 'desc';
}

export interface ParsedSelect {
  [key: string]: boolean | ParsedSelect;
}
