/**
 * PostgreSQL 数据库连接池
 * 支持 Render PostgreSQL
 */
const { Pool } = require('pg');

// 直接使用 DATABASE_URL（Render 自动设置）
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ 错误: 没有找到 DATABASE_URL 环境变量');
  console.error('请在 Render 的 Environment 中检查数据库是否已关联');
  process.exit(1);
}

console.log('📡 数据库连接字符串:', connectionString.replace(/:.*@/, ':****@'));

// 创建连接池
const pool = new Pool({
  connectionString: connectionString,
  ssl: false, // Render 内部连接不需要 SSL
});

// 测试连接
pool.query('SELECT NOW()')
  .then(() => console.log('✅ 数据库连接成功'))
  .catch(err => console.error('❌ 数据库连接失败:', err.message));

/**
 * 构造 WHERE 子句（PostgreSQL语法）
 */
function buildWhere(where) {
  if (!where || Object.keys(where).length === 0) {
    return { clause: '', params: [] };
  }

  if (where.OR) {
    const orParts = where.OR.map(condition => {
      const [key, value] = Object.entries(condition)[0];
      if (Array.isArray(value)) return `${key} ${value[1]} $${1}`;
      return `${key} = $1`;
    });
    const params = where.OR.map(condition => {
      const [, value] = Object.entries(condition)[0];
      return Array.isArray(value) ? value[0] : value;
    });
    return { clause: `WHERE (${orParts.join(' OR ')})`, params };
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
  /**
   * 查询一行
   */
  async findOne(tableOrSql, paramsOrWhere = []) {
    if (typeof tableOrSql === 'string' && tableOrSql.toUpperCase().includes('SELECT')) {
      const result = await pool.query(tableOrSql, paramsOrWhere);
      return result.rows[0] || null;
    }
    const { clause, params } = buildWhere(paramsOrWhere);
    const sql = `SELECT * FROM ${tableOrSql} ${clause} LIMIT 1`;
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
  },

  /**
   * 查询多行
   */
  async findAll(tableOrSql, paramsOrWhere = [], orderBy = '') {
    if (typeof tableOrSql === 'string' && (tableOrSql.toUpperCase().includes('SELECT') || tableOrSql.includes('JOIN'))) {
      const result = await pool.query(tableOrSql, paramsOrWhere);
      return result.rows;
    }
    const { clause, params } = buildWhere(paramsOrWhere);
    const orderClause = orderBy ? `ORDER BY ${orderBy}` : '';
    const sql = `SELECT * FROM ${tableOrSql} ${clause} ${orderClause}`;
    const result = await pool.query(sql, params);
    return result.rows;
  },

  /**
   * 查询数量
   */
  async count(tableOrSql, paramsOrWhere = []) {
    if (typeof tableOrSql === 'string' && tableOrSql.toUpperCase().includes('SELECT')) {
      const result = await pool.query(tableOrSql, paramsOrWhere);
      return parseInt(result.rows[0]?.count) || 0;
    }
    const { clause, params } = buildWhere(paramsOrWhere);
    const sql = `SELECT COUNT(*) as count FROM ${tableOrSql} ${clause}`;
    const result = await pool.query(sql, params);
    return parseInt(result.rows[0]?.count) || 0;
  },

  /**
   * 插入数据
   */
  async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(sql, values);
    return { id: result.rows[0]?.id, affectedRows: result.rowCount };
  },

  /**
   * 更新数据
   */
  async update(table, data, whereOrClause, whereParams = []) {
    if (typeof whereOrClause === 'string') {
      const setKeys = Object.keys(data);
      const setValues = Object.values(data);
      const setClause = setKeys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const values = [...setValues, ...whereParams];
      const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereOrClause}`;
      const result = await pool.query(sql, values);
      return { affectedRows: result.rowCount };
    }
    const { clause, params: whereParamsArr } = buildWhere(whereOrClause);
    const setKeys = Object.keys(data);
    const setValues = Object.values(data);
    const setClause = setKeys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...setValues, ...whereParamsArr];
    const sql = `UPDATE ${table} SET ${setClause} ${clause}`;
    const result = await pool.query(sql, values);
    return { affectedRows: result.rowCount };
  },

  /**
   * 删除数据
   */
  async delete(table, whereOrClause, params = []) {
    if (typeof whereOrClause === 'string') {
      const sql = `DELETE FROM ${table} WHERE ${whereOrClause}`;
      const result = await pool.query(sql, params);
      return { affectedRows: result.rowCount };
    }
    const { clause, params: whereParams } = buildWhere(whereOrClause);
    const sql = `DELETE FROM ${table} ${clause}`;
    const result = await pool.query(sql, whereParams);
    return { affectedRows: result.rowCount };
  },

  /**
   * 执行原始SQL
   */
  async query(sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows;
  },

  getPool() {
    return pool;
  },
};

module.exports = db;
