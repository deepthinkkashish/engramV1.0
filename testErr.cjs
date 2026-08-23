try {
  throw new Error("generic::resource_exhausted: You exceeded your current quota");
} catch(apiErr) {
  const errStr = (apiErr.message || "").toLowerCase();
  console.log(errStr.includes('exhausted'));
}
