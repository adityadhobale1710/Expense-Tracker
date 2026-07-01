import asyncHandler from 'express-async-handler';
import Subscription from '../models/Subscription.js';
import { sendSuccess } from '../utils/apiResponse.js';

// @desc    Get all subscriptions
// @route   GET /api/subscriptions
export const getSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.find({ user: req.user._id });
  sendSuccess(res, 200, 'Subscriptions retrieved successfully', subscriptions);
});

// @desc    Create a new subscription
// @route   POST /api/subscriptions
export const createSubscription = asyncHandler(async (req, res) => {
  const { name, cost, billingCycle, renewalDate, reminder } = req.body;
  const subscription = await Subscription.create({
    user: req.user._id,
    name,
    cost,
    billingCycle,
    renewalDate,
    reminder,
  });
  sendSuccess(res, 201, 'Subscription created successfully', subscription);
});

// @desc    Update a subscription
// @route   PUT /api/subscriptions/:id
export const updateSubscription = asyncHandler(async (req, res) => {
  const { name, cost, billingCycle, renewalDate, reminder } = req.body;
  const subscription = await Subscription.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { name, cost, billingCycle, renewalDate, reminder },
    { new: true, runValidators: true }
  );
  if (!subscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }
  sendSuccess(res, 200, 'Subscription updated successfully', subscription);
});

// @desc    Delete a subscription
// @route   DELETE /api/subscriptions/:id
export const deleteSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!subscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }
  sendSuccess(res, 200, 'Subscription deleted successfully');
});
