// controllers/bookingController.js
// КОНСТАНТЫ
const pool = require('../db/pool');
const { isValid, parse } = require('@telegram-apps/init-data-node');
const BOT_TOKEN = process.env.BOT_TOKEN;




async function getFreeSlots(req, res) {
    const { masterId, serviceId, date } = req.body;

    console.log('📌 [Start] getFreeSlots called with:', { masterId, serviceId, date });

    if (!masterId || !serviceId || !date) {
        console.log('❌ Missing data in request body:', req.body);
        return res.status(400).json({ success: false, error: 'Missing data' });
    }

    try {
        // 1️⃣ Получаем данные услуги (duration и timezone)
        const serviceResult = await pool.query(
            `SELECT duration_minutes, timezone FROM services WHERE service_id = $1`,
            [serviceId]
        );

        if (serviceResult.rows.length === 0) {
            console.log(`❌ Service not found for serviceId=${serviceId}`);
            return res.status(404).json({ success: false, error: 'Service not found' });
        }

        const { duration_minutes: duration, timezone } = serviceResult.rows[0];
        console.log(`[Info] Service info: duration=${duration}, timezone=${timezone}`);

        // 2️⃣ Конвертируем дату в часовой пояс услуги
        const selectedDateUTC = new Date(date + 'T00:00:00Z');
        const selectedDate = new Date(selectedDateUTC.toLocaleString('en-US', { timeZone: timezone }));
        console.log('[Info] selectedDate in timezone:', selectedDate);

        const weekday = selectedDate.getDay(); // 0 = Sunday
        console.log('[Info] Weekday of selected date:', weekday);

        // 3️⃣ Проверяем исключения работы мастера
        const exceptionResult = await pool.query(
            `SELECT start_time, end_time, is_day_off 
             FROM work_exceptions 
             WHERE master_id = $1 AND date = $2`,
            [masterId, date]
        );
        console.log('[SQL] Exception result:', exceptionResult.rows);

        let startTime, endTime;

        if (exceptionResult.rows.length > 0) {
            const { start_time, end_time, is_day_off } = exceptionResult.rows[0];
            if (is_day_off) {
                console.log('[Info] Master has day off on this date');
                return res.json({ success: true, slots: [] });
            }
            startTime = parseTime(start_time);
            endTime = parseTime(end_time);
        } else {
            // 4️⃣ Берем обычный график
            const scheduleResult = await pool.query(
                `SELECT start_time, end_time, is_day_off 
                 FROM work_schedule 
                 WHERE master_id = $1 AND weekday = $2`,
                [masterId, weekday]
            );
            console.log('[SQL] Schedule result:', scheduleResult.rows);

            if (scheduleResult.rows.length === 0 || scheduleResult.rows[0].is_day_off) {
                console.log('[Info] Master has day off in regular schedule');
                return res.json({ success: true, slots: [] });
            }
            startTime = parseTime(scheduleResult.rows[0].start_time);
            endTime = parseTime(scheduleResult.rows[0].end_time);
        }

        // 5️⃣ Получаем занятые записи
        const busyResult = await pool.query(
            `SELECT time, duration FROM appointments 
             WHERE master_id = $1 AND date = $2`,
            [masterId, date]
        );
        console.log('[SQL] Busy slots:', busyResult.rows);

        const busySlots = busyResult.rows.map(row => {
            const [h, m] = row.time.split(':').map(Number);
            const start = h * 60 + m;
            const end = start + row.duration;
            return { start, end };
        });

        // 6️⃣ Генерация свободных слотов
        const now = new Date();
        const nowInTZ = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        const isToday =
            nowInTZ.getFullYear() === selectedDate.getFullYear() &&
            nowInTZ.getMonth() === selectedDate.getMonth() &&
            nowInTZ.getDate() === selectedDate.getDate();

        const currentMinutes = nowInTZ.getHours() * 60 + nowInTZ.getMinutes();
        const freeSlots = [];

        for (let time = startTime; time + duration <= endTime; time += 15) {
            if (isToday && time <= currentMinutes) continue;
            const overlaps = busySlots.some(slot => time < slot.end && time + duration > slot.start);
            if (!overlaps) {
                const hours = Math.floor(time / 60).toString().padStart(2, '0');
                const minutes = (time % 60).toString().padStart(2, '0');
                freeSlots.push(`${hours}:${minutes}`);
            }
        }

        console.log('[Info] Free slots:', freeSlots);
        res.json({ success: true, slots: freeSlots });

    } catch (error) {
        console.error('❌ Error in getFreeSlots:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
}

function parseTime(timeStr) {
    if (!timeStr) return null;
    if (typeof timeStr === 'string') {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    }
    return timeStr.getHours() * 60 + timeStr.getMinutes();
}






// async function getFreeSlots(req, res) {
//     const { masterId, date, duration } = req.body;

//     if (!masterId || !date || !duration) {
//         return res.status(400).json({ success: false, error: 'Missing data' });
//     }

//     try {
//         const selectedDate = new Date(date);
//         const weekday = selectedDate.getDay(); // 0 = воскресенье

//         // 1️⃣ Сначала проверяем исключения
//         const exceptionResult = await pool.query(
//             `SELECT start_time, end_time, is_day_off 
//              FROM work_exceptions 
//              WHERE master_id = $1 AND date = $2`,
//             [masterId, date]
//         );

//         let startTime, endTime;

//         if (exceptionResult.rows.length > 0) {
//             const { start_time, end_time, is_day_off } = exceptionResult.rows[0];
//             if (is_day_off) {
//                 return res.json({ success: true, slots: [] });
//             }
//             startTime = parseTime(start_time);
//             endTime = parseTime(end_time);
//         } else {
//             // 2️⃣ Если исключений нет — берём из шаблона
//             const scheduleResult = await pool.query(
//                 `SELECT start_time, end_time, is_day_off 
//                  FROM work_schedule 
//                  WHERE master_id = $1 AND weekday = $2`,
//                 [masterId, weekday]
//             );

//             if (scheduleResult.rows.length === 0 || scheduleResult.rows[0].is_day_off) {
//                 return res.json({ success: true, slots: [] });
//             }
//             startTime = parseTime(scheduleResult.rows[0].start_time);
//             endTime = parseTime(scheduleResult.rows[0].end_time);
//         }

//         // 3️⃣ Получаем занятые записи
//         const busyResult = await pool.query(
//             `SELECT time, duration FROM appointments
//              WHERE master_id = $1 AND date = $2`,
//             [masterId, date]
//         );

//         const busySlots = busyResult.rows.map(row => {
//             const [hours, minutes] = row.time.split(':').map(Number);
//             const start = hours * 60 + minutes;
//             const end = start + row.duration;
//             return { start, end };
//         });

//         // 4️⃣ Генерация свободных слотов
//         const now = new Date();
//         const isToday =
//             now.getFullYear() === selectedDate.getFullYear() &&
//             now.getMonth() === selectedDate.getMonth() &&
//             now.getDate() === selectedDate.getDate();

//         const currentMinutes = now.getHours() * 60 + now.getMinutes();
//         const freeSlots = [];

//         for (let time = startTime; time + duration <= endTime; time += 15) {
//             if (isToday && time <= currentMinutes) continue;

//             const overlaps = busySlots.some(slot =>
//                 time < slot.end && time + duration > slot.start
//             );

//             if (!overlaps) {
//                 const hours = Math.floor(time / 60).toString().padStart(2, '0');
//                 const minutes = (time % 60).toString().padStart(2, '0');
//                 freeSlots.push(`${hours}:${minutes}`);
//             }
//         }

//         res.json({ success: true, slots: freeSlots });

//     } catch (error) {
//         console.error('❌ Ошибка при получении слотов:', error);
//         res.status(500).json({ success: false, error: 'Database error' });
//     }
// }

// function parseTime(timeStr) {
//     if (!timeStr) return null;
//     if (typeof timeStr === 'string') {
//         const [h, m] = timeStr.split(':').map(Number);
//         return h * 60 + m;
//     }
//     return timeStr.getHours() * 60 + timeStr.getMinutes();
// }




function extractTelegramUserId(initData) {
    const valid = isValid(initData, BOT_TOKEN);
    if (!valid) {
        throw new Error('Невалидный initData');
    }
    const user = parse(initData).user;
    return user.id;
}


// СЕРВЕРНАЯ РУЧКА ДЛЯ ЗАПИСИ


async function createBooking(req, res) {
    try {
        const { initData, masterId, date, time, services } = req.body;

        if (!initData || !masterId || !date || !time || !services || services.length === 0) {
            return res.status(400).json({ success: false, error: 'Некорректные данные' });
        }

        // Проверка initData
        const valid = isValid(initData, BOT_TOKEN);
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Невалидный initData' });
        }

        const user = parse(initData).user;
        const clientId = user.id;

        // Определяем client_name
        let clientName = "неизвестный";
        if (user.username) {
            clientName = `@${user.username}`;
        } else if (user.first_name || user.last_name) {
            clientName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        }

        // Получаем place_id по masterId
        const placeResult = await pool.query(
            `SELECT place_id FROM masters WHERE master_id = $1`,
            [masterId]
        );

        if (placeResult.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Мастер не найден' });
        }

        const placeId = placeResult.rows[0].place_id;
        const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

        // Проверяем, нет ли пересечения с занятыми слотами
        const conflictQuery = `
            SELECT 1 FROM appointments
            WHERE master_id = $1
              AND date = $2
              AND time < ($3::time + ($4 || ' minutes')::interval)
              AND (time + (duration || ' minutes')::interval) > $3::time
            LIMIT 1
        `;
        const conflictResult = await pool.query(conflictQuery, [masterId, date, time, totalDuration]);

        if (conflictResult.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Выбранное время уже занято' });
        }

        // Добавляем запись
        const insertAppointment = await pool.query(
            `INSERT INTO appointments (master_id, place_id, date, time, duration, client_id, client_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING appointment_id`,
            [masterId, placeId, date, time, totalDuration, clientId, clientName]
        );

        const appointmentId = insertAppointment.rows[0].appointment_id;

        // Вставляем связи в appointment_services
        for (const service of services) {
            await pool.query(
                `INSERT INTO appointment_services (appointment_id, service_id)
                 VALUES ($1, $2)`,
                [appointmentId, service.id]
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка при создании записи:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
}






// async function createBooking(req, res) {
//     console.log('📥 Получен запрос на создание записи');

//     try {
//         const { initData, masterId, date, time, services } = req.body;

//         console.log('🔍 Данные запроса:', { masterId, date, time, services });

//         if (!initData || !masterId || !date || !time || !services || services.length === 0) {
//             return res.status(400).json({ success: false, error: 'Некорректные данные' });
//         }

//         // 🔐 Проверка initData
//         const valid = isValid(initData, BOT_TOKEN);
//         if (!valid) {
//             return res.status(401).json({ success: false, error: 'Невалидный initData' });
//         }

//         const user = parse(initData).user;
//         console.log('👤 Пользователь из initData:', user);

//         const clientId = user.id;

//         // 🧾 Определяем client_name
//         let clientName = "неизвестный";

//         if (user.username) {
//             clientName = `@${user.username}`;
//         } else if (user.first_name || user.last_name) {
//             clientName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
//         }

//         console.log('👤 Имя клиента для записи:', clientName);

//         // 🔎 Получаем place_id по masterId
//         const placeResult = await pool.query(
//             `SELECT place_id FROM masters WHERE master_id = $1`,
//             [masterId]
//         );

//         if (placeResult.rows.length === 0) {
//             return res.status(400).json({ success: false, error: 'Мастер не найден' });
//         }

//         const placeId = placeResult.rows[0].place_id;

//         const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

//         // ✅ Добавляем запись и получаем appointment_id
//         const insertAppointment = await pool.query(
//             `INSERT INTO appointments (master_id, place_id, date, time, duration, client_id, client_name)
//              VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING appointment_id`,
//             [masterId, placeId, date, time, totalDuration, clientId, clientName]
//         );

//         const appointmentId = insertAppointment.rows[0].appointment_id;

//         // 🔁 Вставляем связи в appointment_services
//         for (const service of services) {
//             await pool.query(
//                 `INSERT INTO appointment_services (appointment_id, service_id)
//                  VALUES ($1, $2)`,
//                 [appointmentId, service.id]
//             );
//         }

//         res.json({ success: true });

//     } catch (error) {
//         console.error('❌ Ошибка при создании записи:', error);
//         res.status(500).json({ success: false, error: 'Ошибка сервера' });
//     }
// }




// УДАЛЕНИЕ ЗАПИСИ
async function deleteBooking(req, res) {
    try {
        const { appointmentId, initData } = req.body;

        if (!appointmentId || !initData) {
            return res.status(400).json({ success: false, error: 'appointmentId и initData обязательны' });
        }

        // Получаем userId из initData
        let userId;
        try {
            userId = extractTelegramUserId(initData);
        } catch (err) {
            return res.status(401).json({ success: false, error: 'Невалидный initData' });
        }

        // Проверяем, что запись принадлежит пользователю
        const check = await pool.query(
            `SELECT appointment_id FROM appointments 
             WHERE appointment_id = $1 AND client_id = $2`,
            [appointmentId, userId]
        );

        if (check.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'Запись не найдена или нет прав на удаление' });
        }

        // Удаляем связанные услуги
        await pool.query(
            `DELETE FROM appointment_services WHERE appointment_id = $1`,
            [appointmentId]
        );

        // Удаляем саму запись
        await pool.query(
            `DELETE FROM appointments WHERE appointment_id = $1`,
            [appointmentId]
        );

        res.json({ success: true, message: 'Запись успешно удалена' });

    } catch (error) {
        console.error('Ошибка при удалении записи:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
}













// ПОДГРУЗКА ЗАПИСЕЙ ВО ВТОРОМ ОКНЕ
async function getUserBookings(req, res) {
    const { initData } = req.body;

    if (!initData) {
        return res.status(400).json({ success: false, error: 'initData is required' });
    }

    try {
        const tgUserId = extractTelegramUserId(initData);

        const result = await pool.query(`
            SELECT 
                a.appointment_id,
                a.date,
                a.time,
                a.duration,
                m.name AS master_name,
                array_agg(s.name ORDER BY s.name) AS services
            FROM appointments a
            JOIN masters m ON a.master_id = m.master_id
            JOIN appointment_services aps ON aps.appointment_id = a.appointment_id
            JOIN services s ON aps.service_id = s.service_id
            WHERE a.client_id = $1
            GROUP BY a.appointment_id, a.date, a.time, a.duration, m.name
            ORDER BY a.date, a.time
        `, [tgUserId]);

        res.json({
            success: true,
            userId: tgUserId,   // ← теперь фронт знает id пользователя
            bookings: result.rows
        });
    } catch (error) {
        console.error('Ошибка при получении записей:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
}


// ОТМЕТКА "НЕ ПРИШЁЛ"
async function markNoShow(req, res) {

    console.log('📝 markNoShow вызван');
    console.log('req.params.id:', req.params.id);
    console.log('req.body:', req.body);
    try {
        const appointmentId = req.params.id;

        if (!appointmentId) {
            return res.status(400).json({ success: false, error: 'appointmentId обязателен' });
        }

        // Обновляем запись
        await pool.query(
            `UPDATE appointments SET no_show = TRUE WHERE appointment_id = $1`,
            [appointmentId]
        );

        console.log(`🚫 Клиент по записи ${appointmentId} отмечен как "не пришёл"`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка при отметке "не пришёл":', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера при обновлении' });
    }
}







module.exports = { getFreeSlots, createBooking, getUserBookings, deleteBooking, markNoShow };
