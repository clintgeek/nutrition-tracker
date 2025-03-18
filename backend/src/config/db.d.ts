import { Pool } from 'pg';

interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
  oid: number;
  fields: Array<{
    name: string;
    tableID: number;
    columnID: number;
    dataTypeID: number;
    dataTypeSize: number;
    dataTypeModifier: number;
    format: string;
  }>;
}

interface PoolClient {
  query<T = any>(text: string, values?: any[]): Promise<QueryResult<T>>;
  release(): void;
}

interface Database {
  query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  getPool(): typeof Pool;
  getClient(): Promise<PoolClient>;
}

declare const db: Database;
export = db;