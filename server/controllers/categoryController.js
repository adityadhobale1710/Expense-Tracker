import asyncHandler from 'express-async-handler';
import Category from '../models/Category.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getCategories = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const filter = { user: req.user._id };
  if (type) filter.type = type;
  const categories = await Category.find(filter).sort({ name: 1 });
  sendSuccess(res, 200, 'Categories fetched', categories);
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create({ ...req.body, user: req.user._id });
  sendSuccess(res, 201, 'Category created', category);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true }
  );
  if (!category) { res.status(404); throw new Error('Category not found'); }
  sendSuccess(res, 200, 'Category updated', category);
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!category) { res.status(404); throw new Error('Category not found'); }
  sendSuccess(res, 200, 'Category deleted');
});
