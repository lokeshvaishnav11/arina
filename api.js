const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const crypto = require('crypto');

const pool = require('./db');

const router = express.Router();


// ======================================================
// GET PUBLIC PROFILES
// ======================================================

router.get('/profiles', async (req, res) => {

  try {

    const [rows] = await pool.query(`
      SELECT
        id,
        name,
        age,
        gender,
        country,
        city,
        img_url,
        status
      FROM profiles
      ORDER BY id DESC
    `);

    res.json({
      ok: true,
      profiles: rows
    });

  } catch (e) {

    console.error(
      'Profiles API error:',
      e
    );

    res.status(500).json({
      ok: false,
      error: 'Profiles unavailable'
    });

  }

});


// ======================================================
// USER HEARTBEAT
// ======================================================

router.post('/heartbeat', async (req, res) => {

  try {

    const userId =
      Number(req.body.userId || 0);


    if (userId > 0) {

      await pool.execute(
        `
        UPDATE users
        SET last_seen = NOW()
        WHERE id = ?
        `,
        [userId]
      );

    }


    res.json({
      ok: true
    });


  } catch (e) {

    console.error(
      'Heartbeat API error:',
      e
    );

    res.status(500).json({
      ok: false,
      error: 'Heartbeat failed'
    });

  }

});


// ======================================================
// LG PAY HTTP POST
// ======================================================

async function http_post(
  url,
  data = {}
) {

  try {

    const response =
      await axios.post(
        url,
        querystring.stringify(data),
        {
          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded'
          },

          timeout: 120000
        }
      );


    return response.data;


  } catch (error) {

    if (error.response) {

      console.error(
        'LG Pay response error:',
        error.response.status,
        error.response.data
      );


      throw new Error(
        'LG Pay server error'
      );

    }


    console.error(
      'LG Pay HTTP error:',
      error.message
    );


    throw new Error(
      `HTTP POST error: ${error.message}`
    );

  }

}


// ======================================================
// CREATE UNIQUE ORDER ID
// ======================================================

function getRechargeOrderId() {

  const date =
    new Date();


  const year =
    date.getUTCFullYear();


  const month =
    String(
      date.getUTCMonth() + 1
    ).padStart(2, '0');


  const day =
    String(
      date.getUTCDate()
    ).padStart(2, '0');


  const random =
    Math.floor(
      Math.random() *
      (
        99999999999999 -
        10000000000000 +
        1
      )
    ) +
    10000000000000;


  return (
    year +
    month +
    day +
    Date.now() +
    random
  );

}


// ======================================================
// LG PAY MD5 SIGN
// ======================================================

function md5_sign(
  data,
  key
) {

  const cleanData = {};


  Object.keys(data)
    .forEach(k => {

      const value =
        data[k];


      if (
        value !== undefined &&
        value !== null &&
        String(value) !== ''
      ) {

        cleanData[k] =
          value;

      }

    });


  const sortedKeys =
    Object.keys(cleanData)
      .sort();


  const queryString =
    sortedKeys
      .map(
        k =>
          `${k}=${cleanData[k]}`
      )
      .join('&');


  const stringToSign =
    `${queryString}&key=${key}`;


  const md5 =
    crypto
      .createHash('md5')
      .update(
        stringToSign.trim(),
        'utf8'
      )
      .digest('hex');


  return md5.toUpperCase();

}


// ======================================================
// CREATE LG PAY PAYMENT
// IMPORTANT:
// DB me pending/recharge payment save NAHI hogi.
// Sirf LG Pay ko request jayegi.
// ======================================================

router.post(
  '/payments/create',
  async (req, res) => {

    try {

      const amount =
        Number(
          req.body.amount || 0
        );


      const kind =
        String(
          req.body.kind || ''
        ).trim();


      const profileId =
        String(
          req.body.profileId || ''
        ).trim();


      const description =
        String(
          req.body.description ||
          'Arina Web Call'
        ).trim();


      const planId =
        String(
          req.body.planId || ''
        ).trim();


      const phone =
        String(
          req.body.phone || ''
        )
        .replace(/\D/g, '');


      // =========================================
      // Amount validation
      // =========================================

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {

        return res.status(422).json({
          ok: false,
          error: 'Invalid amount'
        });

      }


      /*
        IMPORTANT:
        Browser se arbitrary amount accept mat karo.

        Tumhari current website ke prices:
        R$10
        R$13
        R$16
        R$18
        R$28
        R$49
        R$101
      */

     


      // =========================================
      // ENV CONFIG
      // =========================================

      const appId =
       'PKR3313';


      const secretKey =
       "LfqJcpuHgw9sYMoCB0Ya5yhTiVfvkUAX";


      const tradeType =
        'PKRPH-EASY';


      const notifyUrl =
       'https://apii.vkmster.com/api/callback';


      if (
        !appId ||
        !secretKey ||
        !tradeType ||
        !notifyUrl
      ) {

        console.error(
          'LG Pay configuration missing'
        );


        return res.status(500).json({
          ok: false,
          error:
            'Payment gateway is not configured'
        });

      }


      // =========================================
      // ORDER
      // =========================================

      const orderSn =
        getRechargeOrderId();


      /*
        LG Pay me amount smallest unit me.
        Example:
        R$10 => 1000
      */

      const money =
        Math.round(
          amount * 100
        );


      // =========================================
      // REMARK
      // =========================================

      const remark =
        JSON.stringify({
          kind,
          profileId,
          planId,
          phone,
          description
        }).slice(0, 200);


      // =========================================
      // CLIENT IP
      // =========================================

      const forwarded =
        req.headers[
          'x-forwarded-for'
        ];


      const clientIp =
        forwarded
          ? String(forwarded)
              .split(',')[0]
              .trim()
          : req.socket.remoteAddress ||
            '127.0.0.1';


      // =========================================
      // LG PAY PARAMETERS
      // =========================================

      const params = {

        app_id:
          appId,

        trade_type:
          tradeType,

        order_sn:
          orderSn,

        money:
          money,

        notify_url:
          notifyUrl,

        ip:
          clientIp,

        remark:
          remark

      };


      // =========================================
      // SIGN
      // =========================================

      params.sign =
        md5_sign(
          params,
          secretKey
        );


      console.log(
        'Creating LG Pay order:',
        {
          orderSn,
          amount,
          money,
          kind,
          profileId
        }
      );


      // =========================================
      // CALL LG PAY
      // =========================================

      const lgResponse =
        await http_post(
          'https://www.lg-pay.com/api/order/create',
          params
        );


      console.log(
        'LG Pay response:',
        lgResponse
      );


      // =========================================
      // CHECK RESPONSE
      // =========================================

      if (
        !lgResponse ||
        Number(
          lgResponse.status
        ) !== 1 ||
        !lgResponse.data ||
        !lgResponse.data.pay_url
      ) {

        return res
          .status(502)
          .json({

            ok: false,

            error:
              lgResponse?.msg ||
              'Payment gateway rejected the order'

          });

      }


      // =========================================
      // RETURN ONLY PAY URL
      // =========================================

      res.json({

        ok: true,

        orderSn:
          orderSn,

        payUrl:
          lgResponse.data.pay_url

      });


    } catch (e) {

      console.error(
        'LG Pay payment creation error:',
        e
      );


      res.status(500).json({

        ok: false,

        error:
          'Payment creation failed'

      });

    }

  }
);


