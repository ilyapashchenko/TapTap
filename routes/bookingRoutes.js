const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

router.post('/getFreeSlots', bookingController.getFreeSlots);
router.post('/createBooking', bookingController.createBooking);
router.post('/getUserBookings', bookingController.getUserBookings);
router.post('/deleteBooking', bookingController.deleteBooking);
// Отметка "не пришёл"
router.post('/appointments/:id/no_show', bookingController.markNoShow);



module.exports = router;





















// const express = require('express');
// const router = express.Router();
// const bookingController = require('../controllers/bookingController');

// router.post('/getFreeSlots', bookingController.getFreeSlots);
// router.post('/createBooking', bookingController.createBooking);
// router.post('/getUserBookings', bookingController.getUserBookings);
// router.post('/deleteBooking', deleteBooking);



// module.exports = router;
