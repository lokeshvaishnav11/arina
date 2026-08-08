const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const pool = require('./db');
// const { requireAdmin } = require('./auth');

const router = express.Router();

// Admin auth enable karna ho to:
// router.use(requireAdmin);


// ======================================================
// PROFILE IMAGE UPLOAD SETUP
// ======================================================

const uploadDir = path.join(
  __dirname,
  'public',
  'uploads',
  'profiles'
);

// Folder automatically create ho jayega agar nahi hai
fs.mkdirSync(uploadDir, {
  recursive: true
});

const storage = multer.diskStorage({

  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {

    const ext = path
      .extname(file.originalname)
      .toLowerCase();

    const fileName =
      Date.now() +
      '-' +
      Math.round(Math.random() * 1e9) +
      ext;

    cb(null, fileName);
  }

});


const upload = multer({

  storage: storage,

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: function (req, file, cb) {

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    const allowedExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.webp'
    ];

    const ext = path
      .extname(file.originalname)
      .toLowerCase();

    if (
      !allowedMimeTypes.includes(file.mimetype) ||
      !allowedExtensions.includes(ext)
    ) {

      return cb(
        new Error(
          'Only JPG, JPEG, PNG and WEBP images are allowed'
        )
      );

    }

    cb(null, true);
  }

});


// ======================================================
// DASHBOARD STATS
// ======================================================

router.get('/stats', async (req, res) => {

  try {

    const [[onlineRow]] = await pool.query(
      `
      SELECT COUNT(*) AS c
      FROM users
      WHERE last_seen >= (NOW() - INTERVAL 5 MINUTE)
      `
    );

    const [[regRow]] = await pool.query(
      `
      SELECT COUNT(*) AS c
      FROM users
      `
    );

    const [[todayRow]] = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS v
      FROM payments
      WHERE status = 'paid'
      AND DATE(created_at) = CURDATE()
      `
    );

    const [[revRow]] = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS v
      FROM payments
      WHERE status = 'paid'
      `
    );

    const [[profileRow]] = await pool.query(
      `
      SELECT COUNT(*) AS c
      FROM profiles
      `
    );

    res.json({
      ok: true,

      stats: {
        online: Number(onlineRow.c || 0),
        registered: Number(regRow.c || 0),
        todayPayments: Number(todayRow.v || 0),
        totalRevenue: Number(revRow.v || 0),
        profiles: Number(profileRow.c || 0)
      }
    });

  } catch (e) {

    console.error('Stats error:', e);

    res.status(500).json({
      ok: false,
      error: 'Stats failed'
    });

  }

});


// ======================================================
// GET ALL PROFILES
// ======================================================

router.get('/profiles', async (req, res) => {

  try {

    const [rows] = await pool.query(
      `
      SELECT
        id,
        name,
        age,
        gender,
        country,
        city,
        img_url,
        status,
        updated_at
      FROM profiles
      ORDER BY id DESC
      `
    );

    res.json({
      ok: true,
      profiles: rows
    });

  } catch (e) {

    console.error('Profiles load error:', e);

    res.status(500).json({
      ok: false,
      error: 'Profiles failed'
    });

  }

});


// ======================================================
// ADD NEW PROFILE + MULTER IMAGE
// ======================================================

