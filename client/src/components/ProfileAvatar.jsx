import { useState } from 'react';

function initialsOf(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';
}

function photoUrlOf(source) {
  if (!source) return '';
  if (typeof source === 'string') return source;
  if (source.url) return source.url;
  if (source.profileImage) return photoUrlOf(source.profileImage);
  if (source.image) return photoUrlOf(source.image);
  if (source.avatarUrl) return source.avatarUrl;
  if (source.avatar) return source.avatar;
  return '';
}

export default function ProfileAvatar({
  user,
  src,
  name,
  fallback,
  className = '',
  imgClassName = className,
  fallbackClassName = className,
  imgStyle,
  fallbackStyle,
  style,
  alt = '',
  loading,
  ...rest
}) {
  const [failedSrc, setFailedSrc] = useState('');
  const photo = photoUrlOf(src || user);
  const personName = name || user?.name || '';
  const showPhoto = Boolean(photo) && failedSrc !== photo;

  if (showPhoto) {
    return (
      <img
        {...rest}
        src={photo}
        alt={alt}
        className={imgClassName}
        style={imgStyle || style}
        loading={loading}
        onError={() => setFailedSrc(photo)}
      />
    );
  }

  return (
    <span {...rest} className={fallbackClassName} style={fallbackStyle || style}>
      {fallback ?? initialsOf(personName)}
    </span>
  );
}
