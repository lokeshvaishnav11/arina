require('dotenv').config();
const bcrypt=require('bcryptjs');
const pool=require('./db');

(async()=>{
  try{
    const username=process.argv[2] || 'admin';
    const password=process.argv[3] || 'ChangeMe123!';
    if(password.length<8) throw new Error('Password must be at least 8 characters');
    const hash=await bcrypt.hash(password,12);
    await pool.execute(
      'INSERT INTO admins(username,password_hash) VALUES(?,?) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash),updated_at=NOW()',
      [username,hash]
    );
    console.log(`Admin ready. Username: ${username}`);
    console.log('Change the password after first login.');
  }catch(e){
    console.error(e.message);
    process.exitCode=1;
  }finally{
    await pool.end();
  }
})();
