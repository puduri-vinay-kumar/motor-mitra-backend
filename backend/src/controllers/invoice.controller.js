const Invoice = require('../models/Invoice');
const Motor = require('../models/Motor');
const Membership = require('../models/Membership');
const { v4: uuidv4 } = require('uuid');

const PRICE_PER_MOTOR = 10;
const GST_PERCENT = 5;

exports.generateInvoice = async (req, res) => {
  try {
    const farmerId = req.user.id;

    const motors = await Motor.find({
      farmerId,
      status: 'PENDING'
    });

    if (motors.length === 0) {
      return res.status(400).json({ message: 'No pending motors found' });
    }

    const baseAmount = motors.length * PRICE_PER_MOTOR;
    const gstAmount = (baseAmount * GST_PERCENT) / 100;
    const totalAmount = baseAmount + gstAmount;

    const membership = await Membership.create({
      farmerId,
      motorCount: motors.length,
      amountWithoutGst: baseAmount,
      gstAmount,
      totalAmount,
      status: 'PENDING'
    });

    const invoice = await Invoice.create({
      invoiceNumber: 'INV-' + uuidv4().slice(0, 8).toUpperCase(),
      farmerId,
      membershipId: membership._id,
      motorIds: motors.map(m => m._id),   //added ID
      motorsSnapshot: motors.map(m => ({
        motorName: m.motorName,
        hp: m.hp,
        company: m.company,
        photoUrl: m.photoUrl,
        location: m.location
      })),
      baseAmount,
      gstAmount,
      totalAmount
    });

    await Motor.updateMany(
      //{farmerId, status: 'PENDING'},
      {_id: {$in: motors.map(m => m._id )}},
      {status:'INVOICED'}
    );

    res.json({
      invoice,
      membership
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