router.post(
  '/profiles',
  upload.single('image'),

  async (req, res) => {

    try {

      const name = String(
        req.body.name || ''
      ).trim();

      const age = Number(
        req.body.age
      );

      const gender = String(
        req.body.gender || 'Female'
      ).trim();

      const country = String(
        req.body.country || ''
      ).trim();

      const city = String(
        req.body.city || ''
      ).trim();

      const status = String(
        req.body.status || 'online'
      ).trim();


      // -------------------------
      // Validate fields
      // -------------------------

      if (!name) {

        if (req.file) {
          fs.unlink(req.file.path, () => {});
        }

        return res.status(422).json({
          ok: false,
          error: 'Name is required'
        });

      }


      if (
        !Number.isInteger(age) ||
        age < 18 ||
        age > 99
      ) {

        if (req.file) {
          fs.unlink(req.file.path, () => {});
        }

        return res.status(422).json({
          ok: false,
          error: 'Age must be between 18 and 99'
        });

      }


      if (!country) {

        if (req.file) {
          fs.unlink(req.file.path, () => {});
        }

        return res.status(422).json({
          ok: false,
          error: 'Country is required'
        });

      }


      if (!city) {

        if (req.file) {
          fs.unlink(req.file.path, () => {});
        }

        return res.status(422).json({
          ok: false,
          error: 'City is required'
        });

      }


      if (
        ![
          'online',
          'busy',
          'offline'
        ].includes(status)
      ) {

        if (req.file) {
          fs.unlink(req.file.path, () => {});
        }

        return res.status(422).json({
          ok: false,
          error: 'Invalid profile status'
        });

      }


      if (!req.file) {

        return res.status(422).json({
          ok: false,
          error: 'Profile image is required'
        });

      }


      // Database me yahi path save hoga
      const imgUrl =
        '/uploads/profiles/' +
        req.file.filename;


      // -------------------------
      // Insert profile
      // -------------------------

      const [result] = await pool.execute(
        `
        INSERT INTO profiles
        (
          name,
          age,
          gender,
          country,
          city,
          img_url,
          status,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `,
        [
          name,
          age,
          gender,
          country,
          city,
          imgUrl,
          status
        ]
      );


      // Newly inserted profile
      const [rows] = await pool.execute(
        `
        SELECT
          id,
          name,
          age,
          gender,
          country,
          city,
          img_url,
          status,
          updated_at
        FROM profiles
        WHERE id = ?
        `,
        [
          result.insertId
        ]
      );


      res.status(201).json({

        ok: true,

        message:
          'Profile added successfully',

        profile: rows[0]

      });


    } catch (e) {

      console.error(
        'Profile add error:',
        e
      );


      // DB insert fail hua to uploaded file remove
      if (req.file) {

        fs.unlink(
          req.file.path,
          () => {}
        );

      }


      res.status(500).json({
        ok: false,
        error: 'Profile add failed'
      });

    }

  }
);


// ======================================================
// UPDATE PROFILE
// New image optional hai
// ======================================================

router.put(
  '/profiles/:id',
  upload.single('image'),

  async (req, res) => {

    try {

      const id = Number(
        req.params.id
      );

      const name = String(
        req.body.name || ''
      ).trim();

      const age = Number(
        req.body.age
      );

      const gender = String(
        req.body.gender || 'Female'
      ).trim();

      const country = String(
        req.body.country || ''
      ).trim();

      const city = String(
        req.body.city || ''
      ).trim();

      const status = String(
        req.body.status || 'online'
      ).trim();


      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {

        if (req.file) {
          fs.unlink(req.file.path, () => {});
        }

        return res.status(422).json({
          ok: false,
          error: 'Invalid profile ID'
        });

      }


      if (
        !name ||
        !Number.isInteger(age) ||
        age < 18 ||
        age > 99 ||
        !country ||
        !city ||
        ![
          'online',
          'busy',
          'offline'
        ].includes(status)
      ) {

        if (req.file) {
          fs.unlink(req.file.path, () => {});
        }

        return res.status(422).json({
          ok: false,
          error: 'Invalid profile data'
        });

      }


      // Existing profile
      const [existingRows] =
        await pool.execute(
          `
          SELECT
            id,
            img_url
          FROM profiles
          WHERE id = ?
          LIMIT 1
          `,
          [
            id
          ]
        );


      if (!existingRows.length) {

        if (req.file) {
          fs.unlink(req.file.path, () => {});
        }

        return res.status(404).json({
          ok: false,
          error: 'Profile not found'
        });

      }


      const oldProfile =
        existingRows[0];

      let imgUrl =
        oldProfile.img_url;


      // New image selected hai
      if (req.file) {

        imgUrl =
          '/uploads/profiles/' +
          req.file.filename;

      }


      await pool.execute(
        `
        UPDATE profiles
        SET
          name = ?,
          age = ?,
          gender = ?,
          country = ?,
          city = ?,
          img_url = ?,
          status = ?,
          updated_at = NOW()
        WHERE id = ?
        `,
        [
          name,
          age,
          gender,
          country,
          city,
          imgUrl,
          status,
          id
        ]
      );


      // New image successfully DB me save ho gayi
      // ab old image remove kar sakte hain
      if (
        req.file &&
        oldProfile.img_url &&
        oldProfile.img_url.startsWith(
          '/uploads/profiles/'
        )
      ) {

        const oldFileName =
          path.basename(
            oldProfile.img_url
          );

        const oldFilePath =
          path.join(
            uploadDir,
            oldFileName
          );

        fs.unlink(
          oldFilePath,
          () => {}
        );

      }


      const [updatedRows] =
        await pool.execute(
          `
          SELECT
            id,
            name,
            age,
            gender,
            country,
            city,
            img_url,
            status,
            updated_at
          FROM profiles
          WHERE id = ?
          `,
          [
            id
          ]
        );


      res.json({

        ok: true,

        message:
          'Profile updated successfully',

        profile:
          updatedRows[0]

      });


    } catch (e) {

      console.error(
        'Profile update error:',
        e
      );


      if (req.file) {

        fs.unlink(
          req.file.path,
          () => {}
        );

      }


      res.status(500).json({
        ok: false,
        error: 'Profile update failed'
      });

    }

  }
);


