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
  if (updates.subscriptionStatus) mappedUpdates.subscription_status = updates.subscriptionStatus;
  if (updates.subscription_status) mappedUpdates.subscription_status = updates.subscription_status;
  if (updates.subscriptionRenewsAt) mappedUpdates.subscription_renews_at = updates.subscriptionRenewsAt;
  if (updates.subscription_renews_at) mappedUpdates.subscription_renews_at = updates.subscription_renews_at;
  if (updates.billingEmail) mappedUpdates.billing_email = updates.billingEmail;
  if (updates.billing_email) mappedUpdates.billing_email = updates.billing_email;
  if (updates.quotaOverrides) mappedUpdates.quota_overrides = updates.quotaOverrides;
  if (updates.quota_overrides) mappedUpdates.quota_overrides = updates.quota_overrides;
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
