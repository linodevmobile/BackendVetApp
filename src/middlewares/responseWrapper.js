function responseWrapper(req, res, next) {
  res.ok = (data = null, meta = null, statusCode = 200) => {
    return res.status(statusCode).json({
      data,
      meta,
      error: null,
    });
  };

  res.fail = (code, message, statusCode = 400, details = null) => {
    return res.status(statusCode).json({
      data: null,
      meta: null,
      error: { code, message, details },
    });
  };

  next();
}

module.exports = responseWrapper;