// ======================================================
// DELETE PROFILE
// Image bhi delete hogi
// ======================================================

router.delete(
  '/profiles/:id',

  async (req, res) => {

    try {

      const id =
        Number(req.params.id);


      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {

        return res.status(422).json({
          ok: false,
          error: 'Invalid profile ID'
        });

      }


      const [rows] =
        await pool.execute(
          `
          SELECT
            id,
            img_url
          FROM profiles
          WHERE id = ?
          LIMIT 1
          `,
          [
            id
          ]
        );


      if (!rows.length) {

        return res.status(404).json({
          ok: false,
          error: 'Profile not found'
        });

      }


      const profile =
        rows[0];


      await pool.execute(
        `
        DELETE FROM profiles
        WHERE id = ?
        `,
        [
          id
        ]
      );


      if (
        profile.img_url &&
        profile.img_url.startsWith(
          '/uploads/profiles/'
        )
      ) {

        const fileName =
          path.basename(
            profile.img_url
          );

        const filePath =
          path.join(
            uploadDir,
            fileName
          );

        fs.unlink(
          filePath,
          () => {}
        );

      }


      res.json({
        ok: true,
        message:
          'Profile deleted successfully'
      });


    } catch (e) {

      console.error(
        'Profile delete error:',
        e
      );

      res.status(500).json({
        ok: false,
        error: 'Profile delete failed'
      });

    }

  }
);


// ======================================================
// USERS
// ======================================================

router.get('/users', async (req, res) => {

  try {

    const [rows] =
      await pool.query(
        `
        SELECT
          u.id,
          u.name,
          u.email,
          u.last_seen,
          u.created_at,

          COALESCE(
            SUM(
              CASE
                WHEN p.status = 'paid'
                THEN p.amount
                ELSE 0
              END
            ),
            0
          ) AS total_paid

        FROM users u

        LEFT JOIN payments p
          ON p.user_id = u.id

        GROUP BY
          u.id,
          u.name,
          u.email,
          u.last_seen,
          u.created_at

        ORDER BY
          u.created_at DESC

        LIMIT 1000
        `
      );


    res.json({
      ok: true,
      users: rows
    });


  } catch (e) {

    console.error(
      'Users error:',
      e
    );

    res.status(500).json({
      ok: false,
      error: 'Users failed'
    });

  }

});


// ======================================================
// PAYMENTS
// ======================================================

router.get(
  '/payments',
  async (req, res) => {

    try {

      const [rows] =
        await pool.query(
          `
          SELECT
            p.id,
            p.user_id,
            p.purpose,
            p.amount,
            p.status,
            p.provider_ref,
            p.created_at,

            u.name AS user_name,
            u.email

          FROM payments p

          LEFT JOIN users u
            ON u.id = p.user_id

          ORDER BY
            p.created_at DESC

          LIMIT 1000
          `
        );


      res.json({
        ok: true,
        payments: rows
      });


    } catch (e) {

      console.error(
        'Payments error:',
        e
      );

      res.status(500).json({
        ok: false,
        error: 'Payments failed'
      });

    }

  }
);


// ======================================================
// MULTER ERROR HANDLER
// ======================================================

router.use(
  (error, req, res, next) => {

    if (
      error instanceof multer.MulterError
    ) {

      if (
        error.code ===
        'LIMIT_FILE_SIZE'
      ) {

        return res.status(422).json({
          ok: false,
          error:
            'Image maximum size is 5MB'
        });

      }


      return res.status(422).json({
        ok: false,
        error: error.message
      });

    }


    if (error) {

      console.error(
        'Admin API error:',
        error
      );

      return res.status(422).json({
        ok: false,
        error:
          error.message ||
          'Request failed'
      });

    }


    next();
  }
);


module.exports = router;