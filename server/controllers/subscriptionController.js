import asyncHandler from 'express-async-handler';
import Subscription from '../models/Subscription.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { invalidateAICache, CACHE_MODULES } from '../utils/CacheInvalidator.js';

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

  // E1 fix: validate required fields before persisting
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400);
    throw new Error('Subscription name is required');
  }

  const numCost = Number(cost);
  if (isNaN(numCost) || numCost <= 0) {
    res.status(400);
    throw new Error('Subscription cost must be a positive number');
  }

  const validCycles = ['monthly', 'yearly', 'weekly', 'quarterly'];
  if (!billingCycle || !validCycles.includes(billingCycle)) {
    res.status(400);
    throw new Error(`Billing cycle must be one of: ${validCycles.join(', ')}`);
  }

  if (!renewalDate || isNaN(new Date(renewalDate).getTime())) {
    res.status(400);
    throw new Error('A valid renewal date is required');
  }

  const subscription = await Subscription.create({
    user: req.user._id,
    name: name.trim(),
    cost: numCost,
    billingCycle,
    renewalDate,
    reminder: typeof reminder === 'boolean' ? reminder : false,
  });
  await invalidateAICache(req.user._id, CACHE_MODULES.SUBSCRIPTIONS);
  sendSuccess(res, 201, 'Subscription created successfully', subscription);
});

// @desc    Update a subscription
// @route   PUT /api/subscriptions/:id
export const updateSubscription = asyncHandler(async (req, res) => {
  const { name, cost, billingCycle, renewalDate, reminder } = req.body;

  // E2 fix: only include defined fields in update to prevent overwriting existing values with undefined
  const updateData = {};
  if (name !== undefined) updateData.name = typeof name === 'string' ? name.trim() : name;
  if (cost !== undefined) {
    const numCost = Number(cost);
    if (isNaN(numCost) || numCost <= 0) {
      res.status(400);
      throw new Error('Subscription cost must be a positive number');
    }
    updateData.cost = numCost;
  }
  if (billingCycle !== undefined) updateData.billingCycle = billingCycle;
  if (renewalDate !== undefined) updateData.renewalDate = renewalDate;
  if (reminder !== undefined) updateData.reminder = reminder;

  const subscription = await Subscription.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    updateData,
    { new: true, runValidators: true }
  );
  if (!subscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }
  await invalidateAICache(req.user._id, CACHE_MODULES.SUBSCRIPTIONS);
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
  await invalidateAICache(req.user._id, CACHE_MODULES.SUBSCRIPTIONS);
  sendSuccess(res, 200, 'Subscription deleted successfully');
});
