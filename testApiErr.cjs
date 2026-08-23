const apiErr = {
  error: {
    code: 429,
    message: "Quota exceeded for metric...",
    status: "RESOURCE_EXHAUSTED"
  }
};

const message = apiErr.message || (apiErr.error && apiErr.error.message) || String(apiErr);
console.log("Extracted message:", message);
