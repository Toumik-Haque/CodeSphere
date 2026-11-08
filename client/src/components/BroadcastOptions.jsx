import '../css/Updates.css';

export default function BroadcastOptions({ value, onChange }) {
  const set = (key) => (event) => onChange({ ...value, [key]: event.target.checked });

  return (
    <fieldset className="broadcast-options">
      <legend>Notify users when published</legend>
      <label>
        <input type="checkbox" checked={value.sendNotification} onChange={set('sendNotification')} />
        <i className="bi bi-bell" aria-hidden="true" />
        Send to users&apos; notifications
      </label>
      <label>
        <input type="checkbox" checked={value.sendEmail} onChange={set('sendEmail')} />
        <i className="bi bi-envelope" aria-hidden="true" />
        Send to users&apos; email
      </label>
    </fieldset>
  );
}
