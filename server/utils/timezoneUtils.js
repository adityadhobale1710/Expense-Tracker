/**
 * Extracts and computes the correct UTC boundaries for start and end dates
 * based on the user's local timezone offset provided in the request header.
 * 
 * @param {Object} req - Express request object
 * @returns {Object} { start: Date, end: Date }
 */
export const getUserDateRange = (req) => {
  const { startDate, endDate, start: qStart, end: qEnd } = req.query;
  const rawStart = startDate || qStart;
  const rawEnd = endDate || qEnd;
  
  // tzOffset is in minutes (e.g., -330 for IST +05:30)
  // Fallback to server offset if not provided by client
  const tzOffset = req.headers['x-timezone-offset'] 
    ? parseInt(req.headers['x-timezone-offset'], 10) 
    : new Date().getTimezoneOffset();

  let start = rawStart ? new Date(rawStart) : null;
  let end = rawEnd ? new Date(rawEnd) : null;

  // Create a UTC-aligned date representing the user's current local time
  const nowUtc = new Date();
  const userNow = new Date(nowUtc.getTime() - (tzOffset * 60000));

  if (!start || isNaN(start.getTime())) {
    // Start of user's current month
    const startOfUserMonth = new Date(Date.UTC(userNow.getUTCFullYear(), userNow.getUTCMonth(), 1));
    start = new Date(startOfUserMonth.getTime() + (tzOffset * 60000));
  } else {
    // If parsed correctly, use the user's provided Y-M-D aligned to their timezone
    const userStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    start = new Date(userStart.getTime() + (tzOffset * 60000));
  }

  if (!end || isNaN(end.getTime())) {
    // End of user's current month
    const endOfUserMonth = new Date(Date.UTC(userNow.getUTCFullYear(), userNow.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    end = new Date(endOfUserMonth.getTime() + (tzOffset * 60000));
  } else {
    const userEnd = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999));
    end = new Date(userEnd.getTime() + (tzOffset * 60000));
  }

  return { start, end };
};

/**
 * Align a single date to the user's timezone (useful for formatting and aggregation)
 */
export const getUserLocalTime = (date, tzOffset) => {
  return new Date(date.getTime() - (tzOffset * 60000));
};

/**
 * Calculates start and end bounds based on an offset and range type
 * @param {Number} tzOffset in minutes
 * @param {String} type 'month', 'today', 'week', 'last30days'
 */
export const getBoundsForOffset = (tzOffset, type = 'month') => {
  const shift = tzOffset || new Date().getTimezoneOffset();
  const nowUtc = new Date();
  const userNow = new Date(nowUtc.getTime() - (shift * 60000));
  
  let startUser, endUser;
  
  switch (type) {
    case 'today':
      startUser = new Date(Date.UTC(userNow.getUTCFullYear(), userNow.getUTCMonth(), userNow.getUTCDate()));
      endUser = new Date(Date.UTC(userNow.getUTCFullYear(), userNow.getUTCMonth(), userNow.getUTCDate(), 23, 59, 59, 999));
      break;
    case 'week':
      const day = userNow.getUTCDay(); // 0 is Sunday
      startUser = new Date(Date.UTC(userNow.getUTCFullYear(), userNow.getUTCMonth(), userNow.getUTCDate() - day));
      endUser = new Date(Date.UTC(startUser.getUTCFullYear(), startUser.getUTCMonth(), startUser.getUTCDate() + 6, 23, 59, 59, 999));
      break;
    case 'last30days':
      startUser = new Date(Date.UTC(userNow.getUTCFullYear(), userNow.getUTCMonth(), userNow.getUTCDate() - 30));
      endUser = new Date(Date.UTC(userNow.getUTCFullYear(), userNow.getUTCMonth(), userNow.getUTCDate(), 23, 59, 59, 999));
      break;
    case 'month':
    default:
      startUser = new Date(Date.UTC(userNow.getUTCFullYear(), userNow.getUTCMonth(), 1));
      endUser = new Date(Date.UTC(userNow.getUTCFullYear(), userNow.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      break;
  }
  
  return {
    start: new Date(startUser.getTime() + (shift * 60000)),
    end: new Date(endUser.getTime() + (shift * 60000))
  };
};
