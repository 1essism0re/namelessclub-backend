// 创建连接池 - 支持云端SSL连接
const mysql = require('mysql2/promise');
const config = require('../config');
const poolConfig = {
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: config.db.waitForConnections,
  connectionLimit: config.db.connectionLimit,
  timezone: '+08:00',
  supportBigNumbers: true,
  bigNumberStrings: false,
};

// 如果是云端数据库（PlanetScale等），启用SSL
if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = mysql.createPool(poolConfig);

// 测试数据库连接
pool.getConnection()
  .then(conn => {
    console.log(`✅ 数据库连接成功: ${config.db.host}:${config.db.port}/${config.db.database}`);
    conn.release();
  })
  .catch(err => {
    console.error('❌ 数据库连接失败:', err.message);
    console.error('   请检查:');
    console.error('   1. MySQL服务是否已启动');
    console.error('   2. .env 中的数据库配置是否正确');
    console.error('   3. 是否已创建 kk_esports 数据库');
  });

/**
 * 构造 WHERE 子句
 * 支持两种格式：
 *   简写: { status: 1, name: ['%test%', 'LIKE'] }
 *   OR条件: { OR: [{ name: ['%a%', 'LIKE'] }, { phone: ['%a%', 'LIKE'] }] }
 */
function buildWhere(where) {
  if (!where || Object.keys(where).length === 0) {
    return { clause: '', params: [] };
  }

  // 处理 OR 条件
  if (where.OR) {
    const orParts = where.OR.map(condition => {
      const [key, value] = Object.entries(condition)[0];
      if (Array.isArray(value)) {
        return `${key} ${value[1]} ?`;
      }
      return `${key} = ?`;
    });
    const params = where.OR.map(condition => {
      const [, value] = Object.entries(condition)[0];
      return Array.isArray(value) ? value[0] : value;
    });
    return { clause: `WHERE (${orParts.join(' OR ')})`, params };
  }

  const parts = [];
  const params = [];
  for (const [key, value] of Object.entries(where)) {
    if (Array.isArray(value)) {
      // 支持 LIKE 等操作符: { name: ['%test%', 'LIKE'] }
      parts.push(`${key} ${value[1]} ?`);
      params.push(value[0]);
    } else {
      parts.push(`${key} = ?`);
      params.push(value);
    }
  }
  return { clause: `WHERE ${parts.join(' AND ')}`, params };
}

// 封装常用查询方法
const db = {
  /**
   * 查询一行
   * 用法1（原始SQL）: db.findOne('SELECT * FROM users WHERE id = ?', [1])
   * 用法2（简写）  : db.findOne('users', { id: 1 })
   */
  async findOne(tableOrSql, paramsOrWhere = []) {
    if (typeof tableOrSql === 'string' && (tableOrSql.toUpperCase().includes('SELECT') || tableOrSql.toUpperCase().includes('WHERE'))) {
      // 原始SQL模式
      const [rows] = await pool.execute(tableOrSql, paramsOrWhere);
      return rows[0] || null;
    }
    // 简写模式
    const { clause, params } = buildWhere(paramsOrWhere);
    const sql = `SELECT * FROM ${tableOrSql} ${clause} LIMIT 1`;
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  },

  /**
   * 查询多行
   * 用法1（原始SQL）: db.findAll('SELECT * FROM users', [])
   * 用法2（简写）  : db.findAll('users', { status: 1 }, 'created_at DESC')
   */
  async findAll(tableOrSql, paramsOrWhere = [], orderBy = '') {
    if (typeof tableOrSql === 'string' && (tableOrSql.toUpperCase().includes('SELECT') || tableOrSql.includes('JOIN'))) {
      // 原始SQL模式
      const [rows] = await pool.execute(tableOrSql, paramsOrWhere);
      return rows;
    }
    // 简写模式
    const { clause, params } = buildWhere(paramsOrWhere);
    const orderClause = orderBy ? `ORDER BY ${orderBy}` : '';
    const sql = `SELECT * FROM ${tableOrSql} ${clause} ${orderClause}`;
    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  /**
   * 查询数量
   * 用法1: db.count('SELECT COUNT(*) as count FROM users')
   * 用法2: db.count('users', { status: 1 })
   */
  async count(tableOrSql, paramsOrWhere = []) {
    if (typeof tableOrSql === 'string' && tableOrSql.toUpperCase().includes('SELECT')) {
      const [rows] = await pool.execute(tableOrSql, paramsOrWhere);
      return rows[0].count;
    }
    const { clause, params } = buildWhere(paramsOrWhere);
    const sql = `SELECT COUNT(*) as count FROM ${tableOrSql} ${clause}`;
    const [rows] = await pool.execute(sql, params);
    return rows[0].count;
  },

  /**
   * 插入数据
   * 用法: db.insert('users', { phone: '13800000000', nickname: '测试' })
   * 返回: { id: 插入的ID, affectedRows: 影响行数 }
   */
  async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const [result] = await pool.execute(sql, values);
    return { id: result.insertId, affectedRows: result.affectedRows };
  },

  /**
   * 更新数据
   * 用法1（原始SQL）: db.update('users', { last_login_at: new Date() }, 'id = ?', [1])
   * 用法2（简写）  : db.update('users', { status: 0 }, { id: 1 })
   */
  async update(table, data, whereOrClause, whereParams = []) {
    if (typeof whereOrClause === 'string') {
      // 原始SQL WHERE子句模式
      const setClause = Object.keys(data).map(k => `${k} = ?`).join(', ');
      const values = [...Object.values(data), ...whereParams];
      const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereOrClause}`;
      const [result] = await pool.execute(sql, values);
      return { affectedRows: result.affectedRows };
    }
    // 简写模式
    const { clause, params } = buildWhere(whereOrClause);
    const setClause = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), ...params];
    const sql = `UPDATE ${table} SET ${setClause} ${clause}`;
    const [result] = await pool.execute(sql, values);
    return { affectedRows: result.affectedRows };
  },

  /**
   * 删除数据
   * 用法1: db.delete('users', 'id = ?', [1])
   * 用法2: db.delete('users', { id: 1 })
   */
  async delete(table, whereOrClause, params = []) {
    if (typeof whereOrClause === 'string') {
      const sql = `DELETE FROM ${table} WHERE ${whereOrClause}`;
      const [result] = await pool.execute(sql, params);
      return { affectedRows: result.affectedRows };
    }
    const { clause, params: whereParams } = buildWhere(whereOrClause);
    const sql = `DELETE FROM ${table} ${clause}`;
    const [result] = await pool.execute(sql, whereParams);
    return { affectedRows: result.affectedRows };
  },

  /**
   * 执行原始SQL
   * 用法: db.query('SELECT * FROM users WHERE id > ?', [5])
   */
  async query(sql, params = []) {
    const [result] = await pool.execute(sql, params);
    return result;
  },

  // 获取连接池
  getPool() {
    return pool;
  },
};

module.exports = db;
