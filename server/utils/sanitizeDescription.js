
const sanitizeHtml = require('sanitize-html');

const sanitizeDescription = (html = '') => {
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'h1',
      'h2',
      'h3',
      'h4',
      'ul',
      'ol',
      'li',
      'a',
      'blockquote',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'span',
      'div',
    ],

    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      '*': ['style'],
    },

    allowedStyles: {
      '*': {
        color: [
          /^#[0-9a-fA-F]{3,8}$/,
          /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/,
          /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0|1|0?\.\d+)\s*\)$/,
        ],

        'background-color': [
          /^#[0-9a-fA-F]{3,8}$/,
          /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/,
          /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0|1|0?\.\d+)\s*\)$/,
        ],

        'text-align': [
          /^left$/,
          /^center$/,
          /^right$/,
          /^justify$/,
        ],
      },
    },

    allowedSchemes: ['http', 'https', 'mailto'],
  });
};

module.exports = sanitizeDescription;
