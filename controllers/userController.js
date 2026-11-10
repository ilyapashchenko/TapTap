exports.getUserRole = async (req, res) => {
    const { initData } = req.body;

    console.log('📥 Получен запрос getUserRole с initData:', initData);

    if (!initData) {
        console.log('⛔ initData отсутствует');
        return res.json({ success: false, error: 'initData missing' });
    }

    const valid = isValid(initData, BOT_TOKEN);
    if (!valid) {
        console.log('⛔ initData невалиден');
        return res.json({ success: false, error: 'Invalid initData' });
    }

    const user = parse(initData).user;
    console.log('✅ Пользователь из initData:', user);

    try {
        const staffResult = await pool.query('SELECT * FROM staff WHERE user_id = $1', [user.id]);

        if (staffResult.rows.length > 0) {
            console.log('👔 Пользователь найден как сотрудник');
            return res.json({ success: true, role: 'staff' });
        }

        console.log('🙋 Пользователь не является сотрудником');
        return res.json({ success: true, role: 'client' });

    } catch (e) {
        console.error('❌ Ошибка при запросе к базе данных:', e);
        return res.json({ success: false, error: e.message });
    }
};

const { isValid, parse } = require('@telegram-apps/init-data-node');
const pool = require('../db/pool');
const BOT_TOKEN = process.env.BOT_TOKEN;


exports.getStaffBookings = async (req, res) => {
    console.log('📥 /api/getStaffBookings вызван');
    const { initData, selectedDate } = req.body;

    if (!initData) {
        console.log('❌ initData отсутствует в теле запроса');
        return res.json({ success: false, error: 'initData missing' });
    }

    if (!selectedDate) {
        console.log('❌ selectedDate отсутствует в теле запроса');
        return res.json({ success: false, error: 'selectedDate missing' });
    }

    console.log('🔍 Проверка валидности initData...');
    const valid = isValid(initData, BOT_TOKEN);
    if (!valid) {
        console.log('❌ initData невалиден');
        return res.json({ success: false, error: 'Invalid initData' });
    }

    let user;
    try {
        user = parse(initData).user;
        console.log('✅ Пользователь распарсен:', user);
    } catch (e) {
        console.log('❌ Ошибка парсинга initData:', e);
        return res.json({ success: false, error: 'Parse initData error' });
    }

    try {
        console.log(`🔍 Поиск сотрудника с user_id = ${user.id} в таблице staff...`);
        const staffResult = await pool.query(`
            SELECT * FROM staff WHERE user_id = $1
        `, [user.id]);

        if (staffResult.rows.length === 0) {
            console.log('❌ Сотрудник не найден в таблице staff');
            return res.json({ success: false, error: 'Staff not found' });
        }

        const placeId = staffResult.rows[0].place_id;
        console.log(`✅ Найден сотрудник. place_id = ${placeId}`);
        console.log(`📅 Фильтруем по дате: ${selectedDate}`);

        console.log(`🔍 Получение записей для place_id = ${placeId} и даты ${selectedDate}...`);

        const bookingsResult = await pool.query(`
            SELECT
              a.appointment_id,
              a.time,
              a.client_name,
              m.name AS master_name,
              STRING_AGG(s.name, ', ') AS services_names
            FROM appointments a
            LEFT JOIN appointment_services aps ON a.appointment_id = aps.appointment_id
            LEFT JOIN services s ON aps.service_id = s.service_id
            LEFT JOIN masters m ON a.master_id = m.master_id
            WHERE a.place_id = $1 AND a.date = $2
            GROUP BY a.appointment_id, a.time, a.client_name, m.name
            ORDER BY a.time
        `, [placeId, selectedDate]);

        console.log(`✅ Найдено записей: ${bookingsResult.rows.length}`);
        console.log('Записи:', bookingsResult.rows);

        return res.json({ success: true, bookings: bookingsResult.rows });

    } catch (e) {
        console.error('🔥 Ошибка при получении записей сотрудника:', e.message, '\n', e.stack);
        return res.json({ success: false, error: e.message });
    }
};



