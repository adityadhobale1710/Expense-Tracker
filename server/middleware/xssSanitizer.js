const clean = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (typeof val === 'string') {
        // Basic escaping to block <script> and HTML tags
        // Issue #5 fix: forward-slash (/) is NOT dangerous in HTML text contexts and
        // must NOT be encoded — it would corrupt URLs, JWT tokens, and ISO dates.
        obj[key] = val
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      } else if (typeof val === 'object') {
        clean(val);
      }
    }
  }
  return obj;
};

export const xssSanitizer = (req, res, next) => {
  if (req.body) clean(req.body);
  if (req.query) clean(req.query);
  if (req.params) clean(req.params);
  next();
};
