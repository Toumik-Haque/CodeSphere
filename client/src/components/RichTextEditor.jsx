import { Editor } from '@tinymce/tinymce-react';

// The same TinyMCE editor used for events, shared by the forum.
const COLORS = [
  '#F07868', 'CodeSphere Coral',
  '#142D45', 'Navy',
  '#183047', 'Dark Text',
  '#647589', 'Muted',
  '#16A34A', 'Green',
  '#2563EB', 'Blue',
  '#D97706', 'Amber',
  '#9333EA', 'Purple',
];

export default function RichTextEditor({
  value,
  onChange,
  height = 360,
  placeholder = '',
  contentStyle = '',
}) {
  return (
    <Editor
      apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
      value={value}
      onEditorChange={(content) => onChange(content)}
      init={{
        height,
        menubar: false,
        branding: false,
        promotion: false,
        statusbar: true,
        resize: true,
        placeholder,
        plugins: ['lists', 'link', 'table', 'wordcount', 'code', 'codesample', 'autolink'],
        toolbar:
          'undo redo | bold italic underline strikethrough | forecolor backcolor | '
          + 'alignleft aligncenter alignright | bullist numlist | link blockquote codesample table | removeformat | blocks',
        block_formats: 'Paragraph=p; Heading=h2; Subheading=h3; Small heading=h4; Code=pre',
        color_map: COLORS,
        custom_colors: true,
        link_default_target: '_blank',
        codesample_languages: [
          { text: 'Plain text', value: 'markup' },
          { text: 'Python', value: 'python' },
          { text: 'JavaScript', value: 'javascript' },
          { text: 'Java', value: 'java' },
          { text: 'C', value: 'c' },
          { text: 'C++', value: 'cpp' },
          { text: 'HTML/CSS', value: 'css' },
          { text: 'SQL', value: 'sql' },
        ],
        content_style: `
          body { font-family: Arial, sans-serif; font-size: 15px; color: #183047; line-height: 1.7; padding: 8px; }
          pre { background: #0E1B2B; color: #E2E8F0; padding: 12px; border-radius: 8px; }
          blockquote { border-left: 4px solid #F07868; margin-left: 0; padding-left: 12px; color: #475569; }
        ` + contentStyle,
      }}
    />
  );
}
