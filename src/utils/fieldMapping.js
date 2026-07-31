function mapBusinessUpdates(updates = {}) {
  const mappedUpdates = {};
  if (updates.name) mappedUpdates.name = updates.name;
  if (updates.logoUrl) mappedUpdates.logo_url = updates.logoUrl;
  if (updates.brandColor) mappedUpdates.brand_color = updates.brandColor;
  if (updates.textColor) mappedUpdates.text_color = updates.textColor;
  if (updates.logo_url) mappedUpdates.logo_url = updates.logo_url;
  if (updates.brand_color) mappedUpdates.brand_color = updates.brand_color;
  if (updates.text_color) mappedUpdates.text_color = updates.text_color;
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
