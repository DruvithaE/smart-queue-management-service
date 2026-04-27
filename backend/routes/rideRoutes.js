const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');

router.get('/', rideController.getAllRides);
router.post('/', rideController.createRide);
router.get('/getRideDetails/:id', rideController.getRideDetails); // assignment spec alias
router.get('/:id', rideController.getRideById);                   // REST standard
router.put('/updateRideStatus/:id', rideController.updateRideStatus); // assignment spec alias
router.put('/:id/status', rideController.updateRideStatus);           // REST standard
router.delete('/:id', rideController.deleteRide);
router.put('/:id', rideController.updateRide);

module.exports = router;