router.post(
  '/payments/create/one',
  async (req, res) => {

    try {

      const amount =
        Number(
          req.body.amount || 0
        );


      const kind =
        String(
          req.body.kind || ''
        ).trim();


      const profileId =
        String(
          req.body.profileId || ''
        ).trim();


      const description =
        String(
          req.body.description ||
          'Arina Web Call'
        ).trim();


      const planId =
        String(
          req.body.planId || ''
        ).trim();


      const phone =
        String(
          req.body.phone || ''
        )
        .replace(/\D/g, '');


      // =========================================
      // Amount validation
      // =========================================

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {

        return res.status(422).json({
          ok: false,
          error: 'Invalid amount'
        });

      }


      /*
        IMPORTANT:
        Browser se arbitrary amount accept mat karo.

        Tumhari current website ke prices:
        R$10
        R$13
        R$16
        R$18
        R$28
        R$49
        R$101
      */

     


      // =========================================
      // ENV CONFIG
      // =========================================

      const appId =
       'PKR3248';


      const secretKey =
       "UjNje5bSYAlRALt7x32psLTRYU1w799";


      const tradeType =
        'PKRPH';


      const notifyUrl =
       'https://apii.vkmster.com/api/callback';


      if (
        !appId ||
        !secretKey ||
        !tradeType ||
        !notifyUrl
      ) {

        console.error(
          'LG Pay configuration missing'
        );


        return res.status(500).json({
          ok: false,
          error:
            'Payment gateway is not configured'
        });

      }


      // =========================================
      // ORDER
      // =========================================

      const orderSn =
        getRechargeOrderId();


      /*
        LG Pay me amount smallest unit me.
        Example:
        R$10 => 1000
      */

      const money =
        Math.round(
          amount * 100
        );


      // =========================================
      // REMARK
      // =========================================

      const remark =
        JSON.stringify({
          kind,
          profileId,
          planId,
          phone,
          description
        }).slice(0, 200);


      // =========================================
      // CLIENT IP
      // =========================================

      const forwarded =
        req.headers[
          'x-forwarded-for'
        ];


      const clientIp =
        forwarded
          ? String(forwarded)
              .split(',')[0]
              .trim()
          : req.socket.remoteAddress ||
            '127.0.0.1';


      // =========================================
      // LG PAY PARAMETERS
      // =========================================

      const params = {

        app_id:
          appId,

        trade_type:
          tradeType,

        order_sn:
          orderSn,

        money:
          money,

        notify_url:
          notifyUrl,

        ip:
          clientIp,

        remark:
          remark

      };


      // =========================================
      // SIGN
      // =========================================

      params.sign =
        md5_sign(
          params,
          secretKey
        );


      console.log(
        'Creating LG Pay order:',
        {
          orderSn,
          amount,
          money,
          kind,
          profileId
        }
      );


      // =========================================
      // CALL LG PAY
      // =========================================

      const lgResponse =
        await http_post(
          'https://www.lg-pay.com/api/order/create',
          params
        );


      console.log(
        'LG Pay response:',
        lgResponse
      );


      // =========================================
      // CHECK RESPONSE
      // =========================================

      if (
        !lgResponse ||
        Number(
          lgResponse.status
        ) !== 1 ||
        !lgResponse.data ||
        !lgResponse.data.pay_url
      ) {

        return res
          .status(502)
          .json({

            ok: false,

            error:
              lgResponse?.msg ||
              'Payment gateway rejected the order'

          });

      }


      // =========================================
      // RETURN ONLY PAY URL
      // =========================================

      res.json({

        ok: true,

        orderSn:
          orderSn,

        payUrl:
          lgResponse.data.pay_url

      });


    } catch (e) {

      console.error(
        'LG Pay payment creation error:',
        e
      );


      res.status(500).json({

        ok: false,

        error:
          'Payment creation failed'

      });

    }

  }
);


module.exports = router;