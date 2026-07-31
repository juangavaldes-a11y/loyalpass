function mapBusinessUpdates(updates = {}) {
  const mappedUpdates = {};
  if (updates.name) mappedUpdates.name = updates.name;
  if (updates.logoUrl) mappedUpdates.logo_url = updates.logoUrl;
  if (updates.brandColor) mappedUpdates.brand_color = updates.brandColor;
  if (updates.textColor) mappedUpdates.text_color = updates.textColor;
  if (updates.logo_url) mappedUpdates.logo_url = updates.logo_url;
  if (updates.brand_color) mappedUpdates.brand_color = updates.brand_color;
  if (updates.text_color) mappedUpdates.text_color = updates.text_color;
  if (updates.plan) mappedUpdates.plan = updates.plan;
  if (updates.onboardingStatus) mappedUpdates.onboarding_status = updates.onboardingStatus;
  if (updates.onboarding_status) mappedUpdates.onboarding_status = updates.onboarding_status;
  if (updates.trialEndsAt) mappedUpdates.trial_ends_at = updates.trialEndsAt;
  if (updates.trial_ends_at) mappedUpdates.trial_ends_at = updates.trial_ends_at;
  return mappedUpdates;
}

function mapCustomerUpdates(updates = {}) {
  const mappedUpdates = {};
  if (updates.name) mappedUpdates.name = updates.name;
  if (updates.email) mappedUpdates.email = updates.email;
  return mappedUpdates;
}

module.exports = {
  mapBusinessUpdates,
  mapCustomerUpdates,
};
