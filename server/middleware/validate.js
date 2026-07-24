export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => {
      const field = d.path[0];
      if (field === 'category') return 'Please select a category.';
      if (field === 'amount') return 'Please enter a valid amount.';
      if (field === 'date') return 'Please select a date.';
      if (field === 'title') return 'Please enter a title.';
      if (field === 'paymentMethod') return 'Please select a payment method.';
      return d.message;
    });
    const uniqueErrors = Array.from(new Set(errors));
    res.status(400);
    throw new Error(uniqueErrors.join(', '));
  }
  next();
};
