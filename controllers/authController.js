const { isValid, parse } = require('@telegram-apps/init-data-node');
const pool = require('../db/pool');

const BOT_TOKEN = process.env.BOT_TOKEN;

async function authHandler(req, res) {
  const { initData } = req.body;

  if (!initData) {
    console.log('[Auth] Ошибка: initData отсутствует');
    return res.status(400).json({ success: false, error: 'initData is missing' });
  }

  const valid = isValid(initData, BOT_TOKEN);

  if (!valid) {
    console.log('[Auth] Ошибка: initData не валиден');
    return res.status(401).json({ success: false, error: 'Invalid initData' });
  }

  const user = parse(initData).user;
  const userId = user.id;
  console.log('[Auth] Успешная аутентификация пользователя:', user);

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    console.log(`[Auth] Найдено записей о пользователе ${userId}:`, rows.length);

    if (rows.length === 0) {
      console.log(`[Auth] Новый пользователь ${userId}, создаём запись...`);

      await pool.query(
        `INSERT INTO users (user_id, place_1, place_2, place_3, place_4, place_5, place_6, place_7, place_8, place_9, place_10) 
         VALUES ($1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`,
        [userId]
      );
      console.log('[Auth] Запись о новом пользователе добавлена в БД.');

      // Приветственное сообщение
      try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: userId,
            text: `👋 Привет, ${user.first_name || 'друг'}! Спасибо за регистрацию!`,
          }),
        });

        const data = await response.json();
        console.log('[Auth] Ответ от Telegram API:', data);

        if (!data.ok) {
          console.warn('[Auth] Не удалось отправить приветственное сообщение:', data.description);
        }
      } catch (sendErr) {
        console.error('[Auth] Ошибка при отправке приветственного сообщения:', sendErr);
      }

      return res.json({
        success: true,
        user,
        places: [],
      });

    } else {
      console.log(`[Auth] Существующий пользователь ${userId}, загружаем его места...`);
      const userPlaces = rows[0];

      const placesIds = [];
      for (let i = 1; i <= 10; i++) {
        const place = userPlaces[`place_${i}`];
        if (place) placesIds.push(place);
      }

      console.log(`[Auth] ID привязанных мест:`, placesIds);

      let placesDetails = [];
      if (placesIds.length > 0) {
        const resPlaces = await pool.query(
          'SELECT * FROM places WHERE place_id = ANY($1)',
          [placesIds]
        );
        placesDetails = resPlaces.rows;
        console.log('[Auth] Загружены детали мест:', placesDetails);
      }

      return res.json({
        success: true,
        user,
        places: placesDetails,
      });
    }
  } catch (error) {
    console.error('[Auth] Ошибка работы с БД:', error);
    return res.status(500).json({ success: false, error: 'Database error' });
  }
}






async function addPlaceById(req, res) {
  const { initData, placeId } = req.body;

  if (!initData || !placeId) {
    return res.status(400).json({ success: false, error: 'Missing data' });
  }

  const valid = isValid(initData, BOT_TOKEN);

  if (!valid) {
    return res.status(401).json({ success: false, error: 'Invalid initData' });
  }

  const user = parse(initData).user;
  const userId = user.id;

  try {
    // Проверим, существует ли placeId в таблице places
    const placeCheck = await pool.query('SELECT * FROM places WHERE place_id = $1', [placeId]);

    if (placeCheck.rows.length === 0) {
      return res.json({ success: false, error: 'Сервис с таким ID не найден' });
    }

    // Получаем текущие места пользователя
    const userRow = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);

    if (userRow.rows.length === 0) {
      return res.json({ success: false, error: 'Пользователь не найден' });
    }

    const userPlaces = userRow.rows[0];

    // Проверка, добавлен ли уже такой placeId
    for (let i = 1; i <= 10; i++) {
      if (userPlaces[`place_${i}`] === placeId) {
        return res.json({ success: false, error: 'Этот сервис уже добавлен' });
      }
    }

    // Найдём первую свободную колонку place_1..place_10
    for (let i = 1; i <= 10; i++) {
      if (!userPlaces[`place_${i}`]) {
        await pool.query(`UPDATE users SET place_${i} = $1 WHERE user_id = $2`, [placeId, userId]);
        return res.json({ success: true });
      }
    }

    return res.json({ success: false, error: 'У вас уже максимальное количество сервисов (10)' });

  } catch (error) {
    console.error('DB error при добавлении места:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
}

async function deletePlace(req, res) {
  const { initData, placeId } = req.body;

  if (!initData || !placeId) {
    return res.status(400).json({ success: false, error: 'Missing data' });
  }

  const valid = isValid(initData, BOT_TOKEN);
  if (!valid) {
    return res.status(401).json({ success: false, error: 'Invalid initData' });
  }

  const user = parse(initData).user;
  const userId = user.id;

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    const userRow = rows[0];
    let updated = false;

    for (let i = 1; i <= 10; i++) {
      if (userRow[`place_${i}`] == placeId) {
        await pool.query(`UPDATE users SET place_${i} = NULL WHERE user_id = $1`, [userId]);
        updated = true;
        break;
      }
    }

    if (updated) {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: 'У вас нет такого сервиса' });
    }

  } catch (error) {
    console.error('Ошибка при удалении сервиса:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
}




module.exports = { authHandler, addPlaceById, deletePlace };
