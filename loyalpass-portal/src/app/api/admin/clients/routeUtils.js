export function validateRequiredBusinessId(payload) {
  if (!payload?.businessId) {
    return {
      error: {
        status: 400,
        message: 'businessId is required',
      },
    };
  }

  return { error: null };
}
