import {
    getMetadataArgsStorage,
    SelectQueryBuilder,
  } from 'typeorm';
import { RelationMetadataArgs } from 'typeorm/metadata-args/RelationMetadataArgs';
  
  const QueriesMap: Record<string, string> = {
    and: 'AND',
    or: 'OR',
    not: 'NOT',
    eq: '=',
    ne: '<>',
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
    like: 'LIKE',
    ilike: 'ILIKE',
    in: 'IN',
    notIn: 'NOT IN',
    isNull: 'IS NULL',
    isNotNull: 'IS NOT NULL',
    between: 'BETWEEN',
    notBetween: 'NOT BETWEEN',
    contains: '@>',
    isEmpty: '',     // tratado especialmente
    isNotEmpty: '',  // tratado especialmente
  };
  
  type RelationsMap = {
    [propertyName: string]: RelationsMap;
  };
  
  function getEntityRelationsRecursive(
    entity: Function,
    visited = new Set<Function>(),
  ): RelationsMap {
    if (visited.has(entity)) return {};
    visited.add(entity);
  
    const directRelations = getMetadataArgsStorage()
      .relations.filter((rel: RelationMetadataArgs) =>
        rel.target === entity ||
        (Array.isArray(rel.target) && rel.target.includes(entity as any))
      );
  
    const relationsObj: RelationsMap = {};
    for (const rel of directRelations) {
      const relatedEntity = rel.type;
      relationsObj[rel.propertyName] = getEntityRelationsRecursive(
        relatedEntity as Function,
        visited,
      );
    }
    return relationsObj;
  }
  
  interface ParamIndex { index: number }
  
  interface BuildResult {
    clause: string;
    parameters: Record<string, any>;
  }
  
  function buildWhereClause(
    where: Record<string, any>,
    alias: string,
    relations: RelationsMap = {},
    paramIndex: ParamIndex = { index: 0 },
  ): BuildResult {
    const clauses: string[] = [];
    let parameters: Record<string, any> = {};
  
    for (const key in where) {
      const value = where[key];
  
      // AND / NOT
      if (key === 'and' || key === 'not') {
        const op = key.toUpperCase();
        const items = Array.isArray(value) ? value : [value];
        const sub = items
          .map(item => {
            const res = buildWhereClause(item, alias, relations, paramIndex);
            parameters = { ...parameters, ...res.parameters };
            return res.clause;
          })
          .filter(Boolean);
        if (sub.length) {
          const joined = sub.join(` ${op} `);
          clauses.push(key === 'not' ? `(NOT ${joined})` : `(${joined})`);
        }
        continue;
      }
  
      // OR
      if (key === 'or') {
        const items = Array.isArray(value) ? value : [value];
        const sub = items
          .map(item => {
            const res = buildWhereClause(item, alias, relations, paramIndex);
            parameters = { ...parameters, ...res.parameters };
            return res.clause;
          })
          .filter(Boolean);
        if (sub.length) clauses.push(`(${sub.join(' OR ')})`);
        continue;
      }
  
      // Relações
      if (relations[key]) {
        const res = buildWhereClause(
          value,
          key,
          relations[key],
          paramIndex,
        );
        parameters = { ...parameters, ...res.parameters };
        if (res.clause) clauses.push(`(${res.clause})`);
        continue;
      }
  
      // Campos simples ou operadores
      if (Array.isArray(value)) {
        const p = `param${paramIndex.index++}`;
        clauses.push(`${alias}.${key} IN (:...${p})`);
        parameters[p] = value;
      } else if (typeof value === 'object' && value !== null) {
        for (const op in value) {
          const val = value[op];
          if (op === 'isEmpty') {
            clauses.push(`(array_length(${alias}.${key},1)=0 OR ${alias}.${key} IS NULL)`);
          } else if (op === 'isNotEmpty') {
            clauses.push(`array_length(${alias}.${key},1)>0`);
          } else {
            const sqlOp = QueriesMap[op];
            if (!sqlOp) continue;
  
            if (op === 'isNull' || op === 'isNotNull') {
              clauses.push(`${alias}.${key} ${sqlOp}`);
            } else if (op === 'in' || op === 'notIn') {
              const p = `param${paramIndex.index++}`;
              clauses.push(`${alias}.${key} ${sqlOp} (:...${p})`);
              parameters[p] = val;
            } else if (op === 'between' || op === 'notBetween') {
              const p1 = `param${paramIndex.index++}`;
              const p2 = `param${paramIndex.index++}`;
              clauses.push(
                `${alias}.${key} ${sqlOp} :${p1} AND :${p2}`,
              );
              parameters[p1] = val[0];
              parameters[p2] = val[1];
            } else {
              const p = `param${paramIndex.index++}`;
              clauses.push(`${alias}.${key} ${sqlOp} :${p}`);
              parameters[p] = val;
            }
          }
        }
      } else {
        const p = `param${paramIndex.index++}`;
        clauses.push(`${alias}.${key} = :${p}`);
        parameters[p] = value;
      }
    }
  
    return {
      clause: clauses.join(' AND '),
      parameters,
    };
  }
  
  function joinRelations<T>(
    query: SelectQueryBuilder<T>,
    alias: string,
    where: Record<string, any>,
    relations: RelationsMap = {},
  ): void {
    for (const key in where) {
      if (relations[key]) {
        query.innerJoinAndSelect(`${alias}.${key}`, key);
        joinRelations(query, key, where[key], relations[key]);
      }
    }
  }
  
  function applyOrder<T>(
    query: SelectQueryBuilder<T>,
    order: Record<string, any>,
    alias: string,
    relations: RelationsMap = {},
  ): void {
    for (const key of Object.keys(order)) {
      const dir = order[key];
      if (relations[key]) {
        if (typeof dir === 'object') {
          for (const inner of Object.keys(dir)) {
            query.addOrderBy(`${key}.${inner}`, dir[inner]);
          }
        } else {
          query.addOrderBy(`${alias}.${key}`, dir);
        }
      } else {
        query.addOrderBy(`${alias}.${key}`, dir);
      }
    }
  }
  
  interface Pagination {
    page: number;
    count: number;
  }
  
  interface Selection {
    getRelations(): { data: string[] };
  }
  
  export function GenerateQuery<T>(
    query: SelectQueryBuilder<T>,
    alias: string,
    where?: Record<string, any>,
    order?: Record<string, any>,
    pagination?: Pagination,
    selection?: Selection,
    entity?: Function,
  ): SelectQueryBuilder<T> {
    if (!query) throw new Error('Query é obrigatório');
  
    const relations = entity ? getEntityRelationsRecursive(entity) : {};
  
    if (where) {
      joinRelations(query, alias, where, relations);
      const { clause, parameters } = buildWhereClause(where, alias, relations);
      query.where(clause, parameters);
    }
  
    if (order) {
      applyOrder(query, order, alias, relations);
    }
  
    if (pagination) {
      query.skip((pagination.page - 1) * pagination.count).take(pagination.count);
    }
  
    return query;
  }
  