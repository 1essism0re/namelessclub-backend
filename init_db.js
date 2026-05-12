const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://nameless_ckyr_user:N8AFgYNIKSx1fUXIXUMTZLL9sPtBtHku@dpg-d80q55e7r5hc73bs3lfg-a/nameless_ckyr',
  ssl: false
});

async function initDatabase() {
  try {
    console.log('正在连接数据库...');
    
    // 读取SQL文件
    const sqlPath = path.join(__dirname, 'database', 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // 分割SQL语句并执行
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement + ';');
          console.log('✓ 执行成功');
        } catch (err) {
          // 忽略已存在的错误
          if (!err.message.includes('already exists')) {
            console.log('⚠ 跳过:', err.message.substring(0, 100));
          }
        }
      }
    }
    
    console.log('\n✅ 数据库初始化完成！');
    
    // 验证表是否创建
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.log('\n已创建的表:');
    tables.rows.forEach(row => console.log('  -', row.table_name));
    
  } catch (err) {
    console.error('❌ 初始化失败:', err.message);
  } finally {
    await pool.end();
  }
}

initDatabase();
