/**
 * PostgreSQL 数据库连接池
 * 自动将 MySQL 的 ? 占位符转换为 PostgreSQL 的 $1, $2...
 */
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('没有找到 DATABASE_URL 环境变量');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: false,
});

console.log('数据库连接成功');

// 转换占位符：? -> $1, $2...
function convertPlaceholders(sql, params) {
  let paramIndex = 1;
  const newParams = [...params];
  const newSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
  return { sql: newSql, params: newParams };
}

// 构造 WHERE 子句
function buildWhere(where) {
  if (!where || Object.keys(where).length === 0) {
    return { clause: '', params: [] };
  }

  const parts = [];
  const params = [];
  let paramIndex = 1;
  for (const [key, value] of Object.entries(where)) {
    if (Array.isArray(value)) {
      parts.push(`${key} ${value[1]} $${paramIndex}`);
      params.push(value[0]);
    } else {
      parts.push(`${key} = $${paramIndex}`);
      params.push(value);
    }
    paramIndex++;
  }
  return { clause: `WHERE ${parts.join(' AND ')}`, params };
}

const db = {
  // 查询一行
  async findOne(sqlOrTable, paramsOrWhere = []) {
    if (typeof sqlOrTable === 'string') {
      // 原始SQL
      if (sqlOrTable.trim().toUpperCase().startsWith('SELECT')) {
        const params = Array.isArray(paramsOrWhere) ? paramsOrWhere : [];
        const { sql, params: newParams } = convertPlaceholders(sqlOrTable, params);
        const result = await pool.query(sql, newParams);
        return result.rows[0] || null;
      }
      // 表名
      const { clause, params } = buildWhere(paramsOrWhere);
      const result = await pool.query(`SELECT * FROM ${sqlOrTable} ${clause} LIMIT 1`, params);
      return result.rows[0] || null;
    }
    return null;
  },

  // 查询多行
  async findAll(sqlOrTable, paramsOrWhere = [], orderBy = '') {
    if (typeof sqlOrTable === 'string') {
      if (sqlOrTable.trim().toUpperCase().startsWith('SELECT')) {
        const params = Array.isArray(paramsOrWhere) ? paramsOrWhere : [];
        const { sql, params: newParams } = convertPlaceholders(sqlOrTable, params);
        const result = await pool.query(sql, newParams);
        return result.rows;
      }
      const { clause, params } = buildWhere(paramsOrWhere);
      const orderClause = orderBy ? `ORDER BY ${orderBy}` : '';
      const result = await pool.query(`SELECT * FROM ${sqlOrTable} ${clause} ${orderClause}`, params);
      return result.rows;
    }
    return [];
  },

  // 查询数量
  async count(sqlOrTable, paramsOrWhere = []) {
    if (typeof sqlOrTable === 'string' && sqlOrTable.trim().toUpperCase().startsWith('SELECT')) {
      const params = Array.isArray(paramsOrWhere) ? paramsOrWhere : [];
      const { sql, params: newParams } = convertPlaceholders(sqlOrTable, params);
      const result = await pool.query(sql, newParams);
      return parseInt(result.rows[0]?.count) || 0;
    }
    const { clause, params } = buildWhere(paramsOrWhere);
    const result = await pool.query(`SELECT COUNT(*) as count FROM ${sqlOrTable} ${clause}`, params);
    return parseInt(result.rows[0]?.count) || 0;
  },

  // 插入
  async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(sql, values);
    return { id: result.rows[0]?.id, affectedRows: result.rowCount };
  },

  // 更新
  async update(table, data, whereOrClause, whereParams = []) {
    if (typeof whereOrClause === 'string') {
      const setKeys = Object.keys(data);
      const setValues = Object.values(data);
      const setClause = setKeys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      // 转换 WHERE 子句中的 ?
      const { sql: whereClause, params: convertedWhereParams } = convertPlaceholders(whereOrClause, [...whereParams]);
      const values = [...setValues, ...convertedWhereParams];
      const result = await pool.query(`UPDATE ${table} SET ${setClause} WHERE ${whereClause}`, values);
      return { affectedRows: result.rowCount };
    }
    const { clause, params: whereParamsArr } = buildWhere(whereOrClause);
    const setKeys = Object.keys(data);
    const setValues = Object.values(data);
    const setClause = setKeys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...setValues, ...whereParamsArr];
    const result = await pool.query(`UPDATE ${table} SET ${setClause} ${clause}`, values);
    return { affectedRows: result.rowCount };
  },

  // 删除
  async delete(table, whereOrClause, whereParams = []) {
    if (typeof whereOrClause === 'string') {
      // 转换 WHERE 子句中的 ?
      const { sql: whereClause, params: convertedWhereParams } = convertPlaceholders(whereOrClause, [...whereParams]);
      const result = await pool.query(`DELETE FROM ${table} WHERE ${whereClause}`, convertedWhereParams);
      return { affectedRows: result.rowCount };
    }
    const { clause, params } = buildWhere(whereOrClause);
    const result = await pool.query(`DELETE FROM ${table} ${clause}`, params);
    return { affectedRows: result.rowCount };
  },

  // 执行原始SQL
  async query(sql, params = []) {
    if (sql.includes('?')) {
      const { sql: newSql, params: newParams } = convertPlaceholders(sql, [...params]);
      const result = await pool.query(newSql, newParams);
      return result.rows;
    }
    const result = await pool.query(sql, params);
    return result.rows;
  },

  getPool() {
    return pool;
  },
};

module.exports = db;
