const { storeImage, deleteImages } = require('./forumMedia');

const IMAGE_CONFIG = {
  avatar: {
    field: 'profileImage',
    folder: 'user-photo',
  },
};

function profileImageValues(user, kind) {
  const config = IMAGE_CONFIG[kind];
  if (!config) throw new Error(`Unknown profile image type: ${kind}`);

  const image = user[config.field] || {};
  return {
    url: image.url || '',
    fileId: image.fileId || '',
  };
}

async function saveProfileImage(user, kind, buffer) {
  const config = IMAGE_CONFIG[kind];
  if (!config) throw new Error(`Unknown profile image type: ${kind}`);

  const previous = profileImageValues(user, kind);
  const stored = await storeImage(buffer, user._id, config.folder, { userScoped: false });
  user[config.field] = stored;

  try {
    await user.save();
  } catch (error) {
    await deleteImages([{ fileId: stored.fileId }]);
    throw error;
  }

  if (previous.fileId && previous.fileId !== stored.fileId) {
    await deleteImages([{ fileId: previous.fileId }]);
  }

  return stored;
}

async function removeProfileImage(user, kind) {
  const config = IMAGE_CONFIG[kind];
  if (!config) throw new Error(`Unknown profile image type: ${kind}`);

  const previous = profileImageValues(user, kind);
  user[config.field] = { url: '', fileId: '' };
  await user.save();

  if (previous.fileId) await deleteImages([{ fileId: previous.fileId }]);
}

module.exports = {
  saveProfileImage,
  removeProfileImage,
};
