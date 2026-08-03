export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => {
      const field = d.path[0];
      if (field === 'category') return { field, message: 'Please select a category.' };
      if (field === 'amount') return { field, message: 'Please enter a valid amount.' };
      if (field === 'date') return { field, message: 'Please select a date.' };
      if (field === 'title') return { field, message: 'Please enter a title.' };
      if (field === 'paymentMethod') return { field, message: 'Please select a payment method.' };
      return { field: d.path.join('.'), message: d.message };
    });

    // Deduplicate by message
    const seen = new Set();
    const uniqueErrors = errors.filter((e) => {
      if (seen.has(e.message)) return false;
      seen.add(e.message);
      return true;
    });

    res.status(400);
    // Attach details so errorHandler can surface them as the `errors` array
    const err = new Error(uniqueErrors.map((e) => e.message).join(', '));
    err.errors = uniqueErrors;
    throw err;
  }
  next();
};
