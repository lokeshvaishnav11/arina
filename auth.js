const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('./db');
// const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req,res)=>{
  try{
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const [rows] = await pool.execute(
      'SELECT id,username,password_hash FROM admins WHERE username=? LIMIT 1',
      [username]
    );
    const admin = rows[0];
    if(!admin || !(await bcrypt.compare(password, admin.password_hash))){
      return res.status(401).json({ok:false,error:'Invalid username or password'});
    }
    req.session.regenerate(err=>{
      if(err) return res.status(500).json({ok:false,error:'Session error'});
      req.session.adminId = admin.id;
      req.session.adminUsername = admin.username;
      res.json({ok:true,username:admin.username});
    });
  }catch(e){
    res.status(500).json({ok:false,error:'Login failed'});
  }
});

router.post('/logout', (req,res)=>{
  req.session.destroy(()=>res.json({ok:true}));
});

router.get('/me', (req,res)=>{
  if(!req.session || !req.session.adminId) return res.json({ok:true,authenticated:false});
  res.json({ok:true,authenticated:true,username:req.session.adminUsername});
});

router.post('/change-password', async (req,res)=>{
  try{
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    if(newPassword.length < 8) return res.status(422).json({ok:false,error:'New password must be at least 8 characters'});
    const [rows] = await pool.execute('SELECT password_hash FROM admins WHERE id=?',[req.session.adminId]);
    if(!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))){
      return res.status(401).json({ok:false,error:'Current password is incorrect'});
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.execute('UPDATE admins SET password_hash=?,updated_at=NOW() WHERE id=?',[hash,req.session.adminId]);
    res.json({ok:true});
  }catch(e){
    res.status(500).json({ok:false,error:'Password update failed'});
  }
});

module.exports = router;
